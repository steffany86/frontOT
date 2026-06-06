package com.example.TigoStarSystem.tecnicoiniciojornada.service;

import com.example.TigoStarSystem.auth.dto.AuthLoginResponse;
import com.example.TigoStarSystem.auth.dto.AuthMeResponse;
import com.example.TigoStarSystem.auth.dto.SucursalResponse;
import com.example.TigoStarSystem.auth.service.AuthService;
import com.example.TigoStarSystem.common.ApiException;
import com.example.TigoStarSystem.config.DbConnectionManager;
import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;
import com.example.TigoStarSystem.tecnicoiniciojornada.dto.TecnicoInicioJornadaCreateRequest;
import com.example.TigoStarSystem.tecnicoiniciojornada.dto.TecnicoCierreJornadaRequest;
import com.example.TigoStarSystem.tecnicoiniciojornada.repository.TecnicoInicioJornadaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TecnicoInicioJornadaService {
    private final TecnicoInicioJornadaRepository repository;
    private final JdbcTemplate tigohogarJdbcTemplate;
    private final AuthService authService;
    private final DbConnectionManager dbConnectionManager;

    public TecnicoInicioJornadaService(
            TecnicoInicioJornadaRepository repository,
            @Qualifier("tigohogarJdbcTemplate") JdbcTemplate tigohogarJdbcTemplate,
            AuthService authService,
            DbConnectionManager dbConnectionManager
    ) {
        this.repository = repository;
        this.tigohogarJdbcTemplate = tigohogarJdbcTemplate;
        this.authService = authService;
        this.dbConnectionManager = dbConnectionManager;
    }

    public Map<String, Object> estado(String token, String sucursal) {
        AuthLoginResponse tecnico = requireUsuarioInicioJornada(token);
        repository.marcarNoCierreAtrasado(tigohogarJdbcTemplate, tecnico.getIdUsuario());
        boolean existe = repository.existeRegistroHoy(tigohogarJdbcTemplate, tecnico.getIdUsuario());
        String sucursalResuelta = resolveSucursalNombre(sucursal, tecnico);
        JdbcTemplate tecnicosTemplate = dbConnectionManager.connDb(resolveTecnicosDb(sucursalResuelta));
        Map<String, Object> encargadoActual = repository.buscarEncargadoActualPorTecnico(
                dbConnectionManager.connDb("central"),
                tecnicosTemplate,
                sucursalResuelta,
                tecnico.getIdUsuario(),
                tecnico.getNombre()
        );
        Map<String, Object> out = new HashMap<>();
        out.put("idTecnico", tecnico.getIdUsuario());
        out.put("pendiente", !existe);
        out.put("fechaServidor", java.time.OffsetDateTime.now().toString());
        if (encargadoActual != null) {
            String encargado = valueAsString(encargadoActual.get("encargado"));
            String idEncargado = valueAsString(encargadoActual.get("idEncargado"));
            if (!isBlank(encargado)) {
                out.put("encargado", encargado);
            }
            if (!isBlank(idEncargado)) {
                out.put("idEncargado", idEncargado);
            }
        }
        return out;
    }

    public Map<String, Object> estadoCierre(String token) {
        AuthLoginResponse tecnico = requireUsuarioInicioJornada(token);
        repository.marcarNoCierreAtrasado(tigohogarJdbcTemplate, tecnico.getIdUsuario());
        Map<String, Object> row = repository.estadoCierreHoy(tigohogarJdbcTemplate, tecnico.getIdUsuario());
        int noMarcoCount = repository.countNoMarco(tigohogarJdbcTemplate, tecnico.getIdUsuario());

        Map<String, Object> out = new HashMap<>();
        out.put("idTecnico", tecnico.getIdUsuario());
        out.put("tieneInicioHoy", row != null);
        out.put("cerradoHoy", row != null && row.get("fecha_cierre") != null);
        out.put("requiereCierre", row != null && row.get("fecha_cierre") == null);
        out.put("noMarcoCount", noMarcoCount);
        return out;
    }

    public List<Map<String, Object>> listarEncargados(String token, String sucursal) {
        AuthLoginResponse tecnico = requireUsuarioInicioJornada(token);
        String sucursalResuelta = resolveSucursalNombre(sucursal, tecnico);
        JdbcTemplate tecnicosTemplate = dbConnectionManager.connDb(resolveTecnicosDb(sucursalResuelta));
        List<Map<String, Object>> encargados = repository.listarEncargados(tecnicosTemplate);
        Map<String, Object> encargadoActual = repository.buscarEncargadoActualPorTecnico(
                dbConnectionManager.connDb("central"),
                tecnicosTemplate,
                sucursalResuelta,
                tecnico.getIdUsuario(),
                tecnico.getNombre()
        );
        return ensureEncargadoActualEnLista(encargados, encargadoActual);
    }

    public Map<String, Object> registrar(String token, TecnicoInicioJornadaCreateRequest request) {
        AuthLoginResponse tecnico = requireUsuarioInicioJornada(token);

        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Solicitud requerida.");
        }
        if (isBlank(request.getCapacitado()) || isBlank(request.getCharla()) || isBlank(request.getBotiquin())
                || isBlank(request.getExtintor()) || request.getFechaVencimiento() == null
                || isBlank(request.getEquipoEpp()) || isBlank(request.getEstadoEpp())
                || isBlank(request.getApr()) || isBlank(request.getEscalera())
                || isBlank(request.getAnclaje()) || isBlank(request.getImagen())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Todos los campos del checklist y la foto son obligatorios.");
        }
        if (repository.existeRegistroHoy(tigohogarJdbcTemplate, tecnico.getIdUsuario())) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_REGISTERED", "Ya registraste inicio de jornada hoy.");
        }
        String sucursalResuelta = resolveSucursalNombre(request.getSucursal(), tecnico);
        JdbcTemplate tecnicosTemplate = dbConnectionManager.connDb(resolveTecnicosDb(sucursalResuelta));
        Map<String, Object> encargadoActual = repository.buscarEncargadoActualPorTecnico(
                dbConnectionManager.connDb("central"),
                tecnicosTemplate,
                sucursalResuelta,
                tecnico.getIdUsuario(),
                tecnico.getNombre()
        );
        if (encargadoActual == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "ENCARGADO_NO_ENCONTRADO",
                    "No se encontro supervisor para este tecnico en conformacion diaria."
            );
        }
        Integer idEncargado = toPositiveInteger(encargadoActual.get("idEncargado"));
        if (idEncargado == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "ENCARGADO_INVALIDO",
                    "No se pudo resolver id de supervisor para este tecnico."
            );
        }
        String sucursalConformacion = valueAsString(encargadoActual.get("sucursal"));
        String sucursalFinal = isBlank(sucursalConformacion) ? sucursalResuelta : SucursalCanonicalizer.canonicalize(sucursalConformacion);
        Integer idSucursal = resolveSucursalId(sucursalFinal);
        String nombreTecnicoSucursal = repository.obtenerNombreTecnicoPorId(tecnicosTemplate, tecnico.getIdUsuario());
        if (isBlank(nombreTecnicoSucursal)) {
            nombreTecnicoSucursal = tecnico.getNombre();
        }

        List<Map<String, Object>> rows = repository.registrar(
                tigohogarJdbcTemplate,
                tecnico.getIdUsuario(),
                request.getIdAuxiliar(),
                idEncargado,
                idEncargado,
                idSucursal,
                sucursalFinal,
                nombreTecnicoSucursal,
                normalizeSiNo(request.getCapacitado()),
                normalizeSiNo(request.getCharla()),
                normalizeSiNo(request.getBotiquin()),
                normalizeSiNo(request.getExtintor()),
                request.getFechaVencimiento(),
                normalizeSiNo(request.getEquipoEpp()),
                normalizeSiNo(request.getEstadoEpp()),
                normalizeSiNo(request.getApr()),
                normalizeSiNo(request.getEscalera()),
                normalizeSiNo(request.getAnclaje()),
                request.getImagen()
        );
        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "NO_DATA", "No se pudo registrar inicio de jornada.");
        }
        Map<String, Object> result = rows.get(0);
        Integer idInicio = toPositiveInteger(
                result.get("idInicio") != null ? result.get("idInicio") : result.get("id_inicio")
        );
        if (idInicio != null && !isBlank(request.getUbicacionGeoRef())) {
            repository.actualizarUbicacionInicio(tigohogarJdbcTemplate, idInicio, request.getUbicacionGeoRef().trim());
        }
        return result;
    }

    public Map<String, Object> cerrarJornada(String token, TecnicoCierreJornadaRequest request) {
        AuthLoginResponse tecnico = requireUsuarioInicioJornada(token);
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Solicitud requerida.");
        }
        if (isBlank(request.getCodigoCliente()) || isBlank(request.getDanoMaterial())
                || isBlank(request.getDanoPersona()) || isBlank(request.getNovedadesTrabajo())
                || isBlank(request.getUbicacionGeoRef())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Campos obligatorios de cierre incompletos.");
        }
        if (repository.existePendienteAprobacionHoy(tigohogarJdbcTemplate, tecnico.getIdUsuario())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "INICIO_JORNADA_PENDIENTE_APROBACION",
                    "No puedes cerrar jornada hasta que tu supervisor apruebe el inicio de jornada."
            );
        }

        String danoMaterial = normalizeSiNo(request.getDanoMaterial());
        String danoPersona = normalizeSiNo(request.getDanoPersona());
        String novedadesTrabajo = normalizeSiNo(request.getNovedadesTrabajo());
        boolean danoMaterialBit = "SI".equals(danoMaterial);
        boolean danoPersonaBit = "SI".equals(danoPersona);
        boolean novedadesTrabajoBit = "SI".equals(novedadesTrabajo);

        if ("SI".equals(danoMaterial) && isBlank(request.getObservacionMaterial())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Observacion material es requerida.");
        }
        if ("SI".equals(danoPersona) && isBlank(request.getObservacionPersona())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Observacion persona es requerida.");
        }
        if ("SI".equals(novedadesTrabajo) && isBlank(request.getObservacionNovedades())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Observacion novedades es requerida.");
        }

        List<Map<String, Object>> rows = repository.cerrarJornada(
                tigohogarJdbcTemplate,
                tecnico.getIdUsuario(),
                request.getCodigoCliente().trim(),
                danoMaterialBit,
                trimOrNull(request.getObservacionMaterial()),
                danoPersonaBit,
                trimOrNull(request.getObservacionPersona()),
                novedadesTrabajoBit,
                trimOrNull(request.getObservacionNovedades()),
                request.getUbicacionGeoRef().trim()
        );

        if (rows == null || rows.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "NO_OPEN_JORNADA", "No existe jornada abierta hoy para cerrar.");
        }
        return rows.get(0);
    }

    private AuthLoginResponse requireUsuarioInicioJornada(String token) {
        AuthMeResponse me = authService.me(token);
        AuthLoginResponse usuario = me.getUsuario();
        String rol = normalize(usuario == null ? null : usuario.getRol());
        boolean permitido = "tecnico".equals(rol);
        if (!permitido) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN_INICIO_JORNADA_ONLY",
                    "Esta funcionalidad es solo para rol Tecnico."
            );
        }
        return usuario;
    }

    private String normalizeSiNo(String value) {
        String normalized = normalize(value);
        if ("si".equals(normalized) || "sí".equals(normalized) || "true".equals(normalized) || "1".equals(normalized)) {
            return "SI";
        }
        return "NO";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private Integer toPositiveInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            int n = ((Number) value).intValue();
            return n > 0 ? n : null;
        }
        try {
            int n = Integer.parseInt(String.valueOf(value).trim());
            return n > 0 ? n : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String resolveTecnicosDb(String sucursal) {
        String normalized = normalize(sucursal);
        if (normalized.contains("sucre")) {
            return "sucre";
        }
        return "operativa";
    }

    private String resolveSucursalNombre(String sucursal, AuthLoginResponse usuarioSesion) {
        if (!isBlank(sucursal)) {
            return SucursalCanonicalizer.canonicalize(sucursal);
        }
        Integer idSucursal = usuarioSesion == null ? null : usuarioSesion.getIdSucursal();
        if (idSucursal == null) {
            return null;
        }
        List<SucursalResponse> sucursales = authService.listarSucursales();
        for (SucursalResponse item : sucursales) {
            if (item != null && idSucursal.equals(item.getIdSucursal())) {
                return SucursalCanonicalizer.canonicalize(item.getSucursal());
            }
        }
        return null;
    }

    private Integer resolveSucursalId(String sucursalCanonica) {
        if (isBlank(sucursalCanonica)) {
            return null;
        }
        try {
            List<SucursalResponse> sucursales = authService.listarSucursales();
            for (SucursalResponse item : sucursales) {
                if (item == null) continue;
                String canon = SucursalCanonicalizer.canonicalize(item.getSucursal());
                if (sucursalCanonica.equalsIgnoreCase(canon)) {
                    return item.getIdSucursal();
                }
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private String valueAsString(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private List<Map<String, Object>> ensureEncargadoActualEnLista(
            List<Map<String, Object>> encargados,
            Map<String, Object> encargadoActual
    ) {
        if (encargados == null) {
            encargados = new java.util.ArrayList<>();
        }
        if (encargadoActual == null) {
            return encargados;
        }
        String idActual = valueAsString(encargadoActual.get("idEncargado"));
        String nombreActual = valueAsString(encargadoActual.get("encargado"));
        if (isBlank(idActual)) {
            return encargados;
        }
        boolean exists = false;
        for (Map<String, Object> row : encargados) {
            String idRow = valueAsString(row == null ? null : row.get("idEncargado"));
            if (idActual.equals(idRow)) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idEncargado", idActual);
            item.put("encargado", isBlank(nombreActual) ? ("Supervisor " + idActual) : nombreActual);
            encargados.add(0, item);
        }
        return encargados;
    }
}
