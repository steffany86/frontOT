package com.example.TigoStarSystem.ot.repository;

import com.example.TigoStarSystem.auth.repository.SucursalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Repository
public class ListaOtRepository {
    private static final Logger logger = LoggerFactory.getLogger(ListaOtRepository.class);
    private static final DateTimeFormatter LEGACY_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final JdbcTemplate centralJdbcTemplate;
    private final JdbcTemplate localJdbcTemplate;
    private final SucursalRepository sucursalRepository;
    private final OtDbSupport dbSupport;

    public ListaOtRepository(
            @Qualifier("centralJdbcTemplate") JdbcTemplate centralJdbcTemplate,
            JdbcTemplate jdbcTemplate,
            SucursalRepository sucursalRepository,
            @Value("${spring.datasource.driver-class-name}") String dbDriver,
            @Value("${spring.datasource.url}") String mainDatasourceUrl,
            @Value("${app.sucre.datasource.url:}") String sucreDatasourceUrl,
            @Value("${auth.login.sucre.database:SucrePrueba}") String sucreDatabase,
            @Value("${app.sucre.datasource.username:${spring.datasource.username}}") String sucreUsername,
            @Value("${app.sucre.datasource.password:${spring.datasource.password}}") String sucrePassword,
            @Value("${app.datasource.params:encrypt=false;trustServerCertificate=true}") String dbParams) {
        this.centralJdbcTemplate = centralJdbcTemplate;
        this.localJdbcTemplate = jdbcTemplate;
        this.sucursalRepository = sucursalRepository;
        this.dbSupport = new OtDbSupport(
                sucursalRepository,
                dbDriver,
                mainDatasourceUrl,
                sucreDatasourceUrl,
                sucreDatabase,
                sucreUsername,
                sucrePassword,
                dbParams
        );
    }

    public List<Map<String, Object>> listarPorFecha(LocalDate fecha, String tecnico, Integer idSucursal) {
        return listarPorFecha(fecha, tecnico, idSucursal, null);
    }

