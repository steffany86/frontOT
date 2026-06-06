package com.example.TigoStarSystem.privilegios.repository;

import com.example.TigoStarSystem.config.DbConnectionManager;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
public class PrivilegioRepository {
    private static final String DB_CENTRAL = "central";
    private final DbConnectionManager dbConnectionManager;
    private final JdbcTemplate tigohogarJdbcTemplate;

    public PrivilegioRepository(
            DbConnectionManager dbConnectionManager,
            @Qualifier("tigohogarJdbcTemplate") JdbcTemplate tigohogarJdbcTemplate) {
        this.dbConnectionManager = dbConnectionManager;
        this.tigohogarJdbcTemplate = tigohogarJdbcTemplate;
    }

    public List<Map<String, Object>> listarRoles() {
        return queryForListCentral("EXEC dbo.spx_ObtenerPrivilegiosRoles");
    }

    public List<Map<String, Object>> obtenerPrivilegiosRolDetalle(Integer idRol) {
        return queryForListCentral(
                "EXEC dbo.spx_ObtenerPrivilegiosRolDetalle ?",
                idRol
        );
    }

    public List<Map<String, Object>> guardarPrivilegiosRol(Integer idRol, String menuIdsCsv) {
        return queryForListCentral(
                "EXEC dbo.spx_GuardarPrivilegiosRol ?, ?",
                idRol,
                menuIdsCsv
        );
    }

    public List<Map<String, Object>> guardarPaginasPorMenu(Integer idMenu, String paginasCsv) {
        return queryForListCentral(
                "EXEC dbo.spx_GuardarPaginasPorMenu ?, ?",
                idMenu,
                paginasCsv
        );
    }

    public List<Map<String, Object>> guardarNombreSidebarPorMenu(Integer idMenu, String nombreSidebar) {
        JdbcTemplate central;
        try {
            central = centralTemplate();
        } catch (Exception ex) {
            central = resolveOperativaOrTigohogar();
        }
        central.update(
                "UPDATE dbo.tbl_tablamenu " +
                        "SET nombre_sidebar = ? " +
                        "WHERE Id = ? AND ISNULL(e_eliminado, 0) = 0;",
                nombreSidebar,
                idMenu
        );
        return queryForList(
                central,
                "SELECT Id AS Id_Menu, nombre AS Nombre, nombre_sidebar AS NombreSidebar " +
                        "FROM dbo.tbl_tablamenu " +
                        "WHERE Id = ? AND ISNULL(e_eliminado, 0) = 0;",
                idMenu
        );
    }

    public boolean existeBackupTemporalVigente(Integer idUsuarioSesion) {
        if (idUsuarioSesion == null || idUsuarioSesion <= 0) {
            return false;
        }
        JdbcTemplate central = resolveOperativaOrTigohogar();
        ensureBackupTemporalTable(central);

        Set<Integer> idsCandidatos = new LinkedHashSet<>();
        idsCandidatos.add(idUsuarioSesion);
        idsCandidatos.addAll(resolverIdsAlternosUsuario(central, idUsuarioSesion));

        for (Integer candidate : idsCandidatos) {
            if (candidate == null || candidate <= 0) {
                continue;
            }
            try {
                List<Map<String, Object>> rows = central.queryForList(
                        "SELECT TOP 1 1 AS ok " +
                                "FROM dbo.backup_temporal bt " +
                                "WHERE bt.id_usuario = ? " +
                                "  AND ISNULL(bt.e_activo, 1) = 1 " +
                                "  AND (bt.fecha_fin IS NULL OR bt.fecha_fin > GETDATE()) " +
                                "ORDER BY bt.id_backup_temporal DESC",
                        candidate
                );
                if (rows != null && !rows.isEmpty()) {
                    return true;
                }
            } catch (DataAccessException ignored) {
                // siguiente candidato
            }
        }
        return false;
    }

