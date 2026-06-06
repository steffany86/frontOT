package com.example.TigoStarSystem.supervision.repository;

import com.example.TigoStarSystem.config.DbConnectionManager;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Repository
public class SupervisionRepository {
    private static final String SP_LISTAR =
            "EXEC dbo.spx_ListarSupervisionManual ?, ?, ?, ?";
    private static final String SP_LISTAR_PENDIENTES =
            "EXEC dbo.spx_ListarSupervisionPendiente ?, ?, ?, ?";
    private static final String SP_OBTENER_DETALLE =
            "EXEC dbo.spx_ObtenerSupervisionManualPorId ?, ?";
    private static final String SP_REGISTRAR =
            "EXEC dbo.spx_RegistrarSupervisionManual ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
    private static final String SP_REGISTRAR_PENDIENTE =
            "EXEC dbo.spx_RegistrarSupervisionPendiente ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
    private static final String SP_TECNICOS_AGENDA_SUP =
            "EXEC dbo.SP_TecnicosAgendaSup ?, ?, ?";
    private static final String SP_LISTAR_SUPERVISORES =
            "EXEC dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb";
    private static final String SP_LISTAR_SUPERVISORES_ALT =
            "EXEC spx_ObtenerSupervisoresConformacionCuadrillaWeb";
    private static final String SP_LISTAR_SUPERVISORES_ALT2 =
            "EXEC dbo.spx_ObtenerSupervisores";
    private static final String SP_LISTAR_SUPERVISORES_ALT3 =
            "EXEC spx_ObtenerSupervisores";

    private final JdbcTemplate tigohogarJdbcTemplate;
    private final DbConnectionManager dbConnectionManager;
    private final String dbUsername;
    private final String dbPassword;

    public SupervisionRepository(
            @Qualifier("tigohogarJdbcTemplate") JdbcTemplate tigohogarJdbcTemplate,
            DbConnectionManager dbConnectionManager,
            @Value("${spring.datasource.username}") String dbUsername,
            @Value("${spring.datasource.password}") String dbPassword
    ) {
        this.tigohogarJdbcTemplate = tigohogarJdbcTemplate;
        this.dbConnectionManager = dbConnectionManager;
        this.dbUsername = dbUsername;
        this.dbPassword = dbPassword;
    }

    public List<Map<String, Object>> listar(String idSupervisor, java.time.LocalDate fechaDesde, java.time.LocalDate fechaHasta, Integer limite) {
        return tigohogarJdbcTemplate.queryForList(
                SP_LISTAR,
                idSupervisor,
                fechaDesde == null ? null : Date.valueOf(fechaDesde),
                fechaHasta == null ? null : Date.valueOf(fechaHasta),
                resolveLimit(limite)
        );
    }

    public List<Map<String, Object>> listarPendientes(String idSupervisor, java.time.LocalDate fechaDesde, java.time.LocalDate fechaHasta, Integer limite) {
        return tigohogarJdbcTemplate.queryForList(
                SP_LISTAR_PENDIENTES,
                idSupervisor,
                fechaDesde == null ? null : Date.valueOf(fechaDesde),
                fechaHasta == null ? null : Date.valueOf(fechaHasta),
                resolveLimit(limite)
        );
    }

    public Map<String, Object> obtenerDetalle(String idSupervision, String idSupervisor) {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(SP_OBTENER_DETALLE, idSupervision, idSupervisor);
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        return rows.get(0);
    }

    public Map<String, Object> enriquecerDetalleConNombres(Map<String, Object> detalle, String sucursal) {
        if (detalle == null || detalle.isEmpty()) {
            return detalle;
        }
        Map<Integer, String> usuarios = cargarUsuariosDesdeSucursalPreferida(sucursal);
        if (usuarios.isEmpty()) {
            usuarios = cargarUsuariosDesdeTecnicosSp();
        }
        JdbcTemplate sucursalTemplate = null;
        try {
            sucursalTemplate = resolveJdbcTemplateBySucursalNombre(sucursal);
        } catch (Exception ignored) {}

        Integer idTecnicoPrincipal = toInteger(findValue(
                detalle,
                "idTecnicoPrincipal",
                "id_tecnico_principal",
                "id_tecnico",
                "idTecnico"
        ));
        Integer idTecnicoAuxiliar = toInteger(findValue(
                detalle,
                "idTecnicoAuxiliar",
                "id_tecnico_auxiliar",
                "id_auxiliar",
                "idAuxiliar"
        ));
        Integer idSupervisor = toInteger(findValue(
                detalle,
                "idSupervisor",
                "id_supervisor",
                "idUsuarioSupervisor",
                "id_usuariosupervisor",
                "supervisor"
        ));

        String nombrePrincipal = resolveNombrePersona(idTecnicoPrincipal, usuarios, sucursalTemplate);
        String nombreAuxiliar = resolveNombrePersona(idTecnicoAuxiliar, usuarios, sucursalTemplate);
        String nombreSupervisor = resolveNombrePersona(idSupervisor, usuarios, sucursalTemplate);

        if (nombrePrincipal != null) {
            detalle.put("tecnicoPrincipalNombre", nombrePrincipal);
            detalle.put("tecnicoNombre", nombrePrincipal);
            if (isNumericText(toText(findValue(detalle, "tecnicoPrincipal", "tecnico", "tecnico_nombre")))) {
                detalle.put("tecnicoPrincipal", nombrePrincipal);
                detalle.put("tecnico", nombrePrincipal);
            }
        }
        if (nombreAuxiliar != null) {
            detalle.put("tecnicoAuxiliarNombre", nombreAuxiliar);
            detalle.put("auxiliarNombre", nombreAuxiliar);
            if (isNumericText(toText(findValue(detalle, "tecnicoAuxiliar", "auxiliar", "auxiliar_nombre")))) {
                detalle.put("tecnicoAuxiliar", nombreAuxiliar);
                detalle.put("auxiliar", nombreAuxiliar);
            }
        }
        if (nombreSupervisor != null) {
            detalle.put("supervisorNombre", nombreSupervisor);
            if (isNumericText(toText(findValue(detalle, "supervisor", "nombreSupervisor")))) {
                detalle.put("supervisor", nombreSupervisor);
            }
        }
        return detalle;
    }