    public List<Map<String, Object>> listarPorFecha(LocalDate fecha, String tecnico, Integer idSucursal, Integer idUsuario) {
        JdbcTemplate templateSucursal = template(idSucursal);
        JdbcTemplate templateOt = templateSucursal;
        Date fechaSql = Date.valueOf(fecha);
        String fechaLegacy = fecha.format(LEGACY_DATE_FORMAT);
        String tecnicoParam = isBlank(tecnico) ? null : tecnico.trim();
        LinkedHashMap<String, Map<String, Object>> mergedRows = new LinkedHashMap<>();

        if (tecnicoParam != null || (idUsuario != null && idUsuario > 0)) {
            List<String> salesforceDesdeUsuario = obtenerSalesforcePorIdUsuario(idUsuario, idSucursal, fecha);
            logger.info("{{\"evento\":\"LISTA_OT_FLUJO_USUARIO_CONFORMACION\",\"idUsuario\":{},\"idSucursal\":{},\"fecha\":\"{}\",\"tecnicoSesion\":\"{}\",\"salesforce\":{}}}",
                    idUsuario, idSucursal, fecha, tecnicoParam, salesforceDesdeUsuario);

            LinkedHashSet<String> tecnicoVariantesSet = new LinkedHashSet<>();
            for (String salesforce : salesforceDesdeUsuario) {
                tecnicoVariantesSet.addAll(buildTecnicoVariantes(salesforce));
            }
            if (tecnicoVariantesSet.isEmpty() && tecnicoParam != null) {
                tecnicoVariantesSet.addAll(buildTecnicoVariantes(tecnicoParam));
            }
            List<String> tecnicoVariantes = new ArrayList<>(tecnicoVariantesSet);
            for (String tecnicoVariante : tecnicoVariantes) {
                try {
                    List<Map<String, Object>> rows = templateOt.queryForList(
                            "EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO ?, ?",
                            fechaSql,
                            tecnicoVariante
                    );
                    logger.info("{{\"evento\":\"LISTA_OT_SP_EJECUCION\",\"fecha\":\"{}\",\"tecnicoEnviado\":\"{}\",\"rows\":{},\"formato\":\"sqlDate\"}}",
                            fechaSql, tecnicoVariante, rows == null ? 0 : rows.size());
                    mergeRows(mergedRows, rows);
                } catch (DataAccessException ex) {
                    if (!shouldFallback(ex)) {
                        throw ex;
                    }
                }
                try {
                    List<Map<String, Object>> rows = templateOt.queryForList(
                            "EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO ?, ?",
                            fechaLegacy,
                            tecnicoVariante
                    );
                    logger.info("{{\"evento\":\"LISTA_OT_SP_EJECUCION\",\"fecha\":\"{}\",\"tecnicoEnviado\":\"{}\",\"rows\":{},\"formato\":\"legacy\"}}",
                            fechaLegacy, tecnicoVariante, rows == null ? 0 : rows.size());
                    mergeRows(mergedRows, rows);
                } catch (DataAccessException ex) {
                    if (!shouldFallback(ex)) {
                        throw ex;
                    }
                }
            }

            if (mergedRows.isEmpty()) {
                mergeRows(mergedRows, listarDesdeCentralConTecnico(fechaSql, fechaLegacy, tecnicoParam, idSucursal, idUsuario));
                if (!mergedRows.isEmpty()) {
                    return new ArrayList<>(mergedRows.values());
                }
            }
        }

        try {
            List<Map<String, Object>> rows = templateOt.queryForList(
                    "EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO ?",
                    fechaSql
            );
            mergeRows(mergedRows, rows);
        } catch (DataAccessException ex) {
            if (!shouldFallback(ex)) {
                throw ex;
            }
        }
        try {
            List<Map<String, Object>> rows = templateOt.queryForList(
                    "EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO ?",
                    fechaLegacy
            );
            mergeRows(mergedRows, rows);
        } catch (DataAccessException ex) {
            if (!shouldFallback(ex)) {
                throw ex;
            }
        }

        if (!mergedRows.isEmpty()) {
            return new ArrayList<>(mergedRows.values());
        }

        try {
            List<Map<String, Object>> rows = templateOt.queryForList(
                    "EXEC dbo.sp_ObtenerListaOrdenesTrabajo_OTWEB ?",
                    fechaLegacy
            );
            mergeRows(mergedRows, rows);
            if (!mergedRows.isEmpty()) {
                return new ArrayList<>(mergedRows.values());
            }
        } catch (DataAccessException ex) {
            if (!shouldFallback(ex)) {
                throw ex;
            }
        }

        try {
            mergeRows(mergedRows, templateOt.queryForList(
                    "EXEC dbo.sp_ObtenerListaOrdenesTrabajo ?",
                    fechaLegacy
            ));
            return new ArrayList<>(mergedRows.values());
        } catch (DataAccessException ex) {
            if (!shouldFallback(ex)) {
                throw ex;
            }
            logger.warn("{{\"evento\":\"LISTA_OT_SP_FALLBACK_FINAL_ERROR\",\"fecha\":\"{}\",\"idSucursal\":{},\"error\":\"{}\"}}",
                    fechaSql, idSucursal, ex.getMessage());
            return new ArrayList<>(mergedRows.values());
        }
    }