    public void activarBackupTemporalSupervisor(Integer idUsuarioSesion, Integer idGrupo, Integer horasVigencia) {
        if (idUsuarioSesion == null || idUsuarioSesion <= 0) {
            return;
        }
        JdbcTemplate central = resolveOperativaOrTigohogar();
        ensureBackupTemporalTable(central);
        int horas = horasVigencia == null || horasVigencia <= 0 ? 15 : horasVigencia;
        try {
            central.update(
                    "UPDATE dbo.backup_temporal " +
                            "SET e_activo = 0, " +
                            "    fecha_actualizacion = GETDATE() " +
                            "WHERE id_usuario = ? " +
                            "  AND ISNULL(e_activo, 1) = 1",
                    idUsuarioSesion
            );
            central.update(
                    "INSERT INTO dbo.backup_temporal " +
                            "(id_usuario, id_grupo, id_rol_temporal, e_activo, fecha_inicio, fecha_fin, fecha_registro) " +
                            "VALUES (?, ?, ?, 1, GETDATE(), DATEADD(HOUR, ?, GETDATE()), GETDATE())",
                    idUsuarioSesion,
                    idGrupo,
                    9,
                    horas
            );
        } catch (DataAccessException ignored) {
            // no romper permisos si no se pudo persistir el temporal
        }
    }

    public void desactivarBackupTemporalPorGrupo(Integer idGrupo) {
        if (idGrupo == null || idGrupo <= 0) {
            return;
        }
        JdbcTemplate central = resolveOperativaOrTigohogar();
        ensureBackupTemporalTable(central);
        try {
            central.update(
                    "UPDATE dbo.backup_temporal " +
                            "SET e_activo = 0, " +
                            "    fecha_actualizacion = GETDATE() " +
                            "WHERE id_grupo = ? " +
                            "  AND ISNULL(e_activo, 1) = 1",
                    idGrupo
            );
        } catch (DataAccessException ignored) {
            // best effort
        }
    }