    public String registrar(
            Integer idSupervisor,
            String idTecnicoPrincipal,
            String idTecnicoAuxiliar,
            String idTipoSupervision,
            String idTipoTrabajo,
            String idTipoPenalizacion,
            String supervisionPor,
            String tecnologia,
            String codigo,
            String ordenTrabajo,
            String tipoRevision,
            String fotoBoletaSupervision,
            String fotoCanalesPilos,
            String fotoNivelesDocsis,
            String fotoMedicionRuido,
            String fotoBarridoCanales,
            String fotoObservacion1,
            String fotoObservacion2,
            String fotoObservacion3,
            String fotoObservacion4,
            String observacion,
            String descripcionAdicionalObservacion,
            String ubicacion) {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                SP_REGISTRAR,
                idSupervisor,
                trimToNull(idTecnicoPrincipal),
                trimToNull(idTecnicoAuxiliar),
                trimToNull(idTipoSupervision),
                trimToNull(idTipoTrabajo),
                trimToNull(idTipoPenalizacion),
                trimToNull(supervisionPor),
                trimToNull(tecnologia),
                trimToNull(codigo),
                trimToNull(ordenTrabajo),
                trimToNull(tipoRevision),
                trimToNull(fotoBoletaSupervision),
                trimToNull(fotoCanalesPilos),
                trimToNull(fotoNivelesDocsis),
                trimToNull(fotoMedicionRuido),
                trimToNull(fotoBarridoCanales),
                trimToNull(fotoObservacion1),
                trimToNull(fotoObservacion2),
                trimToNull(fotoObservacion3),
                trimToNull(fotoObservacion4),
                trimToNull(observacion),
                trimToNull(descripcionAdicionalObservacion),
                trimToNull(ubicacion)
        );

        if (rows != null && !rows.isEmpty()) {
            Map<String, Object> row = rows.get(0);
            Object id = findValue(row, "idSupervision", "id_supervision", "Id_Supervision");
            if (id == null && !row.isEmpty()) {
                id = row.values().iterator().next();
            }
            if (id != null) {
                String text = String.valueOf(id).trim();
                if (!text.isEmpty()) {
                    return text;
                }
            }
        }