    private List<Map<String, Object>> listarDesdeCentralConTecnico(
            Date fechaSql,
            String fechaLegacy,
            String tecnicoParam,
            Integer idSucursal,
            Integer idUsuario) {
        if (centralJdbcTemplate == null || fechaSql == null) {
            return Collections.emptyList();
        }

        LinkedHashMap<String, Map<String, Object>> merged = new LinkedHashMap<>();
        List<String> candidatosTecnico = new ArrayList<>();

        if (!isBlank(tecnicoParam)) {
            candidatosTecnico.addAll(buildTecnicoVariantes(tecnicoParam));
        }

        String sucursalNombre = resolveSucursalNombre(idSucursal);
        if (idUsuario != null && idUsuario > 0 && !isBlank(sucursalNombre)) {
            List<Integer> idsVendedor = obtenerIdsVendedorPorIdUsuario(idUsuario, idSucursal);
            for (Integer idVendedor : idsVendedor) {
                if (idVendedor == null || idVendedor <= 0) {
                    continue;
                }
                try {
                    String sql =
                            "SELECT TOP 5 salesforce, tecnico " +
                                    "FROM dbo.tbl_ConformacionCuadrillaDiario " +
                                    "WHERE id_tecnico = ? " +
                                    "AND CONVERT(date, fecha) = CONVERT(date, ?) " +
                                    "AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(sucursal, ''))), ' ', ''), '_', '')) = " +
                                    "LOWER(REPLACE(REPLACE(LTRIM(RTRIM(?)), ' ', ''), '_', '')) " +
                                    "AND ISNULL(e_eliminado, 0) = 0 " +
                                    "ORDER BY id DESC";
                    List<Map<String, Object>> rows = centralJdbcTemplate.queryForList(sql, idVendedor, fechaSql, sucursalNombre);
                    for (Map<String, Object> row : rows) {
                        String salesforce = asTrimmedString(row.get("salesforce"));
                        if (!isBlank(salesforce)) {
                            candidatosTecnico.addAll(buildTecnicoVariantes(salesforce));
                        }
                        String tecnico = asTrimmedString(row.get("tecnico"));
                        if (!isBlank(tecnico)) {
                            candidatosTecnico.addAll(buildTecnicoVariantes(tecnico));
                        }
                    }
                } catch (DataAccessException ignored) {
                    // Continuar con siguientes candidatos.
                }
            }
        }

        LinkedHashSet<String> candidatosUnicos = new LinkedHashSet<>();
        for (String candidato : candidatosTecnico) {
            if (!isBlank(candidato)) {
                candidatosUnicos.add(candidato.trim());
            }
        }

        for (String candidato : candidatosUnicos) {
            try {
                mergeRows(merged, centralJdbcTemplate.queryForList(
                        "EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO ?, ?",
                        fechaSql,
                        candidato
                ));
            } catch (DataAccessException ex) {
                if (!shouldFallback(ex)) {
                    throw ex;
                }
            }
            try {
                mergeRows(merged, centralJdbcTemplate.queryForList(
                        "EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO ?, ?",
                        fechaLegacy,
                        candidato
                ));
            } catch (DataAccessException ex) {
                if (!shouldFallback(ex)) {
                    throw ex;
                }
            }
        }

        return new ArrayList<>(merged.values());
    }

    private String resolveSucursalNombre(Integer idSucursal) {
        if (idSucursal == null || idSucursal <= 0 || sucursalRepository == null) {
            return null;
        }
        try {
            List<Map<String, Object>> rows = sucursalRepository.obtenerSucursales();
            if (rows == null || rows.isEmpty()) {
                return null;
            }
            for (Map<String, Object> row : rows) {
                Integer id = parsePositiveInt(firstNonNull(row, "id_sucursal", "idsucursal", "Id_Sucursal", "idSucursal", "IdSucursal"));
                if (id != null && id.equals(idSucursal)) {
                    return asTrimmedString(firstNonNull(row, "sucursal", "Sucursal", "nombre", "Nombre"));
                }
            }
        } catch (RuntimeException ignored) {
            return null;
        }
        return null;
    }

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