    public boolean existeInicioJornadaPendienteAprobacion(Integer idUsuarioTecnico) {
        if (idUsuarioTecnico == null || idUsuarioTecnico <= 0) {
            return false;
        }
        try {
            List<Map<String, Object>> rows = tigohogarJdbcTemplate.queryForList(
                    "SELECT TOP 1 1 AS ok " +
                            "FROM dbo.tbl_InicioJornadaAlturas ij " +
                            "WHERE ij.id_tecnico = ? " +
                            "  AND CAST(ij.fecha_registro AS DATE) = CAST(GETDATE() AS DATE) " +
                            "  AND ISNULL(ij.pendiente, 0) = 1 " +
                            "  AND ISNULL(ij.e_eliminado, 0) = 0 " +
                            "ORDER BY ij.id_inicio DESC",
                    idUsuarioTecnico
            );
            return rows != null && !rows.isEmpty();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void ensureBackupTemporalTable(JdbcTemplate central) {
        try {
            central.update(
                    "IF OBJECT_ID('dbo.backup_temporal', 'U') IS NULL " +
                            "BEGIN " +
                            "CREATE TABLE dbo.backup_temporal (" +
                            "id_backup_temporal INT IDENTITY(1,1) NOT NULL PRIMARY KEY, " +
                            "id_usuario INT NOT NULL, " +
                            "id_grupo INT NULL, " +
                            "id_rol_temporal INT NOT NULL, " +
                            "e_activo BIT NOT NULL CONSTRAINT DF_backup_temporal_e_activo DEFAULT(1), " +
                            "fecha_inicio DATETIME NOT NULL CONSTRAINT DF_backup_temporal_fecha_inicio DEFAULT(GETDATE()), " +
                            "fecha_fin DATETIME NULL, " +
                            "fecha_registro DATETIME NOT NULL CONSTRAINT DF_backup_temporal_fecha_registro DEFAULT(GETDATE()), " +
                            "fecha_actualizacion DATETIME NULL" +
                            "); " +
                            "END"
            );
            central.update(
                    "IF COL_LENGTH('dbo.backup_temporal', 'id_grupo') IS NULL " +
                            "BEGIN " +
                            "ALTER TABLE dbo.backup_temporal ADD id_grupo INT NULL; " +
                            "END"
            );
            central.update(
                    "IF NOT EXISTS (" +
                            "SELECT 1 FROM sys.indexes " +
                            "WHERE object_id = OBJECT_ID('dbo.backup_temporal') " +
                            "  AND name = 'IX_backup_temporal_usuario_activo') " +
                            "BEGIN " +
                            "CREATE INDEX IX_backup_temporal_usuario_activo " +
                            "ON dbo.backup_temporal(id_usuario, e_activo, fecha_fin); " +
                            "END"
            );
        } catch (DataAccessException ignored) {
            // tabla no disponible
        }
    }

    private List<Integer> resolverIdsAlternosUsuario(JdbcTemplate central, Integer idUsuarioSesion) {
        Set<Integer> unique = new LinkedHashSet<>();
        unique.addAll(queryIdsAlternos(central, idUsuarioSesion));
        try {
            JdbcTemplate operativa = dbConnectionManager.connDb("operativa");
            unique.addAll(queryIdsAlternos(operativa, idUsuarioSesion));
        } catch (Exception ignored) {
            // ignore
        }
        unique.addAll(queryIdsAlternos(tigohogarJdbcTemplate, idUsuarioSesion));
        return new ArrayList<>(unique);
    }

    private List<Integer> queryIdsAlternos(JdbcTemplate template, Integer idUsuarioSesion) {
        List<Integer> out = new ArrayList<>();
        if (template == null || idUsuarioSesion == null || idUsuarioSesion <= 0) {
            return out;
        }
        String[] sqls = new String[] {
                "SELECT TOP 1 CAST(ut.id AS INT) AS alt_id " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT TOP 1 CAST(ut.id_vendedor AS INT) AS alt_id " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "  AND ut.id_vendedor IS NOT NULL",
                "SELECT TOP 1 CAST(ut.Id AS INT) AS alt_id " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.Id_Usuario = ? OR ut.IdUsuario = ? OR ut.Id_Tecnico = ? OR ut.IdTecnico = ?) " +
                        "  AND ISNULL(ut.E_Eliminado, 0) = 0",
                "SELECT TOP 1 CAST(ut.Id_Vendedor AS INT) AS alt_id " +
                        "FROM dbo.tbl_UsuarioTecnico ut " +
                        "WHERE (ut.Id_Usuario = ? OR ut.IdUsuario = ? OR ut.Id_Tecnico = ? OR ut.IdTecnico = ?) " +
                        "  AND ISNULL(ut.E_Eliminado, 0) = 0 " +
                        "  AND ut.Id_Vendedor IS NOT NULL",
                "SELECT TOP 1 CAST(ut.id AS INT) AS alt_id " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0",
                "SELECT TOP 1 CAST(ut.id_vendedor AS INT) AS alt_id " +
                        "FROM dbo.tbl_usuariotecnico ut " +
                        "WHERE (ut.id_usuario = ? OR ut.idusuario = ? OR ut.id_tecnico = ? OR ut.idtecnico = ?) " +
                        "  AND ISNULL(ut.e_eliminado, 0) = 0 " +
                        "  AND ut.id_vendedor IS NOT NULL"
        };
        for (String sql : sqls) {
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
                Object raw = rows.get(0).get("alt_id");
                if (raw instanceof Number) {
                    int parsed = ((Number) raw).intValue();
                    if (parsed > 0 && !out.contains(parsed)) {
                        out.add(parsed);
                    }
                } else if (raw != null) {
                    try {
                        int parsed = Integer.parseInt(String.valueOf(raw).trim());
                        if (parsed > 0 && !out.contains(parsed)) {
                            out.add(parsed);
                        }
                    } catch (NumberFormatException ignored) {
                        // skip
                    }
                }
            } catch (DataAccessException ignored) {
                // siguiente sql
            }
        }
        return out;
    }

    private List<Map<String, Object>> queryForListCentral(String sql, Object... args) {
        try {
            return queryForList(centralTemplate(), sql, args);
        } catch (DataAccessException | IllegalStateException ex) {
            return queryForList(resolveOperativaOrTigohogar(), sql, args);
        }
    }

    private JdbcTemplate resolveOperativaOrTigohogar() {
        try {
            JdbcTemplate operativa = dbConnectionManager.connDb("operativa");
            if (operativa != null) {
                return operativa;
            }
        } catch (Exception ignored) {
            // fallback a tigohogar
        }
        return tigohogarJdbcTemplate;
    }

    private JdbcTemplate centralTemplate() {
        return dbConnectionManager.connDb(DB_CENTRAL);
    }

    private List<Map<String, Object>> queryForList(JdbcTemplate template, String sql, Object... args) {
        if (args == null || args.length == 0) {
            return template.queryForList(sql);
        }
        return template.queryForList(sql, args);
    }
}