        throw new IllegalStateException("No se pudo obtener Id_Supervision generado.");
    }

    public List<Map<String, Object>> listarTiposSupervision() {
        return tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.SP_Supervision_ListarTiposSupervision"
        );
    }

    public List<Map<String, Object>> listarTiposTrabajo() {
        return tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.SP_Supervision_ListarTiposTrabajo"
        );
    }

    public List<Map<String, Object>> listarTiposPenalizacion() {
        return tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.SP_Supervision_ListarTiposPenalizacion"
        );
    }

    public List<Map<String, Object>> listarTecnicosPorSupervisor(Integer idSupervisor, String sucursal) {
        return listarTecnicosPorSupervisor(idSupervisor, sucursal, null);
    }

    public List<Map<String, Object>> listarTecnicosPorSupervisor(Integer idSupervisor, String sucursal, String supervisorNombre) {
        JdbcTemplate central = dbConnectionManager.connDb("bdcontrolordenes");
        List<Map<String, Object>> ids = new ArrayList<>();
        ids.addAll(cargarTecnicosAgendaSup(central, idSupervisor, sucursal));
        if (ids.isEmpty()) {
            ids.addAll(cargarTecnicosDesdeConformacionDiariaPorEncargado(central, idSupervisor, sucursal));
        }
        ids = dedupeTecnicos(ids);
        JdbcTemplate sucursalTemplate = resolveJdbcTemplateBySucursalNombre(sucursal);
        return enriquecerTecnicosDesdeSucursal(ids, sucursalTemplate);
    }

    private List<Map<String, Object>> cargarTecnicosAgendaSup(
            JdbcTemplate central,
            Integer idSupervisor,
            String sucursal) {
        if (central == null || idSupervisor == null || idSupervisor <= 0) {
            return new ArrayList<>();
        }
        try {
            return central.queryForList(
                    SP_TECNICOS_AGENDA_SUP,
                    idSupervisor,
                    trimToNull(sucursal),
                    1
            );
        } catch (Exception ignored) {
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> cargarTecnicosDesdeConformacionDiariaPorEncargado(
            JdbcTemplate central,
            Integer idSupervisor,
            String sucursal) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (central == null || idSupervisor == null || idSupervisor <= 0) {
            return out;
        }
        String sucursalNorm = trimToNull(sucursal);
        String[] sqlCandidates = new String[] {
                "SELECT DISTINCT x.idTecnico, x.tecnico " +
                        "FROM (" +
                        "  SELECT id_tecnico AS idTecnico, tecnico AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND id_encargado=? AND (? IS NULL OR LTRIM(RTRIM(ISNULL(sucursal,''))) = LTRIM(RTRIM(?))) " +
                        "  UNION " +
                        "  SELECT id_tecnico_auxiliar AS idTecnico, auxiliar AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND id_encargado=? AND (? IS NULL OR LTRIM(RTRIM(ISNULL(sucursal,''))) = LTRIM(RTRIM(?)))" +
                        ") x WHERE x.idTecnico IS NOT NULL",
                "SELECT DISTINCT x.idTecnico, x.tecnico " +
                        "FROM (" +
                        "  SELECT idTecnico AS idTecnico, tecnico AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idEncargado=? AND (? IS NULL OR LTRIM(RTRIM(ISNULL(sucursal,''))) = LTRIM(RTRIM(?))) " +
                        "  UNION " +
                        "  SELECT idTecnicoAuxiliar AS idTecnico, auxiliar AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idEncargado=? AND (? IS NULL OR LTRIM(RTRIM(ISNULL(sucursal,''))) = LTRIM(RTRIM(?)))" +
                        ") x WHERE x.idTecnico IS NOT NULL",
                "SELECT DISTINCT x.idTecnico, x.tecnico " +
                        "FROM (" +
                        "  SELECT id_tecnico AS idTecnico, tecnico AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idUsuarioSupervisor=? " +
                        "  UNION " +
                        "  SELECT id_tecnicoAuxiliar AS idTecnico, auxiliar AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idUsuarioSupervisor=?" +
                        ") x WHERE x.idTecnico IS NOT NULL",
                "SELECT DISTINCT x.idTecnico, x.tecnico " +
                        "FROM (" +
                        "  SELECT id_tecnico AS idTecnico, tecnico AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND id_encargado=? " +
                        "  UNION " +
                        "  SELECT id_tecnico_auxiliar AS idTecnico, auxiliar AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND id_encargado=?" +
                        ") x WHERE x.idTecnico IS NOT NULL",
                "SELECT DISTINCT x.idTecnico, x.tecnico " +
                        "FROM (" +
                        "  SELECT id_tecnico AS idTecnico, tecnico AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idUsuarioSupervisor=? AND (? IS NULL OR LTRIM(RTRIM(ISNULL(sucursal,''))) = LTRIM(RTRIM(?))) " +
                        "  UNION " +
                        "  SELECT id_tecnicoAuxiliar AS idTecnico, auxiliar AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idUsuarioSupervisor=? AND (? IS NULL OR LTRIM(RTRIM(ISNULL(sucursal,''))) = LTRIM(RTRIM(?)))" +
                        ") x WHERE x.idTecnico IS NOT NULL",
                "SELECT DISTINCT x.idTecnico, x.tecnico " +
                        "FROM (" +
                        "  SELECT id_tecnico AS idTecnico, tecnico AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idUsuarioSupervisor=? " +
                        "  UNION " +
                        "  SELECT id_tecnicoAuxiliar AS idTecnico, auxiliar AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idUsuarioSupervisor=?" +
                        ") x WHERE x.idTecnico IS NOT NULL",
                "SELECT DISTINCT x.idTecnico, x.tecnico " +
                        "FROM (" +
                        "  SELECT idTecnico AS idTecnico, tecnico AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idEncargado=? " +
                        "  UNION " +
                        "  SELECT idTecnicoAuxiliar AS idTecnico, auxiliar AS tecnico FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado,0)=0 AND CONVERT(date, fecha)=CONVERT(date, GETDATE()) " +
                        "    AND idEncargado=?" +
                        ") x WHERE x.idTecnico IS NOT NULL"
        };
        for (String sql : sqlCandidates) {
            try {
                List<Map<String, Object>> rows;
                if (sql.contains("? IS NULL")) {
                    rows = central.queryForList(sql, idSupervisor, sucursalNorm, sucursalNorm, idSupervisor, sucursalNorm, sucursalNorm);
                } else {
                    rows = central.queryForList(sql, idSupervisor, idSupervisor);
                }
                if (rows != null && !rows.isEmpty()) {
                    out.addAll(rows);
                    break;
                }
            } catch (Exception ignored) {
                // probar siguiente variante de columnas
            }
        }
        return out;
    }

    private List<Map<String, Object>> dedupeTecnicos(List<Map<String, Object>> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        Set<Integer> seen = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            Integer id = toInteger(findValue(row, "idTecnico", "id_tecnico", "id_vendedor", "idUsuarioTecnico", "id"));
            if (id == null || id <= 0 || !seen.add(id)) {
                continue;
            }
            Map<String, Object> mapped = new LinkedHashMap<>();
            mapped.put("idTecnico", id);
            mapped.put("id_tecnico", id);
            String nombre = toText(findValue(row, "tecnico", "Tecnico", "nombre", "Nombre"));
            if (nombre != null) {
                mapped.put("tecnico", nombre);
            }
            String codigo = toText(findValue(row, "codigo", "Codigo", "codEmpleado", "CodEmpleado", "cod_empleado"));
            if (codigo != null) {
                mapped.put("codigo", codigo);
                mapped.put("codEmpleado", codigo);
                mapped.put("cod_empleado", codigo);
            }
            out.add(mapped);
        }
        return out;
    }

    public List<Map<String, Object>> listarIniciosJornadaPendientesSupervisor(Integer idSupervisor, String sucursal) {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.SP_Inicio_ListarPendientesSupervisorHoy ?",
                idSupervisor
        );
        return enriquecerNombresTecnicos(rows, sucursal);
    }

    public List<Map<String, Object>> listarIniciosJornadaPendientesTodos() {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.SP_Inicio_ListarPendientesHoyTodos"
        );
        return enriquecerNombresTecnicos(rows, null);
    }

    public List<Map<String, Object>> listarIniciosJornadaConfirmadosHoyTodos() {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.SP_Inicio_ListarConfirmadosHoyTodos"
        );
        return enriquecerNombresTecnicos(rows, null);
    }

    public List<Map<String, Object>> listarIniciosJornadaConfirmadosHoySupervisor(Integer idSupervisor, String sucursal) {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                "EXEC dbo.SP_Inicio_ListarConfirmadosSupervisorHoy ?",
                idSupervisor
        );
        return enriquecerNombresTecnicos(rows, sucursal);
    }

    public int aprobarInicioJornada(Integer idSupervisor, Integer idInicio) {
        Integer updated = tigohogarJdbcTemplate.queryForObject(
                "EXEC dbo.SP_Inicio_AprobarSupervisor ?, ?",
                Integer.class,
                idInicio,
                idSupervisor
        );
        return updated == null ? 0 : updated;
    }

    public int rechazarInicioJornada(Integer idSupervisor, Integer idInicio) {
        Integer updated = tigohogarJdbcTemplate.queryForObject(
                "EXEC dbo.SP_Inicio_RechazarSupervisor ?, ?",
                Integer.class,
                idInicio,
                idSupervisor
        );
        return updated == null ? 0 : updated;
    }

    public int aprobarInicioJornadaPorId(Integer idInicio) {
        Integer updated = tigohogarJdbcTemplate.queryForObject(
                "EXEC dbo.SP_Inicio_AprobarPorIdHoy ?",
                Integer.class,
                idInicio
        );
        return updated == null ? 0 : updated;
    }

    public int rechazarInicioJornadaPorId(Integer idInicio) {
        Integer updated = tigohogarJdbcTemplate.queryForObject(
                "EXEC dbo.SP_Inicio_RechazarPorIdHoy ?",
                Integer.class,
                idInicio
        );
        return updated == null ? 0 : updated;
    }

    private int resolveLimit(Integer limite) {
        if (limite == null || limite <= 0) {
            return 200;
        }
        return Math.min(limite, 1000);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Object findValue(Map<String, Object> row, String... keys) {
        if (row == null || row.isEmpty() || keys == null || keys.length == 0) {
            return null;
        }
        Map<String, Object> normalized = new HashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            normalized.put(normalize(entry.getKey()), entry.getValue());
        }
        for (String key : keys) {
            String normalizedKey = normalize(key);
            if (normalized.containsKey(normalizedKey)) {
                return normalized.get(normalizedKey);
            }
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("_", "").trim().toLowerCase(Locale.ROOT);
    }

    private List<Map<String, Object>> enriquecerNombresTecnicos(List<Map<String, Object>> rows, String sucursal) {
        if (rows == null || rows.isEmpty()) {
            return rows == null ? new ArrayList<>() : rows;
        }
        JdbcTemplate sucursalTemplate = null;
        try {
            sucursalTemplate = resolveJdbcTemplateBySucursalNombre(sucursal);
        } catch (Exception ignored) {}
        Map<Integer, String> usuarios = cargarUsuariosDesdeSucursalPreferida(sucursal);
        if (usuarios.isEmpty()) {
            usuarios = cargarUsuariosDesdeTecnicosSp();
        }
        Map<Integer, Map<String, Object>> detallesInicio = cargarDetallesInicioJornada(rows);
        for (Map<String, Object> row : rows) {
            Integer idInicio = toInteger(findValue(row, "idInicio", "id_inicio"));
            Map<String, Object> inicioDetalle = idInicio == null ? null : detallesInicio.get(idInicio);
            Integer idTecnico = toInteger(findValue(row, "idTecnico", "id_tecnico"));
            Integer idAuxiliar = toInteger(findValue(row, "idAuxiliar", "id_auxiliar"));
            Integer idSupervisor = toInteger(findValue(row, "idSupervisor", "id_supervisor", "id_encargado"));
            String tecnicoNombreInicio = toText(findValue(inicioDetalle, "nombre_tecnico", "tecnico_nombre", "nombreTecnico", "tecnicoNombre"));
            if (tecnicoNombreInicio != null && !tecnicoNombreInicio.trim().isEmpty()) {
                row.put("tecnicoNombre", tecnicoNombreInicio.trim());
            } else if ((toText(findValue(row, "tecnicoNombre", "tecnico_nombre", "tecnico")) == null) && idTecnico != null) {
                String nombre = usuarios.get(idTecnico);
                if ((nombre == null || nombre.trim().isEmpty()) && sucursalTemplate != null) {
                    nombre = obtenerNombreTecnicoSucursal(sucursalTemplate, idTecnico);
                }
                if (nombre != null && !nombre.trim().isEmpty()) {
                    row.put("tecnicoNombre", nombre.trim());
                }
            }
            if ((toText(findValue(row, "auxiliarNombre", "auxiliar_nombre", "auxiliar")) == null) && idAuxiliar != null) {
                String nombre = usuarios.get(idAuxiliar);
                if ((nombre == null || nombre.trim().isEmpty()) && sucursalTemplate != null) {
                    nombre = obtenerNombreTecnicoSucursal(sucursalTemplate, idAuxiliar);
                }
                if (nombre != null && !nombre.trim().isEmpty()) {
                    row.put("auxiliarNombre", nombre.trim());
                }
            }
            if ((toText(findValue(row, "supervisorNombre", "supervisor", "nombreSupervisor")) == null) && idSupervisor != null) {
                String nombre = usuarios.get(idSupervisor);
                if (nombre != null && !nombre.trim().isEmpty()) {
                    row.put("supervisorNombre", nombre.trim());
                }
            }
            if (inicioDetalle != null && !inicioDetalle.isEmpty()) {
                copyIfMissing(row, inicioDetalle, "capacitado", "charla", "botiquin", "extintor", "fecha_vencimiento", "equipo_epp", "estado_epp", "apr", "escalera", "anclaje", "ubicacion_georef");
                copyIfMissing(row, inicioDetalle,
                        "codigo_cliente_cierre", "codigoClienteCierre", "codigo_cliente", "codigoCliente",
                        "dano_material", "danoMaterial",
                        "observacion_material", "observacionMaterial", "observacion_dano_material",
                        "dano_persona", "danoPersona",
                        "observacion_persona", "observacionPersona", "observacion_dano_persona",
                        "novedades_trabajo", "novedadesTrabajo",
                        "observacion_novedades", "observacionNovedades", "observacion_novedades_trabajo",
                        "ubicacion_cierre_georef", "ubicacionCierreGeoref", "ubicacion_georef_cierre", "ubicacionGeoRefCierre"
                );
            }
        }
        return rows;
    }

    private Map<Integer, Map<String, Object>> cargarDetallesInicioJornada(List<Map<String, Object>> rows) {
        Map<Integer, Map<String, Object>> out = new HashMap<>();
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        Set<Integer> idsSet = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            Integer idInicio = toInteger(findValue(row, "idInicio", "id_inicio"));
            if (idInicio != null && idInicio > 0) {
                idsSet.add(idInicio);
            }
        }
        List<Integer> ids = new ArrayList<>(idsSet);
        if (ids.isEmpty()) {
            return out;
        }
        StringBuilder sql = new StringBuilder("SELECT * FROM dbo.tbl_InicioJornadaAlturas WHERE id_inicio IN (");
        Object[] params = new Object[ids.size()];
        for (int i = 0; i < ids.size(); i++) {
            if (i > 0) {
                sql.append(",");
            }
            sql.append("?");
            params[i] = ids.get(i);
        }
        sql.append(")");
        try {
            List<Map<String, Object>> detalles = tigohogarJdbcTemplate.queryForList(sql.toString(), params);
            if (detalles == null || detalles.isEmpty()) {
                return out;
            }
            for (Map<String, Object> detalle : detalles) {
                Integer idInicio = toInteger(findValue(detalle, "id_inicio", "idInicio"));
                if (idInicio != null && idInicio > 0 && !out.containsKey(idInicio)) {
                    out.put(idInicio, detalle);
                }
            }
        } catch (Exception ignored) {
            return out;
        }
        return out;
    }

    private void copyIfMissing(Map<String, Object> target, Map<String, Object> source, String... keys) {
        if (target == null || source == null || keys == null) {
            return;
        }
        for (String key : keys) {
            Object value = findValue(source, key);
            if (value == null) {
                continue;
            }
            if (findValue(target, key) == null) {
                target.put(key, value);
            }
        }
    }

    private Map<Integer, String> cargarUsuariosDesdeSucursalPreferida(String sucursal) {
        Map<Integer, String> out = new LinkedHashMap<>();
        JdbcTemplate template;
        try {
            template = resolveJdbcTemplateBySucursalNombre(sucursal);
        } catch (Exception ex) {
            return out;
        }
        List<Map<String, Object>> usuariosRows = new ArrayList<>();
        try {
            usuariosRows.addAll(template.queryForList(
                    "EXEC dbo.SP_Usuario_ListarActivosBasico"
            ));
        } catch (Exception ignored) {}

        for (Map<String, Object> row : usuariosRows) {
            Integer id = toInteger(findValue(row, "idUsuario", "id_usuario", "Id_Usuario"));
            String nombre = toText(findValue(row, "nombre", "Nombre", "tecnico"));
            if (id == null || id <= 0 || nombre == null || nombre.trim().isEmpty()) continue;
            out.put(id, nombre.trim());
        }
        return out;
    }

    private Map<Integer, String> cargarUsuariosDesdeTecnicosSp() {
        Map<Integer, String> fromTigohogar = cargarUsuariosDesdeTigoHogar();
        if (!fromTigohogar.isEmpty()) {
            return fromTigohogar;
        }
        Map<Integer, String> out = new LinkedHashMap<>();
        JdbcTemplate operativa;
        try {
            operativa = dbConnectionManager.connDb("operativa");
        } catch (Exception ex) {
            return out;
        }
        List<Map<String, Object>> rows;
        try {
            rows = operativa.queryForList("EXEC dbo.spx_ObtenerListaUsuario");
        } catch (Exception ex) {
            return out;
        }
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Integer id = toInteger(findValue(row, "Id_Usuario", "id_usuario", "idusuario", "IdUsuario"));
            String nombre = toText(findValue(row, "Nombre", "nombre", "tecnico", "usuario"));
            if (id == null || id <= 0 || nombre == null || nombre.trim().isEmpty()) {
                continue;
            }
            out.put(id, nombre.trim());
        }
        return out;
    }

    private Map<Integer, String> cargarUsuariosDesdeTigoHogar() {
        Map<Integer, String> out = new LinkedHashMap<>();
        List<Map<String, Object>> rows;
        try {
            rows = tigohogarJdbcTemplate.queryForList(
                    "EXEC dbo.SP_Usuario_ListarActivosBasico"
            );
        } catch (Exception ex) {
            return out;
        }
        if (rows == null || rows.isEmpty()) {
            return out;
        }
        for (Map<String, Object> row : rows) {
            Integer id = toInteger(findValue(row, "idUsuario", "Id_Usuario", "id_usuario"));
            String nombre = toText(findValue(row, "nombre", "Nombre"));
            if (id == null || id <= 0 || nombre == null || nombre.trim().isEmpty()) {
                continue;
            }
            out.put(id, nombre.trim());
        }
        return out;
    }

    private Integer toInteger(Object value) {
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

    private String toText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private String normText(String value) {
        String text = toText(value);
        if (text == null) return null;
        String normalized = text
                .toLowerCase(Locale.ROOT)
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
                .replace("ñ", "n")
                .replaceAll("[^a-z0-9]", "");
        return normalized.isEmpty() ? null : normalized;
    }

    private List<Map<String, Object>> enriquecerTecnicosDesdeSucursal(List<Map<String, Object>> idsRows, JdbcTemplate sucursalTemplate) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (idsRows == null || idsRows.isEmpty()) return out;
        for (Map<String, Object> row : idsRows) {
            Integer idTecnico = toInteger(findValue(row, "idTecnico", "id_tecnico", "id_vendedor", "idUsuarioTecnico"));
            if (idTecnico == null || idTecnico <= 0) continue;
            Map<String, Object> vendedor = obtenerDatosVendedorSucursal(sucursalTemplate, idTecnico);
            String nombre = toText(findValue(vendedor, "Nombre", "nombre"));
            if (nombre == null) {
                nombre = obtenerNombreTecnicoSucursal(sucursalTemplate, idTecnico);
                if (nombre == null) {
                    nombre = toText(findValue(row, "tecnico", "Tecnico", "nombre", "Nombre"));
                }
            }
            Map<String, Object> mapped = new LinkedHashMap<>();
            mapped.put("idTecnico", idTecnico);
            mapped.put("id_tecnico", idTecnico);
            mapped.put("tecnico", nombre == null ? ("Tecnico " + idTecnico) : nombre);
            String codEmpleado = toText(findValue(row, "codigo", "Codigo", "codEmpleado", "CodEmpleado", "cod_empleado"));
            if (codEmpleado == null) {
                codEmpleado = toText(findValue(vendedor, "CodEmpleado", "codEmpleado", "cod_empleado"));
            }
            if (codEmpleado != null) {
                mapped.put("codigo", codEmpleado);
                mapped.put("codEmpleado", codEmpleado);
                mapped.put("cod_empleado", codEmpleado);
            }
            out.add(mapped);
        }
        return out;
    }

    private Map<String, Object> obtenerDatosVendedorSucursal(JdbcTemplate template, Integer idTecnico) {
        if (template == null || idTecnico == null || idTecnico <= 0) {
            return java.util.Collections.emptyMap();
        }
        try {
            List<Map<String, Object>> rows = template.queryForList(
                    "SELECT TOP 1 Id_Vendedor, Nombre, CodEmpleado " +
                            "FROM dbo.tbl_Vendedor " +
                            "WHERE Id_Vendedor = ? AND ISNULL(E_Eliminado,0)=0",
                    idTecnico
            );
            if (rows != null && !rows.isEmpty()) {
                return rows.get(0);
            }
        } catch (Exception ignored) {}
        return java.util.Collections.emptyMap();
    }

    private String obtenerNombreTecnicoSucursal(JdbcTemplate template, Integer idTecnico) {
        if (template == null || idTecnico == null || idTecnico <= 0) {
            return null;
        }
        String nombre = queryNombre(
                template,
                "SELECT TOP 1 Nombre FROM dbo.tbl_Vendedor WHERE Id_Vendedor = ? AND ISNULL(E_Eliminado,0)=0",
                idTecnico
        );
        if (nombre != null) return nombre;
        nombre = queryNombre(
                template,
                "SELECT TOP 1 u.Nombre AS Nombre " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "LEFT JOIN dbo.tbl_Usuario u ON u.Id_Usuario = ut.id_Usuario " +
                        "WHERE ut.Id_Vendedor = ? AND ISNULL(ut.e_eliminado,0)=0",
                idTecnico
        );
        if (nombre != null) return nombre;
        nombre = queryNombre(
                template,
                "SELECT TOP 1 u.Nombre AS Nombre " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "LEFT JOIN dbo.tbl_Usuario u ON u.Id_Usuario = ut.id_Usuario " +
                        "WHERE ut.id_Usuario = ? AND ISNULL(ut.e_eliminado,0)=0",
                idTecnico
        );
        if (nombre != null) return nombre;
        nombre = queryNombre(
                template,
                "SELECT TOP 1 Nombre FROM dbo.tbl_Usuario WHERE Id_Usuario = ? AND ISNULL(E_Eliminado,0)=0",
                idTecnico
        );
        if (nombre != null) return nombre;
        try {
            List<Map<String, Object>> v = template.queryForList(
                    "EXEC dbo.SP_Tecnico_ObtenerNombrePorId ?",
                    idTecnico
            );
            if (!v.isEmpty()) {
                String n = toText(v.get(0).get("Nombre"));
                if (n != null && !n.isEmpty()) return n;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String queryNombre(JdbcTemplate template, String sql, Integer id) {
        try {
            List<Map<String, Object>> rows = template.queryForList(sql, id);
            if (rows == null || rows.isEmpty()) {
                return null;
            }
            Object value = findValue(rows.get(0), "Nombre", "nombre", "tecnico");
            String text = toText(value);
            return text == null || text.trim().isEmpty() ? null : text.trim();
        } catch (Exception ex) {
            return null;
        }
    }

    private String resolveNombrePersona(Integer idPersona, Map<Integer, String> usuarios, JdbcTemplate sucursalTemplate) {
        if (idPersona == null || idPersona <= 0) {
            return null;
        }
        String nombre = usuarios == null ? null : usuarios.get(idPersona);
        if ((nombre == null || nombre.trim().isEmpty()) && sucursalTemplate != null) {
            nombre = obtenerNombreTecnicoSucursal(sucursalTemplate, idPersona);
        }
        if (nombre == null) {
            return null;
        }
        String out = nombre.trim();
        return out.isEmpty() ? null : out;
    }

    private boolean isNumericText(String value) {
        if (value == null) {
            return false;
        }
        String text = value.trim();
        if (text.isEmpty()) {
            return false;
        }
        return text.matches("^\\d+$");
    }

    private JdbcTemplate resolveJdbcTemplateBySucursal(Integer idSucursal) {
        if (idSucursal == null || idSucursal <= 0) {
            return dbConnectionManager.connDb("operativa");
        }
        List<Map<String, Object>> sucursales = dbConnectionManager.connDb("operativa")
                .queryForList("EXEC dbo.spx_ObtenerSucursalesConexion");
        for (Map<String, Object> row : sucursales) {
            Integer id = toInteger(findValue(row, "Id_Sucursal", "idSucursal", "id_sucursal"));
            if (id == null || !idSucursal.equals(id)) {
                continue;
            }
            String host = toText(findValue(row, "ip", "IP", "host"));
            if (host == null) {
                host = toText(findValue(row, "ip2", "IP2", "hostAlterno"));
            }
            String base = toText(findValue(row, "BaseDeDatos", "baseDeDatos", "database", "db"));
            if (host != null && base != null) {
                return dbConnectionManager.connDb("sucursal-" + idSucursal, host, base, dbUsername, dbPassword);
            }
            break;
        }
        return dbConnectionManager.connDb("operativa");
    }

    private JdbcTemplate resolveJdbcTemplateBySucursalNombre(String sucursal) {
        if (sucursal == null || sucursal.trim().isEmpty()) {
            return dbConnectionManager.connDb("operativa");
        }
        String value = normalize(sucursal);
        List<Map<String, Object>> sucursales = dbConnectionManager.connDb("operativa")
                .queryForList("EXEC dbo.spx_ObtenerSucursalesConexion");
        for (Map<String, Object> row : sucursales) {
            String nombre = toText(findValue(row, "Sucursal", "sucursal"));
            if (nombre == null || !value.equals(normalize(nombre))) {
                continue;
            }
            String host = toText(findValue(row, "ip", "IP", "host"));
            if (host == null) {
                host = toText(findValue(row, "ip2", "IP2", "hostAlterno"));
            }
            String base = toText(findValue(row, "BaseDeDatos", "baseDeDatos", "database", "db"));
            Integer id = toInteger(findValue(row, "Id_Sucursal", "idSucursal", "id_sucursal"));
            if (host != null && base != null && id != null) {
                return dbConnectionManager.connDb("sucursal-" + id, host, base, dbUsername, dbPassword);
            }
            break;
        }
        return dbConnectionManager.connDb("operativa");
    }

    public String registrarPendiente(
            String idSupervisorAsignado,
            String idTecnicoPrincipal,
            String idTecnicoAuxiliar,
            String idTipoSupervision,
            String idTipoTrabajo,
            String idTipoPenalizacion,
            String supervisionPor,
            String tecnologia,
            String codigo,
            String ordenTrabajo,
            String tipoRevision,
            String fotoBoletaSupervision,
            String fotoCanalesPilos,
            String fotoNivelesDocsis,
            String fotoMedicionRuido,
            String fotoBarridoCanales,
            String fotoObservacion1,
            String fotoObservacion2,
            String fotoObservacion3,
            String fotoObservacion4,
            String observacion,
            String descripcionAdicionalObservacion,
            String ubicacion) {
        List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                SP_REGISTRAR_PENDIENTE,
                trimToNull(idSupervisorAsignado),
                trimToNull(idTecnicoPrincipal),
                trimToNull(idTecnicoAuxiliar),
                trimToNull(idTipoSupervision),
                trimToNull(idTipoTrabajo),
                trimToNull(idTipoPenalizacion),
                trimToNull(supervisionPor),
                trimToNull(tecnologia),
                trimToNull(codigo),
                trimToNull(ordenTrabajo),
                trimToNull(tipoRevision),
                trimToNull(fotoBoletaSupervision),
                trimToNull(fotoCanalesPilos),
                trimToNull(fotoNivelesDocsis),
                trimToNull(fotoMedicionRuido),
                trimToNull(fotoBarridoCanales),
                trimToNull(fotoObservacion1),
                trimToNull(fotoObservacion2),
                trimToNull(fotoObservacion3),
                trimToNull(fotoObservacion4),
                trimToNull(observacion),
                trimToNull(descripcionAdicionalObservacion),
                trimToNull(ubicacion)
        );

        if (rows != null && !rows.isEmpty()) {
            Map<String, Object> row = rows.get(0);
            Object id = findValue(row, "idSupervision", "id_supervision", "Id_Supervision");
            if (id == null && !row.isEmpty()) {
                id = row.values().iterator().next();
            }
            if (id != null) {
                String text = String.valueOf(id).trim();
                if (!text.isEmpty()) {
                    return text;
                }
            }
        }

        throw new IllegalStateException("No se pudo obtener Id_Supervision generado.");
    }

    public List<Map<String, Object>> listarSupervisores(String sucursal) {
        JdbcTemplate template = resolveTemplateSupervisores(sucursal);
        return listarSupervisoresDesdeTemplate(template);
    }

    private List<Map<String, Object>> listarSupervisoresDesdeTemplate(JdbcTemplate template) {
        try {
            return template.queryForList(SP_LISTAR_SUPERVISORES);
        } catch (Exception e1) {
            try {
                return template.queryForList(SP_LISTAR_SUPERVISORES_ALT);
            } catch (Exception e2) {
                try {
                    return template.queryForList(SP_LISTAR_SUPERVISORES_ALT2);
                } catch (Exception e3) {
                    try {
                        return template.queryForList(SP_LISTAR_SUPERVISORES_ALT3);
                    } catch (Exception e4) {
                        return listarSupervisoresDesdeTigoHogar();
                    }
                }
            }
        }
    }

    private List<Map<String, Object>> listarSupervisoresDesdeTigoHogar() {
        try {
            return tigohogarJdbcTemplate.queryForList(SP_LISTAR_SUPERVISORES);
        } catch (Exception e1) {
            try {
                return tigohogarJdbcTemplate.queryForList(SP_LISTAR_SUPERVISORES_ALT);
            } catch (Exception e2) {
                try {
                    return tigohogarJdbcTemplate.queryForList(SP_LISTAR_SUPERVISORES_ALT2);
                } catch (Exception e3) {
                    try {
                        return tigohogarJdbcTemplate.queryForList(SP_LISTAR_SUPERVISORES_ALT3);
                    } catch (Exception e4) {
                        return java.util.Collections.emptyList();
                    }
                }
            }
        }
    }

    private JdbcTemplate resolveTemplateSupervisores(String sucursal) {
        if ("sucre".equals(normalize(sucursal))) {
            return dbConnectionManager.connDb("sucre");
        }
        return dbConnectionManager.connDb("operativa");
    }

    public List<Map<String, Object>> listarTecnicosPorSupervisorBackoffice(Integer idSupervisor, String sucursal) {
        return listarTecnicosPorSupervisorBackoffice(idSupervisor, sucursal, null);
    }

    public List<Map<String, Object>> listarTecnicosPorSupervisorBackoffice(Integer idSupervisor, String sucursal, String supervisorNombre) {
        return listarTecnicosPorSupervisor(idSupervisor, sucursal, supervisorNombre);
    }
}