    private String asTrimmedString(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    public List<Integer> obtenerIdsVendedorPorIdUsuario(Integer idUsuario, Integer idSucursal) {
        if (idUsuario == null || idUsuario <= 0) {
            return Collections.emptyList();
        }
        JdbcTemplate target = template(idSucursal);

        String[] directVendorStatements = new String[] {};
        for (String sql : directVendorStatements) {
            try {
                List<Map<String, Object>> rows = target.queryForList(sql, idUsuario);
                if (rows == null || rows.isEmpty()) continue;
                LinkedHashSet<Integer> ids = new LinkedHashSet<>();
                for (Map<String, Object> row : rows) {
                    Integer parsed = parsePositiveInt(row.get("id_vendedor"));
                    if (parsed == null) parsed = parsePositiveInt(row.get("Id_Vendedor"));
                    if (parsed == null) parsed = parsePositiveInt(row.get("idvendedor"));
                    if (parsed != null) ids.add(parsed);
                }
                if (!ids.isEmpty()) {
                    return new ArrayList<>(ids);
                }
            } catch (DataAccessException ex) {
                // continuar a siguiente variante
            }
        }

        String[] statements = new String[] {
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_tecnico = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idtecnico = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ?",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ?",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_usuario = ?",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idusuario = ?",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.id_tecnico = ?",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE ut.idtecnico = ?",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_tecnico = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idtecnico = ? AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ?",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ?",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_usuario = ?",
                "SELECT DISTINCT CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idusuario = ?",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.id_tecnico = ?",
                "SELECT DISTINCT CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE ut.idtecnico = ?",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Usuario = ? AND ISNULL(ut.E_Eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdUsuario = ? AND ISNULL(ut.E_Eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Tecnico = ? AND ISNULL(ut.E_Eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdTecnico = ? AND ISNULL(ut.E_Eliminado, 0) = 0",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Usuario = ?",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdUsuario = ?",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.Id_Tecnico = ?",
                "SELECT DISTINCT CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE ut.IdTecnico = ?"
        };

        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = target.queryForList(sql, idUsuario);
                if (rows == null || rows.isEmpty()) {
                    continue;
                }
                LinkedHashSet<Integer> ids = new LinkedHashSet<>();
                for (Map<String, Object> row : rows) {
                    Integer parsed = parsePositiveInt(row.get("id_vendedor"));
                    if (parsed == null) {
                        parsed = parsePositiveInt(row.get("Id_Vendedor"));
                    }
                    if (parsed == null) {
                        parsed = parsePositiveInt(row.get("idvendedor"));
                    }
                    if (parsed != null) {
                        ids.add(parsed);
                    }
                }
                if (!ids.isEmpty()) {
                    return new ArrayList<>(ids);
                }
            } catch (DataAccessException ex) {
                // Intentar siguiente variante de esquema/tabla.
            }
        }

        return Collections.emptyList();
    }

    public List<String> obtenerSalesforcePorIdUsuario(Integer idUsuario, Integer idSucursal) {
        return obtenerSalesforcePorIdUsuario(idUsuario, idSucursal, LocalDate.now());
    }

    public List<String> obtenerSalesforcePorIdUsuario(Integer idUsuario, Integer idSucursal, LocalDate fecha) {
        if (idUsuario == null || idUsuario <= 0) {
            return Collections.emptyList();
        }
        if (centralJdbcTemplate == null) {
            logger.info("{{\"evento\":\"LISTA_OT_SALESFORCE_CONFORMACION_SIN_CENTRAL\",\"idUsuario\":{},\"idSucursal\":{}}}",
                    idUsuario, idSucursal);
            return Collections.emptyList();
        }
        List<Integer> idsVendedor = obtenerIdsVendedorPorIdUsuario(idUsuario, idSucursal);
        if (idsVendedor == null || idsVendedor.isEmpty()) {
            logger.info("{{\"evento\":\"LISTA_OT_SALESFORCE_CONFORMACION_SIN_VENDEDOR\",\"idUsuario\":{},\"idSucursal\":{}}}",
                    idUsuario, idSucursal);
            return Collections.emptyList();
        }

        LocalDate fechaConsulta = fecha == null ? LocalDate.now() : fecha;
        Date fechaSql = Date.valueOf(fechaConsulta);
        String sucursalNombre = resolveSucursalNombre(idSucursal);
        if (isBlank(sucursalNombre)) {
            logger.info("{{\"evento\":\"LISTA_OT_SALESFORCE_CONFORMACION_SIN_SUCURSAL\",\"idUsuario\":{},\"idSucursal\":{},\"fecha\":\"{}\",\"idsVendedor\":{}}}",
                    idUsuario, idSucursal, fechaConsulta, idsVendedor);
            return Collections.emptyList();
        }
        String sqlBase =
                "SELECT DISTINCT LTRIM(RTRIM(ISNULL(salesforce, ''))) AS salesForce " +
                "FROM dbo.tbl_ConformacionCuadrillaDiario " +
                "WHERE id_tecnico = ? " +
                "AND CONVERT(date, fecha) = CONVERT(date, ?) " +
                "AND ISNULL(e_eliminado, 0) = 0 ";
        try {
            LinkedHashSet<String> salesforceList = new LinkedHashSet<>();
            for (Integer idVendedor : idsVendedor) {
                if (idVendedor == null || idVendedor <= 0) {
                    continue;
                }
                List<Map<String, Object>> rows = centralJdbcTemplate.queryForList(
                        sqlBase +
                                "AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(sucursal, ''))), ' ', ''), '_', '')) = " +
                                "LOWER(REPLACE(REPLACE(LTRIM(RTRIM(?)), ' ', ''), '_', ''))",
                        idVendedor,
                        fechaSql,
                        sucursalNombre
                );
                for (Map<String, Object> row : rows) {
                    String salesForce = asTrimmedString(row.get("salesForce"));
                    if (!isBlank(salesForce)) {
                        salesforceList.add(salesForce);
                    }
                }
            }
            if (salesforceList.isEmpty()) {
                logger.info("{{\"evento\":\"LISTA_OT_SALESFORCE_CONFORMACION_VACIO\",\"idUsuario\":{},\"idSucursal\":{},\"fecha\":\"{}\",\"idsVendedor\":{}}}",
                        idUsuario, idSucursal, fechaConsulta, idsVendedor);
                return Collections.emptyList();
            }
            logger.info("{{\"evento\":\"LISTA_OT_SALESFORCE_CONFORMACION_OK\",\"idUsuario\":{},\"idSucursal\":{},\"fecha\":\"{}\",\"idsVendedor\":{},\"salesforce\":{}}}",
                    idUsuario, idSucursal, fechaConsulta, idsVendedor, salesforceList);
            return new ArrayList<>(salesforceList);
        } catch (DataAccessException ex) {
            logger.warn("{{\"evento\":\"LISTA_OT_SALESFORCE_CONFORMACION_ERROR\",\"idUsuario\":{},\"idSucursal\":{},\"fecha\":\"{}\",\"error\":\"{}\"}}",
                    idUsuario, idSucursal, fechaConsulta, ex.getMessage());
            return Collections.emptyList();
        }
    }

    public List<Map<String, Object>> listarVentasManualPorFechaYVendedores(
            LocalDate fecha,
            List<Integer> idsVendedor,
            Integer idUsuario,
            Integer idSucursal) {
        if (fecha == null) {
            return Collections.emptyList();
        }

        boolean usuarioValido = idUsuario != null && idUsuario > 0;
        List<Integer> idsValidos = new ArrayList<>();
        if (idsVendedor != null) {
            for (Integer id : idsVendedor) {
                if (id != null && id > 0 && !idsValidos.contains(id)) {
                    idsValidos.add(id);
                }
            }
        }
        boolean vendedoresValidos = !idsValidos.isEmpty();
        if (!vendedoresValidos && !usuarioValido) {
            return Collections.emptyList();
        }

        StringBuilder filtroVendedor = new StringBuilder();
        if (vendedoresValidos) {
            for (int i = 0; i < idsValidos.size(); i++) {
                if (i > 0) {
                    filtroVendedor.append(", ");
                }
                filtroVendedor.append("?");
            }
        }

        List<String> filtrosUsuario = new ArrayList<>();
        if (usuarioValido) {
            filtrosUsuario.add("v.Id_Usuario = ?");
            filtrosUsuario.add("v.id_usuario = ?");
            filtrosUsuario.add("v.IdUsuario = ?");
            filtrosUsuario.add("v.idusuario = ?");
        }

        List<String> filtrosCombinados = new ArrayList<>();
        if (vendedoresValidos) {
            filtrosCombinados.add("v.Id_Vendedor IN (" + filtroVendedor + ")");
            filtrosCombinados.add("v.id_vendedor IN (" + filtroVendedor + ")");
            filtrosCombinados.add("v.IdVendedor IN (" + filtroVendedor + ")");
            filtrosCombinados.add("v.idvendedor IN (" + filtroVendedor + ")");
        }
        filtrosCombinados.addAll(filtrosUsuario);

        RuntimeException lastError = null;
        JdbcTemplate target = template(idSucursal);
        for (String filtro : filtrosCombinados) {
            String sql = "SELECT " +
                    "v.Id_Venta AS id, " +
                    "v.Id_Venta AS idVenta, " +
                    "v.Id_Venta AS id_venta, " +
                    "v.OrdenTrabajo AS codigo, " +
                    "v.OrdenTrabajo AS Codigo, " +
                    "v.OrdenTrabajo AS ordenTrabajo, " +
                    "v.OrdenTrabajo AS OT, " +
                    "v.CodigoCliente AS cliente_nro, " +
                    "v.CodigoCliente AS Cliente_Nro, " +
                    "v.CodigoCliente AS codigo_cliente, " +
                    "v.CodigoCliente AS codigoCliente, " +
                    "v.Fecha_Ejecucion AS fecha, " +
                    "v.Fecha_Ejecucion AS Fecha, " +
                    "v.Fecha_Ejecucion AS fechaEjecucion, " +
                    "v.Fecha_Ejecucion AS Fecha_Ejecucion, " +
                    "v.Id_Vendedor AS id_vendedor, " +
                    "v.Id_Vendedor AS idVendedor, " +
                    "v.Id_Vendedor AS Id_Vendedor, " +
                    "v.Id_TipoServicio AS id_tiposervicio, " +
                    "v.Id_TipoServicio AS idTipoServicio, " +
                    "ts.Nombre AS tipoServicio, " +
                    "v.Id_Estado AS id_estado, " +
                    "v.Id_Estado AS idEstado, " +
                    "e.Nombre AS estado, " +
                    "e.Nombre AS Estado, " +
                    "e.Nombre AS CIERRE, " +
                    "v.Origen AS origen, " +
                    "v.Origen AS Origen " +
                    "FROM dbo.tbl_Venta v " +
                    "LEFT JOIN dbo.tbl_tiposervicio ts ON ts.Id_TipoServicio = v.Id_TipoServicio " +
                    "LEFT JOIN dbo.tbl_estado e ON e.Id_Estado = v.Id_Estado " +
                    "WHERE CONVERT(DATE, v.Fecha_Ejecucion) = ? " +
                    "AND ISNULL(v.E_Eliminado, 0) = 0 " +
                    "AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'MANUAL' " +
                    "AND " + filtro + " " +
                    "ORDER BY v.Id_Venta DESC";

            List<Object> params = new ArrayList<>();
            params.add(Date.valueOf(fecha));
            if (filtro.contains("IN (")) {
                params.addAll(idsValidos);
            } else {
                params.add(idUsuario);
            }

            try {
                List<Map<String, Object>> rows = target.queryForList(sql, params.toArray());
                if (rows != null && !rows.isEmpty()) {
                    return rows;
                }
            } catch (DataAccessException ex) {
                lastError = ex;
            }
        }

        if (lastError != null && vendedoresValidos) {
            StringBuilder inClause = new StringBuilder();
            for (int i = 0; i < idsValidos.size(); i++) {
                if (i > 0) {
                    inClause.append(", ");
                }
                inClause.append("?");
            }
            String sqlFallback = "SELECT " +
                    "v.Id_Venta AS id, " +
                    "v.Id_Venta AS idVenta, " +
                    "v.Id_Venta AS id_venta, " +
                    "v.OrdenTrabajo AS codigo, " +
                    "v.OrdenTrabajo AS Codigo, " +
                    "v.OrdenTrabajo AS ordenTrabajo, " +
                    "v.OrdenTrabajo AS OT, " +
                    "v.CodigoCliente AS cliente_nro, " +
                    "v.CodigoCliente AS Cliente_Nro, " +
                    "v.CodigoCliente AS codigo_cliente, " +
                    "v.CodigoCliente AS codigoCliente, " +
                    "v.Fecha_Ejecucion AS fecha, " +
                    "v.Fecha_Ejecucion AS Fecha, " +
                    "v.Fecha_Ejecucion AS fechaEjecucion, " +
                    "v.Fecha_Ejecucion AS Fecha_Ejecucion, " +
                    "v.Id_Vendedor AS id_vendedor, " +
                    "v.Id_Vendedor AS idVendedor, " +
                    "v.Id_Vendedor AS Id_Vendedor, " +
                    "v.Id_TipoServicio AS id_tiposervicio, " +
                    "v.Id_TipoServicio AS idTipoServicio, " +
                    "ts.Nombre AS tipoServicio, " +
                    "v.Id_Estado AS id_estado, " +
                    "v.Id_Estado AS idEstado, " +
                    "e.Nombre AS estado, " +
                    "e.Nombre AS Estado, " +
                    "e.Nombre AS CIERRE, " +
                    "v.Origen AS origen, " +
                    "v.Origen AS Origen " +
                    "FROM dbo.tbl_Venta v " +
                    "LEFT JOIN dbo.tbl_tiposervicio ts ON ts.Id_TipoServicio = v.Id_TipoServicio " +
                    "LEFT JOIN dbo.tbl_estado e ON e.Id_Estado = v.Id_Estado " +
                    "WHERE CONVERT(DATE, v.Fecha_Ejecucion) = ? " +
                    "AND ISNULL(v.E_Eliminado, 0) = 0 " +
                    "AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'MANUAL' " +
                    "AND v.Id_Vendedor IN (" + inClause + ") " +
                    "ORDER BY v.Id_Venta DESC";
            List<Object> params = new ArrayList<>();
            params.add(Date.valueOf(fecha));
            params.addAll(idsValidos);
            return target.queryForList(sqlFallback, params.toArray());
        }

        return Collections.emptyList();
    }

    public List<Map<String, Object>> listarVentasManualPorFecha(
            LocalDate fecha,
            Integer idSucursal) {
        if (fecha == null) {
            return Collections.emptyList();
        }
        String sql = "SELECT " +
                "v.Id_Venta AS idVenta, " +
                "v.Id_Venta AS Id_Venta, " +
                "v.Id_Venta AS id_venta, " +
                "v.OrdenTrabajo AS OT, " +
                "v.OrdenTrabajo AS ordenTrabajo, " +
                "v.OrdenTrabajo AS OrdenTrabajo, " +
                "v.CodigoCliente AS codigoCliente, " +
                "v.CodigoCliente AS CodigoCliente, " +
                "v.CodigoCliente AS cliente_nro, " +
                "v.CodigoCliente AS Cliente_Nro " +
                "FROM dbo.tbl_Venta v " +
                "WHERE CONVERT(DATE, v.Fecha_Ejecucion) = ? " +
                "AND ISNULL(v.E_Eliminado, 0) = 0 " +
                "AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'MANUAL'";
        return template(idSucursal).queryForList(sql, Date.valueOf(fecha));
    }

    public int promoverVentasManualAOtWebPorAgenda(
            LocalDate fecha,
            Set<String> agendaKeys,
            List<Integer> idsVendedor,
            Integer idUsuario,
            Integer idSucursal) {
        // Deshabilitado por requerimiento funcional:
        // no modificar automaticamente el campo Origen.
        return 0;
    }

    public int promoverVentasManualAOtWebPorIds(
            List<Long> idsVenta,
            Integer idSucursal) {
        // Deshabilitado por requerimiento funcional:
        // no modificar automaticamente el campo Origen.
        return 0;
    }

    private JdbcTemplate template(Integer idSucursal) {
        return dbSupport.resolveTemplate(idSucursal, localJdbcTemplate);
    }

    private boolean shouldFallback(DataAccessException ex) {
        Throwable root = ex.getMostSpecificCause();
        String message = root == null ? ex.getMessage() : root.getMessage();
        if (message == null) {
            return false;
        }
        String normalized = message.toLowerCase(Locale.ROOT);
        return normalized.contains("esperaba el parametro")
                || normalized.contains("esperaba el parámetro")
                || normalized.contains("expects the parameter")
                || normalized.contains("expects parameter")
                || normalized.contains("too many arguments")
                || normalized.contains("demasiados argumentos")
                || normalized.contains("could not find stored procedure")
                || normalized.contains("no se encontro el procedimiento")
                || normalized.contains("no se encontró el procedimiento")
                || normalized.contains("no se encuentra el procedimiento")
                || normalized.contains("invalid object name")
                || normalized.contains("nombre de objeto no valido")
                || normalized.contains("nombre de objeto no válido");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private List<String> buildTecnicoVariantes(String tecnico) {
        if (isBlank(tecnico)) {
            return Collections.emptyList();
        }
        LinkedHashSet<String> variantes = new LinkedHashSet<>();
        String base = tecnico.trim();
        variantes.add(base);

        String sinPuntuacion = base
                .replace(".", " ")
                .replace(",", " ")
                .replace(";", " ")
                .replace(":", " ")
                .replace("-", " ")
                .replace("_", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (!isBlank(sinPuntuacion)) {
            variantes.add(sinPuntuacion);
        }

        String sinPuntoFinal = base.replaceAll("[\\p{Punct}]+$", "").trim();
        if (!isBlank(sinPuntoFinal)) {
            variantes.add(sinPuntoFinal);
        }

        return new ArrayList<>(variantes);
    }

    private Integer parsePositiveInt(Object value) {
        if (value == null) {
            return null;
        }
        try {
            Integer parsed = value instanceof Number
                    ? ((Number) value).intValue()
                    : Integer.parseInt(String.valueOf(value).trim());
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private void mergeRows(
            LinkedHashMap<String, Map<String, Object>> acc,
            List<Map<String, Object>> rows) {
        if (acc == null || rows == null || rows.isEmpty()) {
            return;
        }
        for (Map<String, Object> row : rows) {
            if (row == null || row.isEmpty()) {
                continue;
            }
            String signature = buildRowSignature(row);
            if (!signature.isEmpty() && !acc.containsKey(signature)) {
                acc.put(signature, row);
            }
        }
    }

    private String buildRowSignature(Map<String, Object> row) {
        List<String> parts = new ArrayList<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            String key = normalizeKey(entry.getKey());
            String value = normalizeSignatureValue(entry.getValue());
            parts.add(key + "=" + value);
        }
        Collections.sort(parts);
        return String.join("|", parts);
    }

    private String normalizeSignatureValue(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value).trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeKey(String key) {
        if (key == null) {
            return "";
        }
        return key.replace("_", "")
                .replace("-", "")
                .replace(" ", "")
                .toLowerCase(Locale.ROOT);
    }

    private int[] parseAgendaKey(String key) {
        String[] parts = key.split("\\|");
        if (parts.length != 2) {
            return null;
        }
        Integer ordenTrabajo = parsePositiveInt(parts[0]);
        Integer codigoCliente = parsePositiveInt(parts[1]);
        if (ordenTrabajo == null || codigoCliente == null) {
            return null;
        }
        return new int[] { ordenTrabajo, codigoCliente };
    }
}
