package com.example.TigoStarSystem.auth.service;

import com.example.TigoStarSystem.auth.dto.AuthLoginRequest;
import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;
import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.dto.ChangePasswordRequest;
import com.example.TigoStarSystem.auth.dto.SucursalResponse;
import com.example.TigoStarSystem.auth.repository.AuthRepository;
import com.example.TigoStarSystem.auth.repository.AuthSessionRepository;
import com.example.TigoStarSystem.auth.repository.SucursalRepository;
import com.example.TigoStarSystem.config.DbConnectionManager;
import com.example.TigoStarSystem.common.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.sql.SQLException;

@Service
public class AuthService {
    private static final int ROL_ID_SISTEMAS = 4;
    private static final Duration SESSION_TTL = Duration.ofHours(8);
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private final AuthRepository authRepository;
    private final AuthSessionRepository authSessionRepository;
    private final SucursalRepository sucursalRepository;
    private final DbConnectionManager dbConnectionManager;
    private final JwtService jwtService;
    private final Map<String, AuthSession> sessions = new ConcurrentHashMap<>();
    private final String dbUsername;
    private final String dbPassword;
    private final boolean validarSucursal;
    private final boolean jwtEnabled;

    /**
     * Inicializa el servicio de autenticacion y resuelve configuracion de conexiones.
     */
    public AuthService(
            AuthRepository authRepository,
            AuthSessionRepository authSessionRepository,
            SucursalRepository sucursalRepository,
            DbConnectionManager dbConnectionManager,
            JwtService jwtService,
            @Value("${spring.datasource.username}") String dbUsername,
            @Value("${spring.datasource.password}") String dbPassword,
            @Value("${auth.login.validar-sucursal:true}") boolean validarSucursal,
            @Value("${auth.jwt.enabled:true}") boolean jwtEnabled) {
        this.authRepository = authRepository;
        this.authSessionRepository = authSessionRepository;
        this.sucursalRepository = sucursalRepository;
        this.dbConnectionManager = dbConnectionManager;
        this.jwtService = jwtService;
        this.dbUsername = dbUsername;
        this.dbPassword = dbPassword;
        this.validarSucursal = validarSucursal;
        this.jwtEnabled = jwtEnabled;
    }

