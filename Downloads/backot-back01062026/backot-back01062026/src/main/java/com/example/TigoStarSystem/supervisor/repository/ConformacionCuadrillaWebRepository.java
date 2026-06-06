package com.example.TigoStarSystem.supervisor.repository;

import com.example.TigoStarSystem.auth.repository.SucursalRepository;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaWebRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaWebResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class ConformacionCuadrillaWebRepository {
    private static final String SP_LISTAR =
            "EXEC dbo.spx_ObtenerConformacionCuadrillaWeb ?, ?, ?";
    private static final String SP_OBTENER_POR_ID =
            "EXEC dbo.spx_ObtenerConformacionCuadrillaWebPorId ?";
    private static final String SP_CREAR =
            "EXEC dbo.spx_RegistrarConformacionCuadrillaWeb ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
    private static final String SP_ACTUALIZAR =
            "EXEC dbo.spx_ActualizarConformacionCuadrillaWeb ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
    private static final String SP_ELIMINAR =
            "EXEC dbo.spx_EliminarConformacionCuadrillaWeb ?";
    private static final String SP_TECNICOS =
            "EXEC dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb";
    private static final String SP_TECNICO_DETALLE =
            "EXEC dbo.spx_ObtenerDatosTecnicoConformacionCuadrillaWeb ?";
    private static final String SP_AUXILIARES =
            "EXEC dbo.spx_ObtenerAuxiliaresConformacionCuadrillaWeb";
    private static final String SP_DIGITADORES =
            "EXEC dbo.spx_ObtenerDigitadoresConformacionCuadrillaWeb";
    private static final String SP_SUPERVISORES =
            "EXEC dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb";
    private static final String SP_ACTIVIDADES =
            "EXEC dbo.spx_ObtenerActividadesConformacionCuadrillaWeb";
    private static final String SP_VEHICULOS =
            "EXEC dbo.spx_ObtenerVehiculosConformacionCuadrillaWeb";
    private static final String SP_SUCURSALES =
            "EXEC dbo.spx_ObtenerSucursalesConformacionCuadrillaWeb";

    private final JdbcTemplate centralJdbcTemplate;
    private final JdbcTemplate jdbcTemplate;
    private final ConformacionCuadrillaDbSupport dbSupport;

    public ConformacionCuadrillaWebRepository(
            @Qualifier("centralJdbcTemplate") JdbcTemplate centralJdbcTemplate,
            JdbcTemplate jdbcTemplate,
            SucursalRepository sucursalRepository,
            @Value("${spring.datasource.username}") String dbUsername,
            @Value("${spring.datasource.password}") String dbPassword,
            @Value("${spring.datasource.driver-class-name}") String dbDriver,
            @Value("${spring.datasource.url}") String mainDatasourceUrl,
            @Value("${app.central.datasource.url:}") String centralDatasourceUrl,
            @Value("${app.sucre.datasource.url:}") String sucreDatasourceUrl,
            @Value("${auth.login.sucre.database:SucrePrueba}") String sucreDatabase,
            @Value("${app.sucre.datasource.username:${spring.datasource.username}}") String sucreUsername,
            @Value("${app.sucre.datasource.password:${spring.datasource.password}}") String sucrePassword,
            @Value("${app.datasource.params:encrypt=false;trustServerCertificate=true}") String dbParams) {
        this.centralJdbcTemplate = centralJdbcTemplate;
        this.jdbcTemplate = jdbcTemplate;
        this.dbSupport = new ConformacionCuadrillaDbSupport(
                sucursalRepository,
                dbUsername,
                dbPassword,
                dbDriver,
                mainDatasourceUrl,
                centralDatasourceUrl,
                sucreDatasourceUrl,
                sucreDatabase,
                sucreUsername,
                sucrePassword,
                dbParams
        );
    }

    public List<ConformacionCuadrillaWebResponse> listar(LocalDate fecha, String sucursal, Integer limite) {
        Object fechaParam = fecha == null ? null : Date.valueOf(fecha);
        String sucursalParam = trimToNull(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = dbSupport.resolverSucursalDbInfo(sucursalParam);
        String sucursalFiltro = resolverSucursalNombreParaConsulta(sucursalParam, dbInfo);

        List<Map<String, Object>> rows = queryForListInSucursal(
                dbInfo,
                SP_LISTAR,
                fechaParam,
                sucursalFiltro,
                limite
        );
        return mapRows(rows);
    }

    public ConformacionCuadrillaWebResponse obtenerPorId(Long id, String sucursal) {
        String sucursalParam = trimToNull(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = dbSupport.resolverSucursalDbInfo(sucursalParam);

        Map<String, Object> row = queryForSingleInSucursal(dbInfo, SP_OBTENER_POR_ID, id);
        return row == null ? null : mapRow(row);
    }

    public ConformacionCuadrillaWebResponse obtenerPorIdPersistido(Long id) {
        Map<String, Object> row = queryForSingle(centralJdbcTemplate, SP_OBTENER_POR_ID, id);
        return row == null ? null : mapRow(row);
    }

    public Long crear(ConformacionCuadrillaWebRequest request) {
        RuntimeException lastError = null;
        for (JdbcTemplate template : construirTemplatesEscritura(trimToNull(request == null ? null : request.getSucursal()))) {
            try {
                Long id = ejecutarCrear(template, request);
                if (id != null) {
                    return id;
                }
            } catch (RuntimeException ex) {
                lastError = ex;
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        return null;
    }

    public int actualizar(Long id, ConformacionCuadrillaWebRequest request) {
        RuntimeException lastError = null;
        for (JdbcTemplate template : construirTemplatesEscritura(trimToNull(request == null ? null : request.getSucursal()))) {
            try {
                int affected = template.update(
                        SP_ACTUALIZAR,
                        id,
                        request.getFecha() == null ? null : Date.valueOf(request.getFecha()),
                        request.getEstado(),
                        request.getActividad(),
                        request.getIdTecnico(),
                        request.getCuentaSf(),
                        request.getSalesforce(),
                        request.getHabilidad(),
                        request.getVehiculo(),
                        request.getGrupo(),
                        request.getAlmacen(),
                        request.getGrupoDigitacion(),
                        request.getIdUsuarioDigitador(),
                        request.getDigitador(),
                        request.getTecnico(),
                        request.getIdTecnicoAuxiliar(),
                        request.getAuxiliar(),
                        request.getIdUsuarioSupervisor(),
                        request.getSupervisorACargo(),
                        request.getSucursal(),
                        request.getObservacion(),
                        request.getIdUsuarioRegistra()
                );
                if (affected > 0) {
                    return affected;
                }
            } catch (RuntimeException ex) {
                lastError = ex;
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        return 0;
    }

    public int eliminar(Long id) {
        RuntimeException lastError = null;
        for (JdbcTemplate template : construirTemplatesEliminacion()) {
            try {
                int affected = template.update(SP_ELIMINAR, id);
                if (affected > 0) {
                    return affected;
                }
            } catch (RuntimeException ex) {
                lastError = ex;
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        return 0;
    }

    private Long ejecutarCrear(JdbcTemplate template, ConformacionCuadrillaWebRequest request) {
        List<Map<String, Object>> rows = template.queryForList(
                SP_CREAR,
                request.getFecha() == null ? null : Date.valueOf(request.getFecha()),
                request.getEstado(),
                request.getActividad(),
                request.getIdTecnico(),
                request.getCuentaSf(),
                request.getSalesforce(),
                request.getHabilidad(),
                request.getVehiculo(),
                request.getGrupo(),
                request.getAlmacen(),
                request.getGrupoDigitacion(),
                request.getIdUsuarioDigitador(),
                request.getDigitador(),
                request.getTecnico(),
                request.getIdTecnicoAuxiliar(),
                request.getAuxiliar(),
                request.getIdUsuarioSupervisor(),
                request.getSupervisorACargo(),
                request.getSucursal(),
                request.getObservacion(),
                request.getIdUsuarioRegistra()
        );
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        Map<String, Object> row = rows.get(0);
        Object idValue = findValue(
                row,
                "id",
                "id_conformacion_cuadrilla",
                "idconformacioncuadrilla",
                "idregistro"
        );
        if (idValue == null) {
            idValue = firstValue(row);
        }
        return toLong(idValue);
    }

    public List<Map<String, Object>> listarTecnicos(String sucursal) {
        List<Map<String, Object>> rows = queryForListInSucursal(
                dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)),
                SP_TECNICOS
        );
        return normalizarDatosTecnicos(rows);
    }

    public List<Map<String, Object>> obtenerTecnicoDetalle(Integer idTecnico, String sucursal) {
        List<Map<String, Object>> rows = queryForListInSucursal(
                dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)),
                SP_TECNICO_DETALLE,
                idTecnico
        );
        return normalizarDatosTecnicos(rows);
    }

    public List<Map<String, Object>> listarAuxiliares(String sucursal) {
        List<Map<String, Object>> rows = queryForListInSucursal(
                dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)),
                SP_AUXILIARES
        );
        return normalizarCatalogoAuxiliares(normalizarDatosTecnicos(rows));
    }

    public List<Map<String, Object>> listarDigitadores(String sucursal) {
        List<Map<String, Object>> rows = queryForListInSucursal(
                dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)),
                SP_DIGITADORES
        );
        return normalizarCatalogoDigitadores(rows);
    }

    public List<Map<String, Object>> listarSupervisores(String sucursal) {
        return queryForListInSucursal(dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)), SP_SUPERVISORES);
    }

    public List<Map<String, Object>> listarActividades(String sucursal) {
        return queryForListInSucursal(dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)), SP_ACTIVIDADES);
    }

    public List<Map<String, Object>> listarVehiculos(String sucursal, String filtro) {
        String filtroParam = trimToNull(filtro);
        List<Map<String, Object>> rows = queryForListOnlyInResolvedSucursal(
                dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)),
                SP_VEHICULOS
        );
        return filtrarVehiculos(rows, filtroParam);
    }

    public List<Map<String, Object>> listarSucursales(String sucursal) {
        return queryForListInSucursal(dbSupport.resolverSucursalDbInfo(trimToNull(sucursal)), SP_SUCURSALES);
    }

    private List<Map<String, Object>> queryForListInSucursal(
            ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo,
            String sql,
            Object... args) {
        if (dbInfo == null) {
            return new ArrayList<>();
        }
        try {
            List<Map<String, Object>> rows = queryForList(dbSupport.crearJdbcTemplateSucursal(dbInfo), sql, args);
            return rows == null ? new ArrayList<>() : rows;
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> queryForListOnlyInResolvedSucursal(
            ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo,
            String sql,
            Object... args) {
        if (dbInfo == null) {
            return new ArrayList<>();
        }
        try {
            List<Map<String, Object>> rows = queryForList(dbSupport.crearJdbcTemplateSucursal(dbInfo), sql, args);
            return rows == null ? new ArrayList<>() : rows;
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    private Map<String, Object> queryForSingleInSucursal(
            ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo,
            String sql,
            Object... args) {
        List<Map<String, Object>> rows = queryForListInSucursal(dbInfo, sql, args);
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        return rows.get(0);
    }

    private List<Map<String, Object>> queryForList(JdbcTemplate template, String sql, Object... args) {
        if (args == null || args.length == 0) {
            return template.queryForList(sql);
        }
        return template.queryForList(sql, args);
    }

    private Map<String, Object> queryForSingle(JdbcTemplate template, String sql, Object... args) {
        List<Map<String, Object>> rows = queryForList(template, sql, args);
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        return rows.get(0);
    }

    private List<JdbcTemplate> construirTemplatesEscritura(String sucursal) {
        List<JdbcTemplate> out = new ArrayList<>();
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = dbSupport.resolverSucursalDbInfo(sucursal);
        if (dbInfo != null) {
            try {
                JdbcTemplate templateSucursal = dbSupport.crearJdbcTemplateSucursal(dbInfo);
                if (templateSucursal != null) {
                    out.add(templateSucursal);
                }
            } catch (RuntimeException ignored) {
                // fallback below
            }
        }
        return dedupeTemplates(out);
    }

    private List<JdbcTemplate> construirTemplatesEliminacion() {
        return new ArrayList<>();
    }

    private List<JdbcTemplate> dedupeTemplates(List<JdbcTemplate> templates) {
        List<JdbcTemplate> out = new ArrayList<>();
        if (templates == null || templates.isEmpty()) {
            return out;
        }
        for (JdbcTemplate template : templates) {
            if (template == null || containsTemplate(out, template)) {
                continue;
            }
            out.add(template);
        }
        return out;
    }

    private boolean containsTemplate(List<JdbcTemplate> templates, JdbcTemplate candidate) {
        if (templates == null || candidate == null) {
            return false;
        }
        for (JdbcTemplate template : templates) {
            if (template == candidate) {
                return true;
            }
        }
        return false;
    }

    private List<ConformacionCuadrillaWebResponse> mapRows(List<Map<String, Object>> rows) {
        List<ConformacionCuadrillaWebResponse> result = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return result;
        }
        for (Map<String, Object> row : rows) {
            result.add(mapRow(row));
        }
        return result;
    }

    private ConformacionCuadrillaWebResponse mapRow(Map<String, Object> row) {
        ConformacionCuadrillaWebResponse out = new ConformacionCuadrillaWebResponse();
        out.setId(toLong(findValue(row, "id", "id_ruta", "idruta", "Id_Ruta")));
        out.setFecha(toLocalDate(findValue(row, "fecha")));
        out.setEstado(toString(findValue(row, "estado")));
        out.setActividad(toString(findValue(row, "actividad")));
        out.setIdTecnico(toInteger(findValue(row, "id_tecnico", "idtecnico", "id_vendedor", "Id_Vendedor")));
        out.setCuentaSf(toString(findValue(row, "cuenta_sf", "cuentasf", "CuentaSF")));
        out.setSalesforce(toString(findValue(row, "salesforce", "SalesForce")));
        out.setHabilidad(toString(findValue(row, "habilidad", "Habilidad")));
        out.setVehiculo(toString(findValue(row, "vehiculo", "Vehiculo")));
        out.setGrupo(toString(findValue(row, "grupo", "cuadrilla", "ruta", "Nombre")));
        out.setAlmacen(toString(findValue(row, "almacen", "almacen_tigo", "almacenTigo", "BodegaTigo")));
        out.setGrupoDigitacion(toString(findValue(
                row,
                "grupoDigitacion",
                "grupodigitacion",
                "almacen_tigo",
                "almacenTigo"
        )));
        out.setIdUsuarioDigitador(toInteger(findValue(
                row,
                "idUsuarioDigitador",
                "id_usuario_digitador",
                "idusuariodigitador",
                "Id_UsuarioDigitador"
        )));
        out.setDigitador(toString(findValue(row, "digitador", "usuarioDigitador", "NombreDigitador")));
        out.setTecnico(toString(findValue(row, "tecnico", "nombre", "Nombre")));
        out.setIdTecnicoAuxiliar(toInteger(findValue(
                row,
                "id_tecnicoAuxiliar",
                "idtecnicoauxiliar",
                "id_tecnico_auxiliar",
                "Id_TecnicoAuxiliar"
        )));
        out.setAuxiliar(toString(findValue(row, "auxiliar", "tecnicoauxiliar", "nombreauxiliar")));
        out.setIdUsuarioSupervisor(toInteger(findValue(
                row,
                "idUsuarioSupervisor",
                "id_usuario_supervisor",
                "idusuariosupervisor",
                "Id_UsuarioSupervisor"
        )));
        out.setSupervisorACargo(toString(findValue(
                row,
                "supervisorACargo",
                "supervisor_a_cargo",
                "supervisor",
                "NombreSupervisor"
        )));
        out.setSucursal(toString(findValue(row, "sucursal", "Sucursal")));
        out.setObservacion(toString(findValue(row, "observacion", "Observacion")));
        out.setIdUsuarioRegistra(toInteger(findValue(
                row,
                "idUsuarioRegistra",
                "id_usuario_registra",
                "idusuarioregistra",
                "Id_UsuarioRegistra"
        )));
        out.setFechaRegistro(toLocalDateTime(findValue(row, "fechaRegistro", "fecha_registro")));
        out.setEEliminado(toBoolean(findValue(row, "e_eliminado", "eeliminado", "E_Eliminado")));
        return out;
    }

    private Object findValue(Map<String, Object> row, String... candidates) {
        Map<String, Object> normalized = new HashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            normalized.put(normalize(entry.getKey()), entry.getValue());
        }
        for (String candidate : candidates) {
            String key = normalize(candidate);
            if (normalized.containsKey(key)) {
                return normalized.get(key);
            }
        }
        return null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.replace("_", "").toLowerCase(Locale.ROOT);
    }

    private Object firstValue(Map<String, Object> row) {
        if (row == null || row.isEmpty()) {
            return null;
        }
        return row.values().iterator().next();
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            return Long.parseLong(value.toString().trim());
        } catch (NumberFormatException ex) {
            return null;
        }
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
        if (text.equals("1") || text.equals("true") || text.equals("si") || text.equals("s")) {
            return true;
        }
        if (text.equals("0") || text.equals("false") || text.equals("no") || text.equals("n")) {
            return false;
        }
        return null;
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate) {
            return (LocalDate) value;
        }
        if (value instanceof Date) {
            return ((Date) value).toLocalDate();
        }
        if (value instanceof Timestamp) {
            return ((Timestamp) value).toLocalDateTime().toLocalDate();
        }
        if (value instanceof LocalDateTime) {
            return ((LocalDateTime) value).toLocalDate();
        }
        try {
            return LocalDate.parse(value.toString().trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime) {
            return (LocalDateTime) value;
        }
        if (value instanceof Timestamp) {
            return ((Timestamp) value).toLocalDateTime();
        }
        if (value instanceof Date) {
            return ((Date) value).toLocalDate().atStartOfDay();
        }
        try {
            return LocalDateTime.parse(value.toString().trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private String toString(Object value) {
        return value == null ? null : value.toString();
    }

    private List<Map<String, Object>> normalizarDatosTecnicos(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Map<String, Object> normalizada = new LinkedHashMap<>();
            if (row != null && !row.isEmpty()) {
                normalizada.putAll(row);
            } else {
                out.add(normalizada);
                continue;
            }

            Object cuenta = findValue(row, "cuentaSf", "cuenta_sf", "cuentasf", "CuentaSF");
            if (cuenta != null) {
                normalizada.put("cuentaSf", cuenta);
                normalizada.put("cuenta_sf", cuenta);
            }

            Object salesforce = findValue(row, "salesforce", "SalesForce");
            if (salesforce != null) {
                normalizada.put("salesforce", salesforce);
            }

            out.add(normalizada);
        }
        return out;
    }

    private List<Map<String, Object>> normalizarCatalogoAuxiliares(List<Map<String, Object>> rows) {
        return normalizarCatalogo(
                rows,
                "idTecnicoAuxiliar",
                new String[] {
                        "idTecnicoAuxiliar",
                        "id_tecnicoAuxiliar",
                        "idtecnicoauxiliar",
                        "id_tecnico_auxiliar",
                        "Id_TecnicoAuxiliar",
                        "Id_Vendedor"
                },
                "auxiliar",
                new String[] {
                        "auxiliar",
                        "tecnicoauxiliar",
                        "nombreauxiliar",
                        "Nombre"
                }
        );
    }

    private List<Map<String, Object>> normalizarCatalogoDigitadores(List<Map<String, Object>> rows) {
        return normalizarCatalogo(
                rows,
                "idUsuarioDigitador",
                new String[] {
                        "idUsuarioDigitador",
                        "id_usuario_digitador",
                        "idusuariodigitador",
                        "Id_UsuarioDigitador",
                        "Id_Usuario"
                },
                "digitador",
                new String[] {
                        "digitador",
                        "usuarioDigitador",
                        "NombreDigitador",
                        "Nombre"
                }
        );
    }

    private List<Map<String, Object>> normalizarCatalogo(
            List<Map<String, Object>> rows,
            String idCanonica,
            String[] candidatosId,
            String nombreCanonico,
            String[] candidatosNombre) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Map<String, Object> normalizada = new LinkedHashMap<>();
            if (row != null && !row.isEmpty()) {
                normalizada.putAll(row);
            } else {
                out.add(normalizada);
                continue;
            }
            Object id = findValue(row, candidatosId);
            if (id != null) {
                normalizada.put(idCanonica, id);
            }
            Object nombre = findValue(row, candidatosNombre);
            if (nombre != null) {
                normalizada.put(nombreCanonico, nombre);
            }
            out.add(normalizada);
        }
        return out;
    }

    private List<Map<String, Object>> filtrarVehiculos(List<Map<String, Object>> rows, String filtro) {
        List<Map<String, Object>> source = rows == null ? new ArrayList<>() : rows;
        String filtroNormalizado = trimToNull(filtro);
        if (filtroNormalizado == null) {
            return source;
        }

        String comparable = filtroNormalizado
                .replace("%", "")
                .replace("*", "")
                .trim()
                .toLowerCase(Locale.ROOT);
        if (comparable.isEmpty()) {
            return source;
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : source) {
            Object vehiculo = findValue(row, "vehiculo", "Vehiculo", "placa", "Placa", "placaVehiculo", "placavehiculo");
            if (vehiculo == null) {
                continue;
            }
            String value = vehiculo.toString().trim().toLowerCase(Locale.ROOT);
            if (!value.isEmpty() && value.contains(comparable)) {
                out.add(row);
            }
        }
        return out;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String resolverSucursalNombreParaConsulta(
            String sucursalParam,
            ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo) {
        if (sucursalParam == null || sucursalParam.trim().isEmpty()) {
            return sucursalParam;
        }
        if (dbInfo != null && dbInfo.getNombreSucursal() != null && !dbInfo.getNombreSucursal().trim().isEmpty()) {
            return dbInfo.getNombreSucursal().trim();
        }
        return sucursalParam;
    }
}
