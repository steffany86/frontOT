package com.example.TigoStarSystem.supervisor.repository;

import com.example.TigoStarSystem.auth.repository.SucursalRepository;
import com.example.TigoStarSystem.supervisor.SucursalCanonicalizer;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRelacionRequest;
import com.example.TigoStarSystem.supervisor.dto.ConformacionCuadrillaRowRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Repositorio para gestionar la conformacion diaria de cuadrillas.
 * Centraliza consultas, altas/ediciones y catalogos relacionados.
 */
@Repository
public class ConformacionCuadrillaRepository {
    private static final String SQL_CREATE_RELACION_CUADRILLAS =
            "IF OBJECT_ID('dbo.relacion_cuadrillas', 'U') IS NULL " +
                    "BEGIN " +
                    "CREATE TABLE dbo.relacion_cuadrillas (" +
                    "id INT IDENTITY(1,1) NOT NULL PRIMARY KEY, " +
                    "id_ruta INT NOT NULL, " +
                    "id_tecnico_auxiliar INT NULL, " +
                    "auxiliar NVARCHAR(200) NULL, " +
                    "id_usuario_digitador INT NULL, " +
                    "digitador NVARCHAR(200) NULL, " +
                    "activo BIT NOT NULL CONSTRAINT DF_relacion_cuadrillas_activo DEFAULT(1), " +
                    "fecha_registro DATETIME NOT NULL CONSTRAINT DF_relacion_cuadrillas_fecha_registro DEFAULT(GETDATE()), " +
                    "fecha_actualizacion DATETIME NOT NULL CONSTRAINT DF_relacion_cuadrillas_fecha_actualizacion DEFAULT(GETDATE())" +
                    "); " +
                    "END; " +
                    "IF NOT EXISTS (" +
                    "SELECT 1 FROM sys.indexes " +
                    "WHERE name = 'UX_relacion_cuadrillas_id_ruta' " +
                    "AND object_id = OBJECT_ID('dbo.relacion_cuadrillas')" +
                    ") " +
                    "BEGIN " +
                    "CREATE UNIQUE INDEX UX_relacion_cuadrillas_id_ruta ON dbo.relacion_cuadrillas(id_ruta);" +
                    "END;";

    private final JdbcTemplate centralJdbcTemplate;
    private final JdbcTemplate jdbcTemplate;
    private final SucursalRepository sucursalRepository;
    private final ConformacionCuadrillaDbSupport dbSupport;

    // -------------------------------------------------------------------------
    // Configuracion e inicializacion
    // -------------------------------------------------------------------------

    /**
     * Inicializa templates, credenciales y datos base para conexion por sucursal.
     */
    public ConformacionCuadrillaRepository(
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
        this.sucursalRepository = sucursalRepository;
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

    // -------------------------------------------------------------------------
    // Consultas principales
    // -------------------------------------------------------------------------

    /**
     * Lista registros activos por fecha/sucursal con fallback entre fuentes.
     */
    public List<Map<String, Object>> listar(LocalDate fecha, String sucursal, Integer limite, Integer idTecnico) {
        return listarConFallback(fecha, sucursal, limite, idTecnico, false);
    }

    /**
     * Obtiene un registro por id desde la base de la sucursal seleccionada.
     */
    public Map<String, Object> obtenerPorId(Long id) {
        return obtenerPorId(id, null);
    }

    public Map<String, Object> obtenerPorId(Long id, String sucursal) {
        if (id == null) {
            return null;
        }
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);

        if (dbInfo == null) {
            return null;
        }
        return obtenerPorIdEnTemplate(crearJdbcTemplateSucursal(dbInfo), id);
    }

    /**
     * Lista registros incluyendo eliminados, con fallback entre fuentes.
     */
    public List<Map<String, Object>> listarConEliminados(
            LocalDate fecha,
            String sucursal,
            Integer limite,
            Integer idTecnico) {
        return listarConFallback(fecha, sucursal, limite, idTecnico, true);
    }