    /**
     * Ejecuta login: valida credenciales por SP, crea token y registra sesion en memoria.
     */
    public AuthSession login(AuthLoginRequest request) {
        logger.info(
                "Login attempt usuario={}, idSucursal={}, validarSucursal={}",
                safe(request == null ? null : request.getUsuario()),
                request == null ? null : request.getIdSucursal(),
                validarSucursal
        );
        SucursalInfo sucursal = obtenerSucursalPorId(request.getIdSucursal());
        logger.debug(
                "Sucursal resolved idSucursal={}, host={}, baseDeDatos={}",
                sucursal.idSucursal,
                sucursal.host,
                sucursal.baseDeDatos
        );
        List<SucursalInfo> destinosLogin = resolverDestinosLogin(sucursal);
        String passwordHash = hashMd5Base64(request.getPassword());
        List<Map<String, Object>> rows = null;
        Exception lastError = null;
        for (int i = 0; i < destinosLogin.size(); i++) {
            SucursalInfo sucursalLogin = destinosLogin.get(i);
            logger.debug(
                    "Login target attempt={} idSucursal={}, sucursal={}, host={}, baseDeDatos={}",
                    i + 1,
                    sucursalLogin.idSucursal,
                    sucursalLogin.sucursal,
                    sucursalLogin.host,
                    sucursalLogin.baseDeDatos
            );
            JdbcTemplate jdbcTemplate = crearJdbcTemplateSucursal(sucursalLogin, dbUsername, dbPassword);
            try {
                rows = ejecutarValidacionConSpAlternativo(jdbcTemplate, request, passwordHash, validarSucursal);
                if (rows != null && !rows.isEmpty()) {
                    break;
                }
            } catch (DataAccessException ex) {
                lastError = ex;
                logger.warn(
                        "Login SP failed on attempt {} usuario={}, idSucursal={}, host={}, baseDeDatos={}",
                        i + 1,
                        safe(request.getUsuario()),
                        request.getIdSucursal(),
                        sucursalLogin.host,
                        sucursalLogin.baseDeDatos,
                        ex
                );
            } catch (Exception ex) {
                lastError = ex;
                logger.warn(
                        "Login failed on attempt {} usuario={}, idSucursal={}, host={}, baseDeDatos={}",
                        i + 1,
                        safe(request.getUsuario()),
                        request.getIdSucursal(),
                        sucursalLogin.host,
                        sucursalLogin.baseDeDatos,
                        ex
                );
            }
        }
        if ((rows == null || rows.isEmpty()) && lastError != null) {
            if (lastError instanceof DataAccessException) {
                throw traducirErrorLogin((DataAccessException) lastError, request, sucursal);
            }
            Map<String, Object> details = new HashMap<>();
            details.put("usuario", safe(request == null ? null : request.getUsuario()));
            details.put("idSucursal", request == null ? null : request.getIdSucursal());
            details.put("sucursal", sucursal == null ? null : sucursal.sucursal);
            details.put("host", sucursal == null ? null : sucursal.host);
            details.put("baseDeDatos", sucursal == null ? null : sucursal.baseDeDatos);
            details.put("rootCause", lastError.getMessage());
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "LOGIN_EXECUTION_ERROR",
                    "No se pudo ejecutar la validacion de login para la sucursal seleccionada.",
                    details
            );
        }
        logger.debug("Login SP returned {} rows", rows == null ? 0 : rows.size());
        if (rows == null || rows.isEmpty()) {
            logger.warn(
                    "Login invalid credentials usuario={}, idSucursal={}, validarSucursal={}",
                    safe(request.getUsuario()),
                    request.getIdSucursal(),
                    validarSucursal
            );
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Usuario o password invÃ¡lidos.");
        }
        AuthLoginResponse userFromDb = mapToResponse(rows.get(0), sucursal.idSucursal);
        Integer idSucursalSeleccionada = request.getIdSucursal();
        if (userFromDb.getIdSucursal() != null
                && idSucursalSeleccionada != null
                && !idSucursalSeleccionada.equals(userFromDb.getIdSucursal())) {
            logger.warn(
                    "Login sucursal mismatch usuario={}, idSucursalSeleccionada={}, idSucursalDevueltaSP={}. Se prioriza la sucursal seleccionada.",
                    safe(request.getUsuario()),
                    idSucursalSeleccionada,
                    userFromDb.getIdSucursal()
            );
        }
        AuthLoginResponse user = new AuthLoginResponse(
                userFromDb.getIdUsuario(),
                userFromDb.getNombre(),
                userFromDb.getLoggin(),
                userFromDb.getRol(),
                userFromDb.getIdRol(),
                idSucursalSeleccionada,
                userFromDb.getNecesitaCambio(),
                userFromDb.getUltimaModificacion()
        );
        OffsetDateTime expira = OffsetDateTime.now().plus(SESSION_TTL);
        String token = jwtEnabled
                ? jwtService.generateAccessToken(user, expira)
                : UUID.randomUUID().toString();
        AuthSession session = new AuthSession(token, user, expira);
        sessions.put(token, session);
        if (!jwtEnabled) {
            authSessionRepository.save(session);
            authSessionRepository.deleteExpired();
        }
        return session;
    }

    /**
     * Devuelve el catalogo de sucursales disponibles para autenticacion.
     */
    public List<SucursalResponse> listarSucursales() {
        List<Map<String, Object>> rows = sucursalRepository.obtenerSucursales();
        List<SucursalResponse> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            SucursalInfo info = mapToSucursal(row);
            result.add(new SucursalResponse(info.idSucursal, info.sucursal, info.host, info.baseDeDatos));
        }
        return result;
    }

    /**
     * Valida token de sesion y retorna datos de usuario autenticado.
     */
    public AuthMeResponse me(String token) {
        if (token == null || isBlank(token)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED", "Sesion requerida.");
        }
        if (jwtEnabled) {
            JwtService.ParsedToken parsed = jwtService.parseAccessToken(token);
            AuthLoginResponse usuario = parsed == null ? null : parsed.getUser();
            OffsetDateTime expira = parsed == null ? null : parsed.getExpira();
            if (usuario == null || usuario.getIdUsuario() == null) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Sesion invalida.");
            }
            if (expira == null) {
                expira = OffsetDateTime.now().plus(SESSION_TTL);
            }
            sessions.put(token, new AuthSession(token, usuario, expira));
            return new AuthMeResponse(usuario, expira, resolveHostName());
        }
        AuthSession session = sessions.get(token);
        if (session == null) {
            session = authSessionRepository.findByToken(token);
            if (session != null) {
                sessions.put(token, session);
            }
        }
        if (session == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Sesion invalida.");
        }
        if (session.getExpira().isBefore(OffsetDateTime.now())) {
            sessions.remove(token);
            authSessionRepository.deleteByToken(token);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "Sesion expirada.");
        }
        return new AuthMeResponse(session.getUsuario(), session.getExpira(), resolveHostName());
    }

    private String resolveHostName() {
        try {
            String hostName = InetAddress.getLocalHost().getHostName();
            return hostName == null ? null : hostName.trim();
        } catch (UnknownHostException ex) {
            logger.warn("No se pudo resolver el nombre del host para la sesion.", ex);
            return null;
        }
    }

    /**
     * Exige sesion valida y que el usuario tenga rol administrador.
     */
    public AuthMeResponse requireAdmin(String token) {
        AuthMeResponse me = me(token);
        if (!esAdministrador(me.getUsuario())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN_ADMIN_ONLY",
                    "Solo administradores pueden acceder a este recurso."
            );
        }
        return me;
    }

    public void cambiarPassword(String token, ChangePasswordRequest request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request requerida.");
        }
        AuthMeResponse me = me(token);
        AuthLoginResponse usuario = me.getUsuario();
        if (usuario == null || usuario.getIdUsuario() == null || usuario.getIdSucursal() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "Sesion invalida.");
        }
        if (isBlank(request.getActual()) || isBlank(request.getNueva())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Password actual y nueva son requeridas.");
        }
        String actualHash = hashMd5Base64(request.getActual().trim());
        String nuevaHash = hashMd5Base64(request.getNueva().trim());
        SucursalInfo sucursal = obtenerSucursalPorId(usuario.getIdSucursal());
        JdbcTemplate jdbcTemplate = crearJdbcTemplateSucursal(sucursal, dbUsername, dbPassword);
        List<Map<String, Object>> rows = authRepository.cambiarPasswordUsuarioPorId(
                jdbcTemplate,
                usuario.getIdUsuario(),
                actualHash,
                nuevaHash
        );
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_CHANGE_FAILED", "No se pudo cambiar password.");
        }
    }

    /**
     * Determina si un usuario pertenece al rol de Sistemas (administrador).
     */
    public boolean esAdministrador(AuthLoginResponse usuario) {
        if (usuario == null) {
            return false;
        }
        Integer idRol = usuario.getIdRol();
        return idRol != null && idRol == ROL_ID_SISTEMAS;
    }

    /**
     * Mapea una fila devuelta por el SP de login a un DTO de respuesta.
     */
    private AuthLoginResponse mapToResponse(Map<String, Object> row, Integer idSucursalFallback) {
        Integer idUsuario = toInteger(findValue(row, "idusuario", "id_usuario", "iduser", "usuarioid"));
        Integer idRol = toInteger(findValue(row, "idrol", "id_rol", "rolid"));
        Integer idSucursal = toInteger(findValue(row, "idsucursal", "id_sucursal", "sucursalid"));
        if (idSucursal == null) {
            idSucursal = idSucursalFallback;
        }
        String nombre = toString(findValue(row, "nombre", "nombres", "nombreusuario", "usuario"));
        String loggin = toString(findValue(row, "loggin", "login", "usuario"));
        String rol = toString(findValue(row, "rol", "nombrerol", "descripcionrol"));
        Boolean necesitaCambio = toBoolean(findValue(row, "necesitacambio"));
        java.time.LocalDateTime ultimaModificacion = toLocalDateTime(findValue(row, "ultimamodificacion"));

        if (idUsuario == null || nombre == null) {
            Map<String, Object> details = new HashMap<>();
            details.put("rowKeys", row.keySet());
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "INVALID_SP_RESULT",
                    "El SP spx_ValidarUsuario no devuelve las columnas esperadas.",
                    details
            );
        }
        return new AuthLoginResponse(idUsuario, nombre, loggin, rol, idRol, idSucursal, necesitaCambio, ultimaModificacion);
    }

    /**
     * Busca y valida la sucursal seleccionada por id.
     */
    private SucursalInfo obtenerSucursalPorId(Integer idSucursal) {
        if (idSucursal == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "idSucursal es requerido.");
        }
        List<Map<String, Object>> rows = sucursalRepository.obtenerSucursales();
        for (Map<String, Object> row : rows) {
            SucursalInfo info = mapToSucursal(row);
            if (idSucursal.equals(info.idSucursal)) {
                return info;
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "SUCURSAL_NOT_FOUND", "Sucursal no encontrada.");
    }

    /**
     * Convierte una fila de sucursal en una estructura interna normalizada.
     */
    private SucursalInfo mapToSucursal(Map<String, Object> row) {
        Integer idSucursal = toInteger(findValue(row, "idsucursal", "id_sucursal"));
        String sucursal = canonicalizarSucursal(toString(findValue(row, "sucursal")));
        String ip = trimToNull(toString(findValue(row, "ip")));
        String ip2 = trimToNull(toString(findValue(row, "ip2")));
        String baseDeDatos = toString(findValue(row, "basededatos", "base_de_datos"));
        String host = firstNonBlank(ip, ip2);
        String hostAlterno = null;
        if (!isBlank(ip) && !isBlank(ip2) && !ip.equalsIgnoreCase(ip2)) {
            hostAlterno = ip2;
        }
        if (idSucursal == null) {
            Map<String, Object> details = new HashMap<>();
            details.put("rowKeys", row.keySet());
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "INVALID_SUCURSAL_ROW",
                    "tbl_sucursal no contiene el campo requerido Id_Sucursal.",
                    details
            );
        }
        return new SucursalInfo(idSucursal, sucursal, trimToNull(host), trimToNull(baseDeDatos), trimToNull(hostAlterno));
    }

    /**
     * Unifica variantes comunes de sucursal para evitar inconsistencias en el front.
     */
    private String canonicalizarSucursal(String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return null;
        }
        String normalized = normalizeText(trimmed).replaceAll("[\\s_\\-]+", "");
        if ("santacruz".equals(normalized)) {
            return "SantaCruz";
        }
        if ("sucre".equals(normalized)) {
            return "Sucre";
        }
        return trimmed;
    }

    /**
     * Resuelve el/los destinos de login para la sucursal seleccionada.
     */
    private List<SucursalInfo> resolverDestinosLogin(SucursalInfo sucursalOriginal) {
        if (sucursalOriginal == null) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "SUCURSAL_DB_NOT_RESOLVED",
                    "No se pudo resolver host/base de datos para la sucursal seleccionada."
            );
        }
        String host = trimToNull(sucursalOriginal.host);
        String database = trimToNull(sucursalOriginal.baseDeDatos);

        if (isBlank(host) || isBlank(database)) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "SUCURSAL_DB_NOT_RESOLVED",
                    "No se pudo resolver host/base de datos para la sucursal seleccionada."
            );
        }
        List<SucursalInfo> destinos = new ArrayList<>();
        destinos.add(new SucursalInfo(
                sucursalOriginal.idSucursal,
                sucursalOriginal.sucursal,
                host.trim(),
                database.trim(),
                null
        ));
        if (!isBlank(sucursalOriginal.hostAlterno) && !host.equalsIgnoreCase(sucursalOriginal.hostAlterno)) {
            destinos.add(new SucursalInfo(
                    sucursalOriginal.idSucursal,
                    sucursalOriginal.sucursal,
                    sucursalOriginal.hostAlterno.trim(),
                    database.trim(),
                    null
            ));
        }
        return destinos;
    }

    /**
     * Crea un JdbcTemplate apuntando a la sucursal de login.
     */
    private JdbcTemplate crearJdbcTemplateSucursal(SucursalInfo sucursal, String username, String password) {
        logger.debug(
                "Creating JDBC connection for sucursal host={} baseDeDatos={}",
                sucursal == null ? null : sucursal.host,
                sucursal == null ? null : sucursal.baseDeDatos
        );
        return dbConnectionManager.connDb(
                sucursal == null ? "sucursal" : firstNonBlank(sucursal.sucursal, "sucursal"),
                sucursal == null ? null : sucursal.host,
                sucursal == null ? null : sucursal.baseDeDatos,
                username,
                password
        );
    }

    /**
     * Ejecuta el SP de validacion segun la bandera validarSucursal.
     */
    private List<Map<String, Object>> ejecutarValidacion(
            JdbcTemplate template,
            AuthLoginRequest request,
            String passwordHash,
            boolean validarSucursal
    ) {
        if (validarSucursal) {
            logger.debug("Calling SP dbo.spx_ValidarUsuarioSucursal");
            return authRepository.validarUsuarioSucursal(
                    template,
                    request.getUsuario(),
                    passwordHash,
                    request.getIdSucursal()
            );
        }
        logger.debug("Calling SP dbo.spx_ValidarUsuario");
        return authRepository.validarUsuario(template, request.getUsuario(), passwordHash);
    }

    /**
     * Reintenta la validacion con el SP alternativo si el primero no existe.
     */
    private List<Map<String, Object>> ejecutarValidacionConSpAlternativo(
            JdbcTemplate template,
            AuthLoginRequest request,
            String passwordHash,
            boolean validarSucursal
    ) {
        try {
            return ejecutarValidacion(template, request, passwordHash, validarSucursal);
        } catch (DataAccessException ex) {
            if (!isMissingStoredProcedure(ex)) {
                throw ex;
            }
            boolean validarSucursalAlternativo = !validarSucursal;
            logger.warn(
                    "SP de login no encontrado (validarSucursal={}). Reintentando con validarSucursal={} en la misma BD.",
                    validarSucursal,
                    validarSucursalAlternativo
            );
            return ejecutarValidacion(template, request, passwordHash, validarSucursalAlternativo);
        }
    }

    private ApiException traducirErrorLogin(DataAccessException ex, AuthLoginRequest request, SucursalInfo sucursal) {
        Map<String, Object> details = new HashMap<>();
        Throwable root = ex.getMostSpecificCause();
        details.put("storedProcedure", validarSucursal ? "spx_ValidarUsuarioSucursal/spx_ValidarUsuario" : "spx_ValidarUsuario/spx_ValidarUsuarioSucursal");
        details.put("rootCause", root == null ? ex.getMessage() : root.getMessage());
        details.put("usuario", safe(request == null ? null : request.getUsuario()));
        details.put("idSucursal", request == null ? null : request.getIdSucursal());
        details.put("sucursal", sucursal == null ? null : sucursal.sucursal);
        details.put("host", sucursal == null ? null : sucursal.host);
        details.put("baseDeDatos", sucursal == null ? null : sucursal.baseDeDatos);

        if (ex instanceof QueryTimeoutException || ex instanceof CannotAcquireLockException) {
            return new ApiException(HttpStatus.GATEWAY_TIMEOUT, "SP_TIMEOUT", "El login excedio el tiempo de espera.", details);
        }
        if (ex instanceof CannotGetJdbcConnectionException) {
            return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "DB_CONNECTION_ERROR", "No se pudo conectar a la base de datos de la sucursal.", details);
        }
        SQLException sqlEx = findSqlException(ex);
        if (sqlEx != null && sqlEx.getErrorCode() == 2812) {
            return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SP_NOT_FOUND", "No se encontro el procedimiento de validacion de login.", details);
        }
        if (ex instanceof BadSqlGrammarException) {
            return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SP_SQL_ERROR", "Error SQL al ejecutar la validacion de login.", details);
        }
        return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "DATABASE_ERROR", "Error en base de datos al validar login.", details);
    }

    private SQLException findSqlException(Throwable ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof SQLException) {
                return (SQLException) current;
            }
            current = current.getCause();
        }
        return null;
    }

    /**
     * Genera hash MD5 en Base64 para comparar password con SP legacy.
     */
    private String hashMd5Base64(String value) {
        if (value == null) {
            return null;
        }
        try {
            MessageDigest md5 = MessageDigest.getInstance("MD5");
            byte[] digest = md5.digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "HASH_ERROR",
                    "No se pudo generar el hash MD5."
            );
        }
    }

    /**
     * Busca valor en un map por multiples nombres de columna equivalentes.
     */
    private Object findValue(Map<String, Object> row, String... candidates) {
        Map<String, Object> normalized = new HashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            String key = normalize(entry.getKey());
            normalized.put(key, entry.getValue());
        }
        for (String candidate : candidates) {
            String key = normalize(candidate);
            if (normalized.containsKey(key)) {
                return normalized.get(key);
            }
        }
        return null;
    }

    /**
     * Normaliza una clave de columna removiendo guiones bajos y usando minusculas.
     */
    private String normalize(String key) {
        return key == null ? "" : key.replace("_", "").toLowerCase(Locale.ROOT);
    }

    /**
     * Normaliza texto removiendo tildes y pasando a minusculas.
     */
    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Convierte un valor generico a Integer de forma segura.
     */
    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /**
     * Convierte un valor generico a String.
     */
    private String toString(Object value) {
        return value == null ? null : value.toString();
    }

    private Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        String text = value.toString().trim().toLowerCase(Locale.ROOT);
        if ("true".equals(text) || "1".equals(text) || "si".equals(text) || "yes".equals(text)) {
            return true;
        }
        if ("false".equals(text) || "0".equals(text) || "no".equals(text)) {
            return false;
        }
        return null;
    }

    private java.time.LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof java.time.LocalDateTime) {
            return (java.time.LocalDateTime) value;
        }
        if (value instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) value).toLocalDateTime();
        }
        return null;
    }

    /**
     * Verifica si un texto es nulo o vacio tras trim.
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * Devuelve el primer texto no vacio, priorizando preferred.
     */
    private String firstNonBlank(String preferred, String fallback) {
        if (!isBlank(preferred)) {
            return preferred.trim();
        }
        return fallback;
    }

    /**
     * Retorna null cuando el texto llega vacio; en otro caso retorna trim.
     */
    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Detecta si la excepcion representa "stored procedure no encontrado".
     */
    private boolean isMissingStoredProcedure(DataAccessException ex) {
        Throwable root = ex;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        if (root instanceof java.sql.SQLException) {
            java.sql.SQLException sqlEx = (java.sql.SQLException) root;
            if (sqlEx.getErrorCode() == 2812) {
                return true;
            }
            String msg = sqlEx.getMessage();
            if (msg != null) {
                String lower = msg.toLowerCase(Locale.ROOT);
                return lower.contains("procedimiento almacenado") && lower.contains("no se encontr");
            }
        }
        return false;
    }

    /**
     * Limpia texto para uso en logs.
     */
    private String safe(String value) {
        if (value == null) {
            return null;
        }
        return value.trim();
    }

    private static final class SucursalInfo {
        private final Integer idSucursal;
        private final String sucursal;
        private final String host;
        private final String baseDeDatos;
        private final String hostAlterno;

        /**
         * Estructura interna para transportar datos de sucursal ya resueltos.
         */
        private SucursalInfo(Integer idSucursal, String sucursal, String host, String baseDeDatos, String hostAlterno) {
            this.idSucursal = idSucursal;
            this.sucursal = sucursal;
            this.host = host;
            this.baseDeDatos = baseDeDatos;
            this.hostAlterno = hostAlterno;
        }
    }
}

