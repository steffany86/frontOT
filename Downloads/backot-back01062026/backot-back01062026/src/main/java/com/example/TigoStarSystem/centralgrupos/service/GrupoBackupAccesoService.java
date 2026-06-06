package com.example.TigoStarSystem.centralgrupos.service;

import com.example.TigoStarSystem.config.DbConnectionManager;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class GrupoBackupAccesoService {
    private static final Duration DURACION_AUSENCIA = Duration.ofHours(15);
    private static final String SQL_CONTEXTO = "SELECT TOP 1 " +
            "g.id_grupo, " +
            "ISNULL(g.supervisor_ausente, 0) AS supervisor_ausente, " +
            "gb.id_grupo_backup, " +
            "gb.id_usuario_tecnico_temporal, " +
            "ISNULL(gb.e_activo, 0) AS backup_activo, " +
            "gb.fecha_inicio, " +
            "gs.id_usuario AS id_usuario_supervisor " +
            "FROM dbo.tbl_Grupo g " +
            "LEFT JOIN dbo.tbl_GrupoSup gs ON gs.id_grupo = g.id_grupo " +
            "LEFT JOIN dbo.tbl_GrupoBackup gb " +
            "       ON gb.id_grupo = g.id_grupo " +
            "      AND ISNULL(gb.e_activo, 0) = 1 " +
            "WHERE ISNULL(g.e_eliminado, 0) = 0 " +
            "  AND (gs.id_usuario = ? OR gb.id_usuario_tecnico_temporal = ? OR gb.id_usuario_tecnico_temporal = ? OR gb.id_usuario_tecnico_temporal = ?) " +
            "ORDER BY CASE WHEN gb.id_usuario_tecnico_temporal = ? THEN 0 " +
            "              WHEN gb.id_usuario_tecnico_temporal = ? THEN 1 " +
            "              WHEN gb.id_usuario_tecnico_temporal = ? THEN 2 ELSE 3 END, " +
            "         gb.id_grupo_backup DESC, g.id_grupo DESC";
    private static final String SQL_CONTEXTO_BACKUP_DIRECTO = "SELECT TOP 1 " +
            "gb.id_grupo, " +
            "ISNULL(g.supervisor_ausente, 0) AS supervisor_ausente, " +
            "gb.id_grupo_backup, " +
            "gb.id_usuario_tecnico_temporal, " +
            "ISNULL(gb.e_activo, 0) AS backup_activo, " +
            "gb.fecha_inicio, " +
            "CAST(NULL AS INT) AS id_usuario_supervisor " +
            "FROM dbo.tbl_GrupoBackup gb " +
            "LEFT JOIN dbo.tbl_Grupo g ON g.id_grupo = gb.id_grupo " +
            "WHERE ISNULL(gb.e_activo, 0) = 1 " +
            "  AND (gb.id_usuario_tecnico_temporal = ? OR gb.id_usuario_tecnico_temporal = ? OR gb.id_usuario_tecnico_temporal = ?) " +
            "ORDER BY gb.id_grupo_backup DESC";

    private final DbConnectionManager dbConnectionManager;
    private final JdbcTemplate tigohogarJdbcTemplate;

    public GrupoBackupAccesoService(
            DbConnectionManager dbConnectionManager,
            @Qualifier("tigohogarJdbcTemplate") JdbcTemplate tigohogarJdbcTemplate) {
        this.dbConnectionManager = dbConnectionManager;
        this.tigohogarJdbcTemplate = tigohogarJdbcTemplate;
    }

    public ContextoAccesoSupervisor resolverContexto(Integer idUsuarioSesion) {
        if (idUsuarioSesion == null || idUsuarioSesion <= 0) {
            return ContextoAccesoSupervisor.vacio(idUsuarioSesion);
        }
        ConsultaContextoResultado resultado = consultarContexto(idUsuarioSesion);
        ContextoAccesoSupervisor base = mapRow(idUsuarioSesion, resultado);
        if (base.isAusenciaExpirada()) {
            cerrarAusenciaPorExpiracion(base.getIdGrupo(), resultado.getDbKey());
            return mapRow(idUsuarioSesion, consultarContexto(idUsuarioSesion));
        }
        return base;
    }

    private ConsultaContextoResultado consultarContexto(Integer idUsuarioSesion) {
        List<String> dbCandidates = new ArrayList<>();
        dbCandidates.add("tigohogar");
        dbCandidates.add("operativa");
        dbCandidates.add("sucre");

        for (String dbKey : dbCandidates) {
            try {
                JdbcTemplate template = resolveTemplate(dbKey);
                if (template == null) {
                    continue;
                }
                Integer idUsuarioTecnico = resolveIdUsuarioTecnicoSesion(template, idUsuarioSesion);
                Integer idVendedor = resolveIdVendedorSesion(template, idUsuarioSesion, idUsuarioTecnico);
                List<Map<String, Object>> rows = template.queryForList(
                        SQL_CONTEXTO,
                        idUsuarioSesion,
                        idUsuarioSesion,
                        idUsuarioTecnico,
                        idVendedor,
                        idUsuarioTecnico,
                        idVendedor,
                        idUsuarioSesion
                );
                if (rows == null || rows.isEmpty()) {
                    rows = template.queryForList(
                            SQL_CONTEXTO_BACKUP_DIRECTO,
                            idUsuarioSesion,
                            idUsuarioTecnico,
                            idVendedor
                    );
                    if (rows == null || rows.isEmpty()) {
                        continue;
                    }
                }
                return new ConsultaContextoResultado(dbKey, rows.get(0), idUsuarioTecnico, idVendedor);
            } catch (DataAccessException ignored) {
                // intenta siguiente base
            }
        }
        return new ConsultaContextoResultado(null, Collections.emptyMap(), null, null);
    }

    private Integer resolveIdUsuarioTecnicoSesion(JdbcTemplate template, Integer idUsuarioSesion) {
        if (template == null || idUsuarioSesion == null || idUsuarioSesion <= 0) {
            return null;
        }

        String[] statements = new String[] {
                "SELECT TOP 1 CAST(ut.id AS INT) AS id_usuario_tecnico " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT TOP 1 CAST(ut.Id AS INT) AS id_usuario_tecnico " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.Id_Usuario = ? OR ut.IdUsuario = ? OR ut.Id_Tecnico = ? OR ut.IdTecnico = ?) " +
                        "  AND ISNULL(ut.E_Eliminado, 0) = 0",
                "SELECT TOP 1 CAST(ut.id AS INT) AS id_usuario_tecnico " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT TOP 1 CAST(ut.id AS INT) AS id_usuario_tecnico " +
                        "FROM dbo.tbl_usuaritecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0"
        };

        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = template.queryForList(
                        sql,
                        idUsuarioSesion,
                        idUsuarioSesion,
                        idUsuarioSesion,
                        idUsuarioSesion
                );
                if (rows == null || rows.isEmpty()) {
                    continue;
                }
                Integer idUsuarioTecnico = toInteger(findValue(rows.get(0), "id_usuario_tecnico"));
                if (idUsuarioTecnico != null && idUsuarioTecnico > 0) {
                    return idUsuarioTecnico;
                }
            } catch (DataAccessException ignored) {
                // intenta siguiente variante
            }
        }
        return null;
    }

    private void cerrarAusenciaPorExpiracion(Integer idGrupo, String dbKey) {
        if (idGrupo == null || idGrupo <= 0) {
            return;
        }
        JdbcTemplate central = resolveTemplate(dbKey == null ? "central" : dbKey);
        if (central == null) {
            return;
        }
        try {
            central.update(
                    "UPDATE dbo.tbl_GrupoBackup " +
                            "SET e_activo = 0, " +
                            "    fecha_fin = ISNULL(fecha_fin, GETDATE()), " +
                            "    fecha_actualizacion = GETDATE(), " +
                            "    id_usuario_actualiza = ISNULL(id_usuario_actualiza, 0) " +
                            "WHERE id_grupo = ? AND ISNULL(e_activo, 0) = 1",
                    idGrupo
            );
            central.update(
                    "UPDATE dbo.tbl_Grupo " +
                            "SET supervisor_ausente = 0 " +
                            "WHERE id_grupo = ?",
                    idGrupo
            );
        } catch (DataAccessException ignored) {
            // si falla, no bloqueamos flujo
        }
    }

    private Integer resolveIdVendedorSesion(JdbcTemplate template, Integer idUsuarioSesion, Integer idUsuarioTecnico) {
        if (template == null || idUsuarioSesion == null || idUsuarioSesion <= 0) {
            return null;
        }
        String[] statements = new String[] {
                "SELECT TOP 1 CAST(ut.id_vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0 AND ut.id_vendedor IS NOT NULL",
                "SELECT TOP 1 CAST(ut.Id_Vendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.Id_Usuario = ? OR ut.IdUsuario = ? OR ut.Id = ? OR ut.Id_Tecnico = ? OR ut.IdTecnico = ?) " +
                        "  AND ISNULL(ut.E_Eliminado, 0) = 0 AND ut.Id_Vendedor IS NOT NULL",
                "SELECT TOP 1 CAST(ut.idvendedor AS INT) AS id_vendedor " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0 AND ut.idvendedor IS NOT NULL"
        };
        Integer tecnico = idUsuarioTecnico == null ? -1 : idUsuarioTecnico;
        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = template.queryForList(
                        sql,
                        idUsuarioSesion,
                        idUsuarioSesion,
                        tecnico,
                        idUsuarioSesion,
                        idUsuarioSesion
                );
                if (rows == null || rows.isEmpty()) {
                    continue;
                }
                Integer idVendedor = toInteger(findValue(rows.get(0), "id_vendedor"));
                if (idVendedor != null && idVendedor > 0) {
                    return idVendedor;
                }
            } catch (DataAccessException ignored) {
                // intenta siguiente variante
            }
        }
        return null;
    }

    private ContextoAccesoSupervisor mapRow(Integer idUsuarioSesion, ConsultaContextoResultado resultado) {
        Map<String, Object> row = resultado == null ? null : resultado.getRow();
        if (row == null || row.isEmpty()) {
            return ContextoAccesoSupervisor.vacio(idUsuarioSesion);
        }
        Integer idUsuarioTecnicoSesion = resultado.getIdUsuarioTecnicoSesion();
        Integer idVendedorSesion = resultado.getIdVendedorSesion();
        Integer idGrupo = toInteger(findValue(row, "id_grupo", "idgrupo"));
        Integer idSupervisor = toInteger(findValue(row, "id_usuario_supervisor", "idusuariosupervisor"));
        if (idSupervisor == null && idGrupo != null) {
            idSupervisor = resolveIdUsuarioSupervisorPorGrupoCascada(resultado.getDbKey(), idGrupo);
        }
        Integer idBackup = toInteger(findValue(row, "id_usuario_tecnico_temporal", "idusuariotecnico_temporal"));
        boolean supervisorAusente = toBoolean(findValue(row, "supervisor_ausente", "supervisorausente"));
        boolean backupActivo = toBoolean(findValue(row, "backup_activo", "e_activo", "backupactivo"));
        LocalDateTime fechaInicio = toDateTime(findValue(row, "fecha_inicio", "fechainicio"));

        boolean sesionEsSupervisorTitular = idSupervisor != null && idSupervisor.equals(idUsuarioSesion);
        boolean sesionEsBackupActivo = idBackup != null
                && (idBackup.equals(idUsuarioSesion)
                || (idUsuarioTecnicoSesion != null && idBackup.equals(idUsuarioTecnicoSesion))
                || (idVendedorSesion != null && idBackup.equals(idVendedorSesion)))
                && backupActivo;
        boolean ausenciaExpirada = backupActivo
                && supervisorAusente
                && fechaInicio != null
                && fechaInicio.plus(DURACION_AUSENCIA).isBefore(LocalDateTime.now());

        return new ContextoAccesoSupervisor(
                idUsuarioSesion,
                idGrupo,
                idSupervisor,
                idBackup,
                supervisorAusente,
                backupActivo,
                sesionEsSupervisorTitular,
                sesionEsBackupActivo,
                ausenciaExpirada
        );
    }

    private Integer resolveIdUsuarioSupervisorPorGrupoCascada(String preferredDbKey, Integer idGrupo) {
        if (idGrupo == null || idGrupo <= 0) {
            return null;
        }
        List<String> candidates = new ArrayList<>();
        if (preferredDbKey != null && !preferredDbKey.trim().isEmpty()) {
            candidates.add(preferredDbKey.trim());
        }
        candidates.add("operativa");
        candidates.add("sucre");
        candidates.add("tigohogar");

        List<String> uniq = new ArrayList<>();
        for (String key : candidates) {
            if (key == null) {
                continue;
            }
            String norm = key.trim().toLowerCase();
            if (!uniq.contains(norm)) {
                uniq.add(norm);
            }
        }

        for (String dbKey : uniq) {
            Integer resolved = resolveIdUsuarioSupervisorPorGrupoEnDb(dbKey, idGrupo);
            if (resolved != null && resolved > 0) {
                return resolved;
            }
        }
        return null;
    }

    private Integer resolveIdUsuarioSupervisorPorGrupoEnDb(String dbKey, Integer idGrupo) {
        if (dbKey == null || idGrupo == null || idGrupo <= 0) {
            return null;
        }
        JdbcTemplate template = resolveTemplate(dbKey);
        if (template == null) {
            return null;
        }
        String[] statements = new String[] {
                "SELECT TOP 1 CAST(gs.id_usuario AS INT) AS id_usuario_supervisor " +
                        "FROM dbo.tbl_GrupoSup gs WHERE gs.id_grupo = ?",
                "SELECT TOP 1 CAST(gs.idusuario AS INT) AS id_usuario_supervisor " +
                        "FROM dbo.tbl_GrupoSup gs WHERE gs.id_grupo = ?",
                "SELECT TOP 1 CAST(gs.id_supervisor AS INT) AS id_usuario_supervisor " +
                        "FROM dbo.tbl_GrupoSup gs WHERE gs.id_grupo = ?",
                "SELECT TOP 1 CAST(gs.idusuariosupervisor AS INT) AS id_usuario_supervisor " +
                        "FROM dbo.tbl_GrupoSup gs WHERE gs.id_grupo = ?",
                "SELECT TOP 1 CAST(g.id_usuario_supervisor AS INT) AS id_usuario_supervisor " +
                        "FROM dbo.tbl_Grupo g WHERE g.id_grupo = ?",
                "SELECT TOP 1 CAST(g.id_supervisor AS INT) AS id_usuario_supervisor " +
                        "FROM dbo.tbl_Grupo g WHERE g.id_grupo = ?",
                "SELECT TOP 1 CAST(g.idusuariosupervisor AS INT) AS id_usuario_supervisor " +
                        "FROM dbo.tbl_Grupo g WHERE g.id_grupo = ?"
        };
        for (String sql : statements) {
            try {
                List<Map<String, Object>> rows = template.queryForList(sql, idGrupo);
                if (rows == null || rows.isEmpty()) {
                    continue;
                }
                Integer supervisor = toInteger(findValue(rows.get(0), "id_usuario_supervisor"));
                if (supervisor != null && supervisor > 0) {
                    return supervisor;
                }
            } catch (DataAccessException ignored) {
                // intenta siguiente variante
            }
        }
        return null;
    }

    private JdbcTemplate resolveTemplate(String dbKey) {
        if (dbKey == null) {
            return null;
        }
        if ("tigohogar".equalsIgnoreCase(dbKey)) {
            return tigohogarJdbcTemplate;
        }
        try {
            return dbConnectionManager.connDb(dbKey);
        } catch (Exception ex) {
            return null;
        }
    }

    private static final class ConsultaContextoResultado {
        private final String dbKey;
        private final Map<String, Object> row;
        private final Integer idUsuarioTecnicoSesion;
        private final Integer idVendedorSesion;

        private ConsultaContextoResultado(
                String dbKey,
                Map<String, Object> row,
                Integer idUsuarioTecnicoSesion,
                Integer idVendedorSesion) {
            this.dbKey = dbKey;
            this.row = row;
            this.idUsuarioTecnicoSesion = idUsuarioTecnicoSesion;
            this.idVendedorSesion = idVendedorSesion;
        }

        private String getDbKey() {
            return dbKey;
        }

        private Map<String, Object> getRow() {
            return row;
        }

        private Integer getIdUsuarioTecnicoSesion() {
            return idUsuarioTecnicoSesion;
        }

        private Integer getIdVendedorSesion() {
            return idVendedorSesion;
        }
    }

    private Object findValue(Map<String, Object> row, String... keys) {
        if (row == null || row.isEmpty() || keys == null || keys.length == 0) {
            return null;
        }
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            String current = normalizeKey(entry.getKey());
            for (String key : keys) {
                if (current.equals(normalizeKey(key))) {
                    return entry.getValue();
                }
            }
        }
        return null;
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

    private boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        String text = String.valueOf(value).trim().toLowerCase();
        return "1".equals(text) || "true".equals(text) || "si".equals(text) || "s".equals(text);
    }

    private LocalDateTime toDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime) {
            return (LocalDateTime) value;
        }
        if (value instanceof Timestamp) {
            return ((Timestamp) value).toLocalDateTime();
        }
        try {
            return Timestamp.valueOf(String.valueOf(value)).toLocalDateTime();
        } catch (Exception ex) {
            return null;
        }
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("_", "").trim().toLowerCase();
    }

    public static final class ContextoAccesoSupervisor {
        private final Integer idUsuarioSesion;
        private final Integer idGrupo;
        private final Integer idUsuarioSupervisor;
        private final Integer idUsuarioBackup;
        private final boolean supervisorAusente;
        private final boolean backupActivo;
        private final boolean sesionEsSupervisorTitular;
        private final boolean sesionEsBackupActivo;
        private final boolean ausenciaExpirada;

        private ContextoAccesoSupervisor(
                Integer idUsuarioSesion,
                Integer idGrupo,
                Integer idUsuarioSupervisor,
                Integer idUsuarioBackup,
                boolean supervisorAusente,
                boolean backupActivo,
                boolean sesionEsSupervisorTitular,
                boolean sesionEsBackupActivo,
                boolean ausenciaExpirada) {
            this.idUsuarioSesion = idUsuarioSesion;
            this.idGrupo = idGrupo;
            this.idUsuarioSupervisor = idUsuarioSupervisor;
            this.idUsuarioBackup = idUsuarioBackup;
            this.supervisorAusente = supervisorAusente;
            this.backupActivo = backupActivo;
            this.sesionEsSupervisorTitular = sesionEsSupervisorTitular;
            this.sesionEsBackupActivo = sesionEsBackupActivo;
            this.ausenciaExpirada = ausenciaExpirada;
        }

        private static ContextoAccesoSupervisor vacio(Integer idUsuarioSesion) {
            return new ContextoAccesoSupervisor(
                    idUsuarioSesion,
                    null,
                    null,
                    null,
                    false,
                    false,
                    false,
                    false,
                    false
            );
        }

        public Integer getIdUsuarioSesion() {
            return idUsuarioSesion;
        }

        public Integer getIdGrupo() {
            return idGrupo;
        }

        public Integer getIdUsuarioSupervisor() {
            return idUsuarioSupervisor;
        }

        public Integer getIdUsuarioBackup() {
            return idUsuarioBackup;
        }

        public boolean isSupervisorAusente() {
            return supervisorAusente;
        }

        public boolean isBackupActivo() {
            return backupActivo;
        }

        public boolean isSesionEsSupervisorTitular() {
            return sesionEsSupervisorTitular;
        }

        public boolean isSesionEsBackupActivo() {
            return sesionEsBackupActivo;
        }

        public boolean isAusenciaExpirada() {
            return ausenciaExpirada;
        }

        public boolean isSupervisorBloqueado() {
            return sesionEsSupervisorTitular && supervisorAusente;
        }

        public Integer getIdUsuarioSupervisorEfectivo() {
            if (sesionEsBackupActivo) {
                return idUsuarioSupervisor;
            }
            return idUsuarioSesion;
        }
    }
}