    /**
     * Ejecuta listado solo sobre la base de la sucursal seleccionada.
     */
    private List<Map<String, Object>> listarConFallback(
            LocalDate fecha,
            String sucursal,
            Integer limite,
            Integer idTecnico,
            boolean incluirEliminados) {
        Object fechaParam = fecha == null ? null : Date.valueOf(fecha);
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);
        if (dbInfo == null) {
            return new ArrayList<>();
        }
        String sucursalFiltro = resolverSucursalNombreParaConsulta(sucursalParam);
        return listarEnSucursalSeleccionada(
                sucursalFiltro,
                fechaParam,
                limite,
                idTecnico,
                dbInfo,
                incluirEliminados
        );
    }

    /**
     * Lista registros (incluyendo eliminados) desde la base de la sucursal seleccionada.
     */
    public List<Map<String, Object>> listarConEliminadosCentral(
            LocalDate fecha,
            String sucursal,
            Integer limite,
            Integer idTecnico) {
        if (centralJdbcTemplate == null) {
            return new ArrayList<>();
        }
        Object fechaParam = fecha == null ? null : Date.valueOf(fecha);
        String sucursalFiltro = resolverSucursalNombreParaConsulta(normalizarSucursal(sucursal));
        try {
            List<Map<String, Object>> rows = listarConEliminadosEnTemplate(
                    centralJdbcTemplate,
                    fechaParam,
                    sucursalFiltro,
                    limite,
                    idTecnico
            );
            return rows == null ? new ArrayList<>() : rows;
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    /**
     * Ejecuta el SP de listado en un template y maneja versiones de firma distintas.
     */
    private List<Map<String, Object>> listarEnTemplate(
            JdbcTemplate template,
            Object fechaParam,
            String sucursalParam,
            Integer limite,
            Integer idTecnico) {
        try {
            try {
                return template.queryForList(
                        "EXEC dbo.spx_ObtenerConformacionCuadrillaBackOffice ?, ?, ?, ?",
                        fechaParam,
                        sucursalParam,
                        limite,
                        idTecnico
                );
            } catch (DataAccessException exV4) {
                List<Map<String, Object>> rows = template.queryForList(
                        "EXEC dbo.spx_ObtenerConformacionCuadrillaBackOffice ?, ?, ?",
                        fechaParam,
                        sucursalParam,
                        limite
                );
                return filtrarPorTecnicoId(rows, idTecnico);
            }
        } catch (DataAccessException ex) {
            try {
                return template.queryForList(
                        "EXEC dbo.spx_ObtenerListadoConformacionCuadrillaBackOffice ?, ?, ?, ?",
                        fechaParam,
                        sucursalParam,
                        limite,
                        idTecnico
                );
            } catch (DataAccessException exV4Listado) {
                List<Map<String, Object>> rows = template.queryForList(
                        "EXEC dbo.spx_ObtenerListadoConformacionCuadrillaBackOffice ?, ?, ?",
                        fechaParam,
                        sucursalParam,
                        limite
                );
                return filtrarPorTecnicoId(rows, idTecnico);
            }
        }
    }

    /**
     * Busca un registro por id en un template especifico.
     */
    private Map<String, Object> obtenerPorIdEnTemplate(JdbcTemplate template, Long id) {
        try {
            List<Map<String, Object>> rows = queryForList(
                    template,
                    "SELECT TOP 1 * FROM dbo.tbl_ConformacionCuadrillaDiario WHERE id = ? ORDER BY id DESC",
                    id
            );
            if (rows == null || rows.isEmpty()) {
                return null;
            }
            return rows.get(0);
        } catch (DataAccessException ex) {
            return null;
        }
    }

    /**
     * Consulta directo a tabla para incluir filas eliminadas.
     */
    private List<Map<String, Object>> listarConEliminadosEnTemplate(
            JdbcTemplate template,
            Object fechaParam,
            String sucursalParam,
            Integer limite,
            Integer idTecnico) {
        StringBuilder sql = new StringBuilder(
                "SELECT * FROM dbo.tbl_ConformacionCuadrillaDiario WHERE 1=1"
        );
        List<Object> args = new ArrayList<>();
        if (fechaParam != null) {
            sql.append(" AND CONVERT(date, fecha) = CONVERT(date, ?)");
            args.add(fechaParam);
        }
        if (!isBlank(sucursalParam)) {
            sql.append(" AND LOWER(REPLACE(REPLACE(REPLACE(ISNULL(CAST(sucursal AS VARCHAR(120)), ''), ' ', ''), '_', ''), '-', ''))");
            sql.append(" = LOWER(REPLACE(REPLACE(REPLACE(?, ' ', ''), '_', ''), '-', ''))");
            args.add(sucursalParam.trim());
        }
        if (idTecnico != null) {
            sql.append(" AND id_tecnico = ?");
            args.add(idTecnico);
        }
        sql.append(" ORDER BY fechaRegistro DESC, id DESC");

        List<Map<String, Object>> rows = queryForList(template, sql.toString(), args.toArray());
        if (rows == null || rows.isEmpty()) {
            return rows;
        }
        if (limite == null || limite <= 0 || rows.size() <= limite) {
            return rows;
        }
        return new ArrayList<>(rows.subList(0, limite));
    }

    // -------------------------------------------------------------------------
    // Persistencia (alta y edicion)
    // -------------------------------------------------------------------------

    /**
     * Guarda una fila confirmada en la base central.
     */
    public int guardarFilaConfirmada(ConformacionCuadrillaRowRequest fila) {
        if (centralJdbcTemplate == null) {
            throw new IllegalStateException("No hay datasource central configurado para guardar confirmaciones.");
        }
        // Regla principal: la confirmacion debe persistirse siempre en BDControlOrdenes.
        int affectedCentral = ejecutarRegistrar(centralJdbcTemplate, fila);
        if (affectedCentral <= 0) {
            throw new IllegalStateException("No se pudo guardar la confirmacion en BDControlOrdenes.");
        }

        // Replica obligatoria en base local de la sucursal seleccionada.
        List<JdbcTemplate> templates = construirTemplatesEscritura(
                fila == null ? null : fila.getSucursal(),
                null
        );
        boolean guardadoLocal = false;
        RuntimeException errorLocal = null;
        if (templates != null && !templates.isEmpty()) {
            for (JdbcTemplate template : templates) {
                if (template == null || template == centralJdbcTemplate) {
                    continue;
                }
                try {
                    int affectedLocal = ejecutarRegistrar(template, fila);
                    if (affectedLocal > 0) {
                        guardadoLocal = true;
                        break;
                    }
                } catch (RuntimeException ex) {
                    errorLocal = ex;
                }
            }
        }
        if (!guardadoLocal) {
            if (errorLocal != null) {
                throw errorLocal;
            }
            throw new IllegalStateException("No se pudo guardar la confirmacion en la BD local de la sucursal.");
        }
        return affectedCentral;
    }

    /**
     * Actualiza una fila existente en la base central.
     */
    public int actualizarFila(Long id, ConformacionCuadrillaRowRequest fila) {
        if (centralJdbcTemplate == null) {
            throw new IllegalStateException("No hay datasource central configurado para actualizar confirmaciones.");
        }
        return ejecutarActualizar(centralJdbcTemplate, id, fila);
    }

    // -------------------------------------------------------------------------
    // Catalogos y datos auxiliares
    // -------------------------------------------------------------------------

    /**
     * Lista tecnicos para formularios de conformacion.
     */
    public List<Map<String, Object>> listarTecnicos() {
        return listarTecnicos(null);
    }

    public List<Map<String, Object>> listarTecnicos(String sucursal) {
        String sql = "EXEC dbo.spx_TraerVendedores_x_FormTecnico";
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);

        if (dbInfo != null) {
            try {
                JdbcTemplate sucursalTemplate = crearJdbcTemplateSucursal(dbInfo);
                List<Map<String, Object>> rowsSucursal = queryForList(sucursalTemplate, sql);
                if (rowsSucursal != null && !rowsSucursal.isEmpty()) {
                    return normalizarCatalogoTecnicos(rowsSucursal);
                }
            } catch (DataAccessException ex) {
                // fallback below
            }
        }
        return normalizarCatalogoTecnicos(queryForListFallback(sql));
    }

    /**
     * Lista tecnicos para edicion con fallback de procedimiento almacenado.
     */
    public List<Map<String, Object>> listarTecnicosFiltroEdicion() {
        return listarTecnicosFiltroEdicion(null);
    }

    public List<Map<String, Object>> listarTecnicosFiltroEdicion(String sucursal) {
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);
        String sqlPreferido = "EXEC dbo.spr_TraerVendedores_x_FormTecnico";
        String sqlFallback = "EXEC dbo.spx_TraerVendedores_x_FormTecnico";

        if (dbInfo != null) {
            JdbcTemplate sucursalTemplate = crearJdbcTemplateSucursal(dbInfo);
            List<Map<String, Object>> rowsSucursal =
                    queryForListConSpAlternativos(sucursalTemplate, sqlPreferido, sqlFallback);
            if (rowsSucursal != null && !rowsSucursal.isEmpty()) {
                return normalizarCatalogoTecnicos(rowsSucursal);
            }
        }

        return normalizarCatalogoTecnicos(
                queryForListFallbackConSpAlternativos(sqlPreferido, sqlFallback)
        );
    }

    /**
     * Lista catalogo de Salesforce y Cuenta SF desde tbl_SalesForce.
     */
    public List<Map<String, Object>> listarSalesforce(String sucursal) {
        String sql = "SELECT * FROM dbo.tbl_SalesForce";
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);
        if (dbInfo == null) {
            return new ArrayList<>();
        }
        JdbcTemplate target = crearJdbcTemplateSucursal(dbInfo);
        return normalizarCatalogoSalesforce(queryForListSafe(target, sql));
    }

    /**
     * Lista auxiliares usando el mismo catalogo de tecnicos.
     */
    public List<Map<String, Object>> listarAuxiliares() {
        return normalizarCatalogoTecnicos(queryForListFallbackConSpAlternativos(
                "EXEC dbo.spr_TraerVendedores_x_FormTecnico",
                "EXEC dbo.spx_TraerVendedores_x_FormTecnico"
        ));
    }

    /**
     * Obtiene detalle de un tecnico especifico.
     */
    public List<Map<String, Object>> obtenerTecnicoDetalle(Integer idTecnico) {
        return normalizarCatalogoTecnicos(
                queryForListFallback("EXEC dbo.spx_ObtenerDatosTecnicoCuadrilla ?", idTecnico)
        );
    }

    /**
     * Lista digitadores disponibles.
     */
    public List<Map<String, Object>> listarDigitadores() {
        return queryForListFallbackConSpAlternativos(
                "EXEC dbo.spx_ObtenerDigitadores",
                "EXEC dbo.spx_ObtenerListaDigitadores"
        );
    }

    /**
     * Lista digitadores para edicion con fallback entre SPs.
     */
    public List<Map<String, Object>> listarDigitadoresFiltroEdicion() {
        return queryForListFallbackConSpAlternativos(
                "EXEC dbo.spx_ObtenerListaDigitadores",
                "EXEC dbo.spx_ObtenerDigitadores"
        );
    }

    /**
     * Lista supervisores disponibles.
     */
    public List<Map<String, Object>> listarSupervisores() {
        return queryForListFallback("EXEC dbo.spx_ObtenerSupervisores");
    }

    /**
     * Lista vehiculos filtrando por placa o texto parcial.
     */
    public List<Map<String, Object>> listarVehiculos(String filtro) {
        String filtroParam = (filtro == null || filtro.trim().isEmpty()) ? null : filtro.trim();
        return queryForListFallback("EXEC dbo.[listar-vehiculo] ?", filtroParam);
    }

    /**
     * Lista vehiculos para edicion, priorizando los del tecnico indicado.
     */
    public List<Map<String, Object>> listarVehiculosFiltroEdicion(Integer idTecnico) {
        if (idTecnico != null) {
            try {
                return queryForListFallback("EXEC dbo.spx_ObtenerPlacavehiculos_Tecnico ?", idTecnico);
            } catch (DataAccessException ex) {
                // fallback sin parametro
            }
        }
        try {
            return queryForListFallback("EXEC dbo.spx_ObtenerPlacavehiculos_Tecnico");
        } catch (DataAccessException ex) {
            return listarVehiculos(null);
        }
    }

    /**
     * Sobrecarga para listar grupos sin sucursal explicita.
     */
    public List<Map<String, Object>> listarGruposFiltroEdicion() {
        return listarGruposFiltroEdicion(null);
    }

    /**
     * Lista grupos/rutas para edicion segun contexto de sucursal.
     */
    public List<Map<String, Object>> listarGruposFiltroEdicion(String sucursal) {
        String sql = "EXEC dbo.spx_ObtenerRutaXIdTecnico";
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);

        if (dbInfo != null) {
            try {
                JdbcTemplate sucursalTemplate = crearJdbcTemplateSucursal(dbInfo);
                List<Map<String, Object>> rowsSucursal = queryForList(sucursalTemplate, sql);
                if (rowsSucursal != null && !rowsSucursal.isEmpty()) {
                    return rowsSucursal;
                }
            } catch (DataAccessException ex) {
                // fallback below
            }
        }
        return new ArrayList<>();
    }

    /**
     * Lista relaciones ruta->auxiliar/digitador para la sucursal solicitada.
     */
    public List<Map<String, Object>> listarRelacionesCuadrilla(String sucursal) {
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);

        if (dbInfo == null) {
            return new ArrayList<>();
        }
        try {
            List<Map<String, Object>> rows = listarRelacionesEnTemplate(crearJdbcTemplateSucursal(dbInfo));
            return rows == null ? new ArrayList<>() : rows;
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    /**
     * Inserta o actualiza la relacion de una ruta con auxiliar/digitador.
     */
    public int guardarRelacionCuadrilla(ConformacionCuadrillaRelacionRequest request) {
        RuntimeException lastError = null;
        List<JdbcTemplate> templates = construirTemplatesEscritura(
                request == null ? null : request.getSucursal(),
                null
        );
        for (JdbcTemplate template : templates) {
            try {
                return ejecutarUpsertRelacionCuadrilla(template, request);
            } catch (RuntimeException ex) {
                lastError = ex;
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        return 0;
    }

    /**
     * Ejecuta el upsert de relacion en un template especifico.
     */
    private int ejecutarUpsertRelacionCuadrilla(
            JdbcTemplate template,
            ConformacionCuadrillaRelacionRequest request) {
        asegurarTablaRelacionCuadrillas(template);
        boolean activo = request != null && request.getActivo() != null ? request.getActivo() : true;

        try {
            int affected = template.update(
                    "EXEC dbo.spx_GuardarRelacionCuadrilla ?, ?, ?, ?, ?, ?",
                    request == null ? null : request.getIdRuta(),
                    request == null ? null : request.getIdTecnicoAuxiliar(),
                    request == null ? null : request.getAuxiliar(),
                    request == null ? null : request.getIdUsuarioDigitador(),
                    request == null ? null : request.getDigitador(),
                    activo
            );
            if (affected > 0) {
                return affected;
            }
        } catch (DataAccessException ex) {
            // fallback a upsert directo cuando el SP aun no existe en la BD.
        }

        int updated = template.update(
                "UPDATE dbo.relacion_cuadrillas " +
                        "SET id_tecnico_auxiliar = ?, " +
                        "auxiliar = ?, " +
                        "id_usuario_digitador = ?, " +
                        "digitador = ?, " +
                        "activo = ?, " +
                        "fecha_actualizacion = GETDATE() " +
                        "WHERE id_ruta = ?",
                request == null ? null : request.getIdTecnicoAuxiliar(),
                request == null ? null : request.getAuxiliar(),
                request == null ? null : request.getIdUsuarioDigitador(),
                request == null ? null : request.getDigitador(),
                activo,
                request == null ? null : request.getIdRuta()
        );
        if (updated > 0) {
            return updated;
        }

        return template.update(
                "INSERT INTO dbo.relacion_cuadrillas (" +
                        "id_ruta, id_tecnico_auxiliar, auxiliar, id_usuario_digitador, digitador, activo, fecha_registro, fecha_actualizacion" +
                        ") VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())",
                request == null ? null : request.getIdRuta(),
                request == null ? null : request.getIdTecnicoAuxiliar(),
                request == null ? null : request.getAuxiliar(),
                request == null ? null : request.getIdUsuarioDigitador(),
                request == null ? null : request.getDigitador(),
                activo
        );
    }

    /**
     * Lista relaciones activas en un template; crea tabla si no existe.
     */
    private List<Map<String, Object>> listarRelacionesEnTemplate(JdbcTemplate template) {
        if (template == null) {
            return new ArrayList<>();
        }
        try {
            asegurarTablaRelacionCuadrillas(template);
            List<Map<String, Object>> rows = queryForList(
                    template,
                    "SELECT id, id_ruta, id_tecnico_auxiliar, auxiliar, id_usuario_digitador, digitador, activo, fecha_registro, fecha_actualizacion " +
                            "FROM dbo.relacion_cuadrillas " +
                            "WHERE ISNULL(activo, 1) = 1"
            );
            return rows == null ? new ArrayList<>() : rows;
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    /**
     * Crea la tabla de relaciones de cuadrilla si no existe en la BD actual.
     */
    private void asegurarTablaRelacionCuadrillas(JdbcTemplate template) {
        if (template == null) {
            return;
        }
        template.execute(SQL_CREATE_RELACION_CUADRILLAS);
    }

    /**
     * Obtiene sucursales unicas para el selector de la interfaz.
     */
    public List<Map<String, Object>> obtenerSucursalActual() {
        List<Map<String, Object>> rows = sucursalRepository.obtenerSucursales();
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        Set<String> seen = new HashSet<>();
        for (Map<String, Object> row : rows) {
            Integer id = asInteger(firstNonNull(row, "idsucursal", "id_sucursal", "Id_Sucursal"));
            String nombre = SucursalCanonicalizer.canonicalize(
                    asString(firstNonNull(row, "sucursal", "Sucursal"))
            );
            if (isBlank(nombre)) {
                continue;
            }
            String key = nombre.trim().toUpperCase(Locale.ROOT);
            if (!seen.add(key)) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idSucursal", id);
            item.put("sucursal", nombre.trim());
            out.add(item);
        }
        return out;
    }

    /**
     * Busca un registro activo que ya use el mismo Salesforce en el contexto de fecha/sucursal.
     * Se usa para bloquear duplicados al guardar/actualizar conformacion de cuadrillas.
     */
    public Map<String, Object> buscarRegistroActivoPorSalesforceEnContexto(
            LocalDate fecha,
            String sucursal,
            String salesforce,
            Long idExcluir) {
        String salesforceParam = asTrimmedText(salesforce);
        if (isBlank(salesforceParam)) {
            return null;
        }

        String sucursalParam = normalizarSucursal(sucursal);
        List<JdbcTemplate> templates = construirTemplatesEscritura(sucursalParam, idExcluir);
        if (templates == null || templates.isEmpty()) {
            return null;
        }

        for (JdbcTemplate template : templates) {
            Map<String, Object> existente = buscarRegistroActivoPorSalesforceEnTemplate(
                    template,
                    fecha,
                    sucursalParam,
                    salesforceParam,
                    idExcluir
            );
            if (existente != null && !existente.isEmpty()) {
                return existente;
            }
        }
        return null;
    }

    /**
     * Busca un registro activo por tecnico en el contexto fecha/sucursal.
     * Prioriza SP spx_ExisteRegistroConformacionCuadrillaDiario y usa fallback a tabla.
     */
    public Map<String, Object> buscarRegistroActivoPorTecnicoEnContexto(
            LocalDate fecha,
            String sucursal,
            String tecnico,
            Long idExcluir) {
        String tecnicoParam = asTrimmedText(tecnico);
        if (isBlank(tecnicoParam)) {
            return null;
        }

        String sucursalParam = normalizarSucursal(sucursal);
        List<JdbcTemplate> templates = construirTemplatesEscritura(sucursalParam, idExcluir);
        if (templates == null || templates.isEmpty()) {
            return null;
        }

        for (JdbcTemplate template : templates) {
            Map<String, Object> existente = buscarRegistroActivoPorTecnicoEnTemplate(
                    template,
                    fecha,
                    sucursalParam,
                    tecnicoParam,
                    idExcluir
            );
            if (existente != null && !existente.isEmpty()) {
                return existente;
            }
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // Helpers de acceso a datos
    // -------------------------------------------------------------------------

    /**
     * Ejecuta una consulta intentando primero operativa y luego central.
     */
    private List<Map<String, Object>> queryForListFallback(String sql, Object... args) {
        try {
            List<Map<String, Object>> operativa = queryForList(jdbcTemplate, sql, args);
            if (operativa != null && !operativa.isEmpty()) {
                return operativa;
            }
        } catch (DataAccessException ex) {
            // fallback below
        }
        try {
            List<Map<String, Object>> central = queryForList(centralJdbcTemplate, sql, args);
            return central == null ? new ArrayList<>() : central;
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    /**
     * Busca en un template si ya existe un Salesforce activo para la misma fecha/sucursal.
     */
    private Map<String, Object> buscarRegistroActivoPorSalesforceEnTemplate(
            JdbcTemplate template,
            LocalDate fecha,
            String sucursal,
            String salesforce,
            Long idExcluir) {
        if (template == null || isBlank(salesforce)) {
            return null;
        }

        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT TOP 1 id, tecnico, salesforce, fecha, sucursal " +
                        "FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "WHERE LOWER(LTRIM(RTRIM(ISNULL(CAST(salesforce AS NVARCHAR(250)), '')))) " +
                        "      = LOWER(LTRIM(RTRIM(CAST(? AS NVARCHAR(250)))))"
        );
        args.add(salesforce);

        if (fecha != null) {
            sql.append(" AND CONVERT(date, fecha) = CONVERT(date, ?)");
            args.add(Date.valueOf(fecha));
        }
        if (!isBlank(sucursal)) {
            sql.append(" AND LOWER(REPLACE(REPLACE(REPLACE(ISNULL(CAST(sucursal AS VARCHAR(120)), ''), ' ', ''), '_', ''), '-', ''))");
            sql.append(" = LOWER(REPLACE(REPLACE(REPLACE(?, ' ', ''), '_', ''), '-', ''))");
            args.add(sucursal.trim());
        }
        if (idExcluir != null) {
            sql.append(" AND id <> ?");
            args.add(idExcluir);
        }

        // Prioriza registros no eliminados logicamente.
        String sqlActivo = sql + " AND ISNULL(e_eliminado, 0) = 0 ORDER BY fechaRegistro DESC, id DESC";

        try {
            List<Map<String, Object>> rows = queryForList(template, sqlActivo, args.toArray());
            if (rows != null && !rows.isEmpty()) {
                return rows.get(0);
            }
        } catch (DataAccessException ex) {
            // fallback sin e_eliminado para esquemas antiguos
        }

        try {
            List<Map<String, Object>> rows = queryForList(
                    template,
                    sql + " ORDER BY fechaRegistro DESC, id DESC",
                    args.toArray()
            );
            if (rows == null || rows.isEmpty()) {
                return null;
            }
            return rows.get(0);
        } catch (DataAccessException ex) {
            return null;
        }
    }

    private Map<String, Object> buscarRegistroActivoPorTecnicoEnTemplate(
            JdbcTemplate template,
            LocalDate fecha,
            String sucursal,
            String tecnico,
            Long idExcluir) {
        if (template == null || isBlank(tecnico)) {
            return null;
        }

        Date fechaSql = fecha == null ? null : Date.valueOf(fecha);

        // Intento 1: SP con firma de 4 parametros.
        try {
            List<Map<String, Object>> rows = queryForList(
                    template,
                    "EXEC dbo.spx_ExisteRegistroConformacionCuadrillaDiario ?, ?, ?, ?",
                    fechaSql,
                    sucursal,
                    tecnico,
                    idExcluir
            );
            if (rows != null && !rows.isEmpty()) {
                return rows.get(0);
            }
        } catch (DataAccessException ignored) {
            // fallback a otras firmas
        }

        // Intento 2: SP con firma de 3 parametros.
        try {
            List<Map<String, Object>> rows = queryForList(
                    template,
                    "EXEC dbo.spx_ExisteRegistroConformacionCuadrillaDiario ?, ?, ?",
                    fechaSql,
                    sucursal,
                    tecnico
            );
            if (rows != null && !rows.isEmpty()) {
                return rows.get(0);
            }
        } catch (DataAccessException ignored) {
            // fallback a consulta directa
        }

        // Fallback robusto por tabla.
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT TOP 1 id, fecha, sucursal, tecnico, salesforce " +
                        "FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "WHERE LOWER(LTRIM(RTRIM(ISNULL(CAST(tecnico AS NVARCHAR(250)), '')))) " +
                        "      = LOWER(LTRIM(RTRIM(CAST(? AS NVARCHAR(250)))))"
        );
        args.add(tecnico);
        if (fecha != null) {
            sql.append(" AND CONVERT(date, fecha) = CONVERT(date, ?)");
            args.add(fechaSql);
        }
        if (!isBlank(sucursal)) {
            sql.append(" AND LOWER(REPLACE(REPLACE(REPLACE(ISNULL(CAST(sucursal AS VARCHAR(120)), ''), ' ', ''), '_', ''), '-', ''))");
            sql.append(" = LOWER(REPLACE(REPLACE(REPLACE(?, ' ', ''), '_', ''), '-', ''))");
            args.add(sucursal.trim());
        }
        if (idExcluir != null) {
            sql.append(" AND id <> ?");
            args.add(idExcluir);
        }
        sql.append(" AND ISNULL(e_eliminado, 0) = 0 ORDER BY id DESC");

        try {
            List<Map<String, Object>> rows = queryForList(template, sql.toString(), args.toArray());
            if (rows == null || rows.isEmpty()) return null;
            return rows.get(0);
        } catch (DataAccessException ex) {
            return null;
        }
    }

    /**
     * Ejecuta una lista de SP equivalentes sobre un template hasta obtener datos.
     */
    private List<Map<String, Object>> queryForListConSpAlternativos(
            JdbcTemplate template,
            String... sqlAlternativos) {
        if (template == null || sqlAlternativos == null || sqlAlternativos.length == 0) {
            return new ArrayList<>();
        }
        for (String sql : sqlAlternativos) {
            try {
                List<Map<String, Object>> rows = queryForList(template, sql);
                if (rows != null && !rows.isEmpty()) {
                    return rows;
                }
            } catch (DataAccessException ex) {
                // intenta siguiente SP alternativo
            }
        }
        return new ArrayList<>();
    }

    /**
     * Ejecuta SP equivalentes con fallback operativa->central hasta obtener datos.
     */
    private List<Map<String, Object>> queryForListFallbackConSpAlternativos(String... sqlAlternativos) {
        if (sqlAlternativos == null || sqlAlternativos.length == 0) {
            return new ArrayList<>();
        }
        for (String sql : sqlAlternativos) {
            List<Map<String, Object>> rows = queryForListFallback(sql);
            if (rows != null && !rows.isEmpty()) {
                return rows;
            }
        }
        return new ArrayList<>();
    }

    /**
     * Normaliza claves de tecnico/auxiliar para mantener compatibilidad entre SPs.
     */
    private List<Map<String, Object>> normalizarCatalogoTecnicos(List<Map<String, Object>> rows) {
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

            Object cuenta = findValueCaseInsensitive(row, "cuentaSf", "cuenta_sf", "cuentasf", "CuentaSF");
            if (cuenta != null) {
                normalizada.put("cuentaSf", cuenta);
                normalizada.put("cuenta_sf", cuenta);
            }

            Object salesforce = findValueCaseInsensitive(row, "salesforce", "SalesForce");
            if (salesforce != null) {
                normalizada.put("salesforce", salesforce);
            }

            out.add(normalizada);
        }
        return out;
    }

    private List<Map<String, Object>> normalizarCatalogoSalesforce(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Map<String, Object> normalizada = new LinkedHashMap<>();
            if (row != null && !row.isEmpty()) {
                normalizada.putAll(row);
            } else {
                continue;
            }

            Object salesforce = findValueCaseInsensitive(
                    row,
                    "salesforce",
                    "SalesForce",
                    "sales_force",
                    "nombresalesforce",
                    "nombre_salesforce"
            );
            Object cuenta = findValueCaseInsensitive(
                    row,
                    "cuentaSf",
                    "cuenta_sf",
                    "cuentasf",
                    "CuentaSF",
                    "cuenta"
            );
            String salesforceText = salesforce == null ? "" : String.valueOf(salesforce).trim();
            String cuentaText = cuenta == null ? "" : String.valueOf(cuenta).trim();
            if (salesforceText.isEmpty() && cuentaText.isEmpty()) {
                continue;
            }
            if (salesforce != null) {
                normalizada.put("salesforce", salesforce);
            }
            if (cuenta != null) {
                normalizada.put("cuentaSf", cuenta);
                normalizada.put("cuenta_sf", cuenta);
            }
            out.add(normalizada);
        }
        return out;
    }

    /**
     * Ejecuta queryForList de forma segura y retorna lista vacia ante error.
     */
    private List<Map<String, Object>> queryForListSafe(JdbcTemplate template, String sql, Object... args) {
        if (template == null || isBlank(sql)) {
            return new ArrayList<>();
        }
        try {
            List<Map<String, Object>> rows = queryForList(template, sql, args);
            return rows == null ? new ArrayList<>() : rows;
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    /**
     * Mezcla filas de Salesforce sin perder datos y deduplicando por salesforce/cuenta.
     */
    private void mergeSalesforceRows(
            Map<String, Map<String, Object>> target,
            List<Map<String, Object>> rows) {
        if (target == null || rows == null || rows.isEmpty()) {
            return;
        }

        List<Map<String, Object>> normalizadas = normalizarCatalogoSalesforce(rows);
        for (Map<String, Object> row : normalizadas) {
            if (row == null || row.isEmpty()) {
                continue;
            }

            String salesforce = asTrimmedText(findValueCaseInsensitive(
                    row,
                    "salesforce",
                    "SalesForce",
                    "sales_force"
            ));
            String cuentaSf = asTrimmedText(findValueCaseInsensitive(
                    row,
                    "cuentaSf",
                    "cuenta_sf",
                    "cuentasf",
                    "CuentaSF"
            ));

            String keySource = !isBlank(salesforce) ? salesforce : cuentaSf;
            if (isBlank(keySource)) {
                continue;
            }
            String key = keySource.trim().toUpperCase(Locale.ROOT);

            Map<String, Object> current = target.get(key);
            if (current == null) {
                target.put(key, new LinkedHashMap<>(row));
                continue;
            }
            if (isBlank(asTrimmedText(current.get("salesforce"))) && !isBlank(salesforce)) {
                current.put("salesforce", salesforce);
            }
            if (isBlank(asTrimmedText(current.get("cuentaSf"))) && !isBlank(cuentaSf)) {
                current.put("cuentaSf", cuentaSf);
                current.put("cuenta_sf", cuentaSf);
            }
        }
    }

    private String asTrimmedText(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value).trim();
    }

    private Object findValueCaseInsensitive(Map<String, Object> row, String... candidates) {
        if (row == null || row.isEmpty() || candidates == null || candidates.length == 0) {
            return null;
        }
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            String current = normalizeKey(entry.getKey());
            for (String candidate : candidates) {
                if (current.equals(normalizeKey(candidate))) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    private String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.replace("_", "").trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Wrapper para queryForList con o sin argumentos.
     */
    private List<Map<String, Object>> queryForList(JdbcTemplate template, String sql, Object... args) {
        if (args == null || args.length == 0) {
            return template.queryForList(sql);
        }
        return template.queryForList(sql, args);
    }

    /**
     * Filtra filas por id de tecnico cuando el SP no lo soporta.
     */
    private List<Map<String, Object>> filtrarPorTecnicoId(List<Map<String, Object>> rows, Integer idTecnico) {
        if (idTecnico == null || rows == null || rows.isEmpty()) {
            return rows;
        }
        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Integer value = asInteger(
                    firstNonNull(row, "id_tecnico", "Id_Tecnico", "idTecnico", "idTecnicoTitular")
            );
            if (value != null && value.equals(idTecnico)) {
                filtered.add(row);
            }
        }
        return filtered;
    }

    /**
     * Devuelve el primer valor no nulo de un mapa segun llaves candidatas.
     */
    private Object firstNonNull(Map<String, Object> row, String... keys) {
        if (row == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            if (row.containsKey(key) && row.get(key) != null) {
                return row.get(key);
            }
        }
        return null;
    }

    /**
     * Convierte un valor dinamico a Integer de forma segura.
     */
    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /**
     * Ejecuta el SP de registro de conformacion.
     */
    private int ejecutarRegistrar(JdbcTemplate template, ConformacionCuadrillaRowRequest fila) {
        Object[] args = new Object[] {
                fila.getFecha() == null ? null : Date.valueOf(fila.getFecha()),
                fila.getEstado(),
                fila.getActividad(),
                fila.getIdTecnico(),
                fila.getCuentaSf(),
                fila.getSalesforce(),
                fila.getHabilidad(),
                fila.getVehiculo(),
                fila.getGrupo(),
                fila.getAlmacen(),
                fila.getGrupoDigitacion(),
                fila.getIdUsuarioDigitador(),
                fila.getDigitador(),
                fila.getTecnico(),
                fila.getIdTecnicoAuxiliar(),
                fila.getAuxiliar(),
                fila.getIdUsuarioSupervisor(),
                fila.getSupervisorACargo(),
                fila.getSucursal(),
                fila.getObservacion(),
                fila.getIdUsuarioRegistra()
        };

        try {
            int affected = ejecutarSpEscritura(
                    template,
                    "EXEC dbo.spx_RegistrarConformacionCuadrillaBackOffice " +
                            "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
                    args
            );
            return normalizeInsertOutcome(template, fila, affected);
        } catch (DataAccessException backofficeEx) {
            try {
                int affected = ejecutarSpEscritura(
                        template,
                        "EXEC dbo.spx_RegistrarConformacionCuadrillaWeb " +
                                "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
                        args
                );
                return normalizeInsertOutcome(template, fila, affected);
            } catch (DataAccessException webEx) {
                webEx.addSuppressed(backofficeEx);
                throw webEx;
            }
        }
    }

    /**
     * Ejecuta el SP de actualizacion de conformacion.
     */
    private int ejecutarActualizar(JdbcTemplate template, Long id, ConformacionCuadrillaRowRequest fila) {
        Object[] args = new Object[] {
                id,
                fila.getFecha() == null ? null : Date.valueOf(fila.getFecha()),
                fila.getEstado(),
                fila.getActividad(),
                fila.getIdTecnico(),
                fila.getCuentaSf(),
                fila.getSalesforce(),
                fila.getHabilidad(),
                fila.getVehiculo(),
                fila.getGrupo(),
                fila.getAlmacen(),
                fila.getGrupoDigitacion(),
                fila.getIdUsuarioDigitador(),
                fila.getDigitador(),
                fila.getTecnico(),
                fila.getIdTecnicoAuxiliar(),
                fila.getAuxiliar(),
                fila.getIdUsuarioSupervisor(),
                fila.getSupervisorACargo(),
                fila.getSucursal(),
                fila.getObservacion(),
                fila.getIdUsuarioRegistra()
        };

        try {
            int affected = ejecutarSpEscritura(
                    template,
                    "EXEC dbo.spx_ActualizarConformacionCuadrillaBackOffice " +
                            "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
                    args
            );
            // Con SQL Server + SET NOCOUNT ON el driver puede devolver -1 aunque el UPDATE se ejecute.
            return normalizeAffectedRows(affected);
        } catch (DataAccessException backofficeEx) {
            try {
                int affected = ejecutarSpEscritura(
                        template,
                        "EXEC dbo.spx_ActualizarConformacionCuadrillaWeb " +
                                "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
                        args
                );
                return normalizeAffectedRows(affected);
            } catch (DataAccessException webEx) {
                webEx.addSuppressed(backofficeEx);
                throw webEx;
            }
        }
    }

    /**
     * Ejecuta un SP de escritura tolerando casos donde el SP devuelve un result set.
     */
    private int ejecutarSpEscritura(JdbcTemplate template, String sql, Object[] args) {
        try {
            return template.update(sql, args);
        } catch (DataAccessException ex) {
            if (!isExecuteUpdateWithResultSetError(ex)) {
                throw ex;
            }
            List<Map<String, Object>> rows = queryForList(template, sql, args);
            return (rows == null || rows.isEmpty()) ? 0 : 1;
        }
    }

    private boolean isExecuteUpdateWithResultSetError(DataAccessException ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            String message = cursor.getMessage();
            if (message != null) {
                String lower = message.toLowerCase(Locale.ROOT);
                if (lower.contains("executeupdate") && lower.contains("result set")) {
                    return true;
                }
            }
            cursor = cursor.getCause();
        }
        return false;
    }

    private int normalizeAffectedRows(int affected) {
        return affected < 0 ? 1 : affected;
    }

    private int normalizeInsertOutcome(JdbcTemplate template, ConformacionCuadrillaRowRequest fila, int affected) {
        int normalized = normalizeAffectedRows(affected);
        if (normalized > 0) {
            return normalized;
        }
        return existeRegistroInsertadoReciente(template, fila) ? 1 : 0;
    }

    private boolean existeRegistroInsertadoReciente(JdbcTemplate template, ConformacionCuadrillaRowRequest fila) {
        if (template == null || fila == null || fila.getFecha() == null || fila.getIdTecnico() == null) {
            return false;
        }
        try {
            List<Map<String, Object>> rows = queryForList(
                    template,
                    "SELECT TOP 1 id " +
                            "FROM dbo.tbl_ConformacionCuadrillaDiario " +
                            "WHERE fecha = ? " +
                            "  AND id_tecnico = ? " +
                            "  AND ISNULL(vehiculo, '') = ISNULL(?, '') " +
                            "  AND ISNULL(grupo, '') = ISNULL(?, '') " +
                            "  AND ISNULL(sucursal, '') = ISNULL(?, '') " +
                            "  AND ISNULL(observacion, '') = ISNULL(?, '') " +
                            "  AND fechaRegistro >= DATEADD(MINUTE, -5, GETDATE()) " +
                            "ORDER BY id DESC",
                    Date.valueOf(fila.getFecha()),
                    fila.getIdTecnico(),
                    fila.getVehiculo(),
                    fila.getGrupo(),
                    fila.getSucursal(),
                    fila.getObservacion()
            );
            return rows != null && !rows.isEmpty();
        } catch (RuntimeException ex) {
            return false;
        }
    }

    /**
     * Define templates candidatos para operaciones de escritura.
     * Usa exclusivamente la sucursal activa.
     * Cuando hay id (edicion), prioriza templates donde el id ya existe.
     */
    private List<JdbcTemplate> construirTemplatesEscritura(String sucursal, Long id) {
        List<JdbcTemplate> candidatos = new ArrayList<>();
        String sucursalParam = normalizarSucursal(sucursal);
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = null;
        try {
            dbInfo = resolverSucursalDbInfo(sucursalParam);
        } catch (RuntimeException ignored) {
            // Si falla el catalogo de sucursales, continuar con templates por defecto.
        }
        if (dbInfo != null) {
            try {
                candidatos.add(crearJdbcTemplateSucursal(dbInfo));
            } catch (RuntimeException ignored) {
                // continua con siguientes candidatos
            }
        }
        List<JdbcTemplate> unicos = dedupeTemplates(candidatos);
        if (id == null) {
            return unicos;
        }

        List<JdbcTemplate> priorizados = new ArrayList<>();
        for (JdbcTemplate template : unicos) {
            try {
                if (obtenerPorIdEnTemplate(template, id) != null) {
                    priorizados.add(template);
                }
            } catch (RuntimeException ignored) {
                // si no se puede consultar ese template, queda como fallback
            }
        }
        for (JdbcTemplate template : unicos) {
            if (!containsTemplate(priorizados, template)) {
                priorizados.add(template);
            }
        }
        return priorizados;
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
        if (templates == null || templates.isEmpty() || candidate == null) {
            return false;
        }
        for (JdbcTemplate template : templates) {
            if (template == candidate) {
                return true;
            }
        }
        return false;
    }

    /**
     * Lista registros activos conectando directo a la sucursal seleccionada.
     */
    private List<Map<String, Object>> listarEnSucursalSeleccionada(
            String sucursalParam,
            Object fechaParam,
            Integer limite,
            Integer idTecnico,
            ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo,
            boolean incluirEliminados) {
        if (sucursalParam == null || sucursalParam.trim().isEmpty()) {
            return new ArrayList<>();
        }
        if (dbInfo == null) {
            return new ArrayList<>();
        }
        JdbcTemplate sucursalTemplate = crearJdbcTemplateSucursal(dbInfo);
        Set<String> filtros = dbSupport.construirFiltrosConsulta(sucursalParam, dbInfo);
        return listarEnTemplatesConFiltros(
                sucursalTemplate,
                filtros,
                fechaParam,
                limite,
                idTecnico,
                incluirEliminados
        );
    }

    /**
     * Recorre filtros de sucursal sobre un template y devuelve el primer resultado con datos.
     */
    private List<Map<String, Object>> listarEnTemplatesConFiltros(
            JdbcTemplate template,
            Set<String> filtros,
            Object fechaParam,
            Integer limite,
            Integer idTecnico,
            boolean incluirEliminados) {
        if (template == null) {
            return new ArrayList<>();
        }
        if (filtros == null || filtros.isEmpty()) {
            return new ArrayList<>();
        }

        try {
            for (String filtro : filtros) {
                List<Map<String, Object>> rows = listarEnTemplateSegunModo(
                        template,
                        fechaParam,
                        filtro,
                        limite,
                        idTecnico,
                        incluirEliminados
                );
                if (tieneDatos(rows)) {
                    return rows;
                }
            }
            return new ArrayList<>();
        } catch (DataAccessException ex) {
            return new ArrayList<>();
        }
    }

    /**
     * Ejecuta listado activo o listado con eliminados segun modo.
     */
    private List<Map<String, Object>> listarEnTemplateSegunModo(
            JdbcTemplate template,
            Object fechaParam,
            String sucursalParam,
            Integer limite,
            Integer idTecnico,
            boolean incluirEliminados) {
        if (incluirEliminados) {
            return listarConEliminadosEnTemplate(template, fechaParam, sucursalParam, limite, idTecnico);
        }
        return listarEnTemplate(template, fechaParam, sucursalParam, limite, idTecnico);
    }

    private boolean tieneDatos(List<Map<String, Object>> rows) {
        return rows != null && !rows.isEmpty();
    }

    private String normalizarSucursal(String sucursal) {
        return SucursalCanonicalizer.canonicalize(sucursal);
    }

    private ConformacionCuadrillaDbSupport.SucursalDbInfo resolverSucursalDbInfo(String sucursalParam) {
        if (sucursalParam == null) {
            return null;
        }
        return dbSupport.resolverSucursalDbInfo(sucursalParam);
    }

    private JdbcTemplate crearJdbcTemplateSucursal(ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo) {
        return dbSupport.crearJdbcTemplateSucursal(dbInfo);
    }

    private JdbcTemplate crearSucreJdbcTemplate() {
        return dbSupport.crearJdbcTemplateSucre();
    }

    private String normalizeText(String value) {
        return dbSupport.normalizeText(value);
    }

    private String asString(Object value) {
        return dbSupport.asString(value);
    }

    private boolean isSucre(String value) {
        return dbSupport.isSucre(value);
    }

    private boolean isBlank(String value) {
        return dbSupport.isBlank(value);
    }

    private String resolverSucursalNombreParaConsulta(String sucursalParam) {
        if (isBlank(sucursalParam)) {
            return sucursalParam;
        }
        ConformacionCuadrillaDbSupport.SucursalDbInfo dbInfo = resolverSucursalDbInfo(sucursalParam);
        if (dbInfo != null && !isBlank(dbInfo.getNombreSucursal())) {
            return dbInfo.getNombreSucursal().trim();
        }
        return sucursalParam;
    }
}
