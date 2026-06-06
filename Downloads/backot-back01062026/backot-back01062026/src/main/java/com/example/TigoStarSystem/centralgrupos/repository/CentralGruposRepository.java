package com.example.TigoStarSystem.centralgrupos.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class CentralGruposRepository {

    public List<Map<String, Object>> listarGrupos(JdbcTemplate template, Integer idUsuarioEjecutor) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_ListarCentral ?",
                idUsuarioEjecutor
        );
    }

    public List<Map<String, Object>> listarSupervisoresFiltro(JdbcTemplate template) {
        return template.queryForList("EXEC dbo.spx_Grupo_FiltroSupervisoresCentral");
    }

    public List<Map<String, Object>> listarTecnicosFiltro(JdbcTemplate template) {
        return template.queryForList("EXEC dbo.spx_Grupo_FiltroTecnicosCentral");
    }

    public List<Map<String, Object>> crearGrupo(JdbcTemplate template, Integer idUsuarioEjecutor, String nombre) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_CrearCentral ?, ?",
                idUsuarioEjecutor,
                nombre
        );
    }

    public List<Map<String, Object>> asignarSupervisor(
            JdbcTemplate template,
            Integer idUsuarioEjecutor,
            Integer idGrupo,
            Integer idUsuarioSupervisor) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_AsignarSupervisorCentral ?, ?, ?",
                idUsuarioEjecutor,
                idGrupo,
                idUsuarioSupervisor
        );
    }

    public List<Map<String, Object>> asignarTecnico(
            JdbcTemplate template,
            Integer idUsuarioEjecutor,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_AsignarTecnicoCentral ?, ?, ?",
                idUsuarioEjecutor,
                idGrupo,
                idUsuarioTecnico
        );
    }

    public List<Map<String, Object>> quitarTecnico(
            JdbcTemplate template,
            Integer idUsuarioEjecutor,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_QuitarTecnicoCentral ?, ?, ?",
                idUsuarioEjecutor,
                idGrupo,
                idUsuarioTecnico
        );
    }

    public List<Map<String, Object>> eliminarGrupo(
            JdbcTemplate template,
            Integer idUsuarioEjecutor,
            Integer idGrupo) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_EliminarCentral ?, ?",
                idUsuarioEjecutor,
                idGrupo
        );
    }

    public List<Map<String, Object>> marcarSupervisorAusente(
            JdbcTemplate template,
            Integer idUsuarioEjecutor,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_MarcarSupervisorAusenteCentral ?, ?, ?",
                idUsuarioEjecutor,
                idGrupo,
                idUsuarioTecnico
        );
    }

    public List<Map<String, Object>> restaurarSupervisor(
            JdbcTemplate template,
            Integer idUsuarioEjecutor,
            Integer idGrupo) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_RestaurarSupervisorCentral ?, ?",
                idUsuarioEjecutor,
                idGrupo
        );
    }

    public List<Map<String, Object>> cambiarColaboradorBackup(
            JdbcTemplate template,
            Integer idUsuarioEjecutor,
            Integer idGrupo,
            Integer idUsuarioTecnico) {
        return template.queryForList(
                "EXEC dbo.spx_Grupo_CambiarColaboradorBackupCentral ?, ?, ?",
                idUsuarioEjecutor,
                idGrupo,
                idUsuarioTecnico
        );
    }

    public List<Map<String, Object>> listarGruposDesdeConformacionCentral(JdbcTemplate centralTemplate, String sucursal) {
        return centralTemplate.queryForList(
                "WITH base AS ( " +
                        "  SELECT " +
                        "    LTRIM(RTRIM(ISNULL(grupo, ''))) AS grupo, " +
                        "    LTRIM(RTRIM(ISNULL(supervisorACargo, ''))) AS supervisor, " +
                        "    CAST(id_tecnico AS INT) AS id_usuario_tecnico, " +
                        "    LTRIM(RTRIM(ISNULL(tecnico, ''))) AS tecnico, " +
                        "    fechaRegistro, " +
                        "    ROW_NUMBER() OVER ( " +
                        "      PARTITION BY LTRIM(RTRIM(ISNULL(grupo, ''))), CAST(id_tecnico AS INT) " +
                        "      ORDER BY fecha DESC, fechaRegistro DESC, id DESC " +
                        "    ) AS rn_tecnico " +
                        "  FROM dbo.tbl_ConformacionCuadrillaDiario " +
                        "  WHERE ISNULL(e_eliminado, 0) = 0 " +
                        "    AND LTRIM(RTRIM(ISNULL(grupo, ''))) <> '' " +
                        "    AND LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(sucursal, ''))), '_', ''), '-', ''), ' ', '')) = " +
                        "        LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(?)), '_', ''), '-', ''), ' ', '')) " +
                        ") " +
                        "SELECT " +
                        "  CAST(DENSE_RANK() OVER (ORDER BY grupo) AS INT) AS id_grupo, " +
                        "  grupo AS nombre, " +
                        "  supervisor AS supervisor, " +
                        "  id_usuario_tecnico, " +
                        "  tecnico, " +
                        "  fechaRegistro AS fecha_registro " +
                        "FROM base " +
                        "WHERE rn_tecnico = 1 " +
                        "ORDER BY grupo, tecnico",
                sucursal
        );
    }

    public List<Map<String, Object>> listarGruposPorSupervisor(JdbcTemplate template, Integer idUsuarioSupervisor) {
        return template.queryForList(
                "SELECT DISTINCT CAST(v.id_grupo AS INT) AS id_grupo " +
                        "FROM dbo.vw_GruposUnicosCuadrilla v " +
                        "WHERE CAST(v.id_usuario_supervisor AS INT) = ? " +
                        "ORDER BY CAST(v.id_grupo AS INT)",
                idUsuarioSupervisor
        );
    }

    public int actualizarSupervisorEnConformacion(
            JdbcTemplate template,
            String nombreGrupo,
            Integer idUsuarioSupervisor,
            String nombreSupervisor) {
        if (nombreGrupo == null || nombreGrupo.trim().isEmpty()) {
            return 0;
        }
        String grupo = nombreGrupo.trim();
        String supervisor = nombreSupervisor == null ? "" : nombreSupervisor.trim();

        // Esquema actual (camelCase).
        try {
            return template.update(
                    "UPDATE dbo.tbl_ConformacionCuadrillaDiario " +
                            "SET idUsuarioSupervisor = ?, supervisorACargo = ? " +
                            "WHERE LTRIM(RTRIM(ISNULL(grupo, ''))) = LTRIM(RTRIM(?)) " +
                            "  AND ISNULL(e_eliminado, 0) = 0",
                    idUsuarioSupervisor,
                    supervisor,
                    grupo
            );
        } catch (DataAccessException ex) {
            // Esquema alterno (snake_case).
            return template.update(
                    "UPDATE dbo.tbl_ConformacionCuadrillaDiario " +
                            "SET id_usuario_supervisor = ?, supervisor_a_cargo = ? " +
                            "WHERE LTRIM(RTRIM(ISNULL(grupo, ''))) = LTRIM(RTRIM(?)) " +
                            "  AND ISNULL(e_eliminado, 0) = 0",
                    idUsuarioSupervisor,
                    supervisor,
                    grupo
            );
        }
    }

    public int actualizarSupervisorEnConformacionCentral(
            JdbcTemplate centralTemplate,
            String sucursal,
            String nombreGrupo,
            Integer idUsuarioSupervisor,
            String nombreSupervisor) {
        try {
            return centralTemplate.update(
                    "EXEC dbo.spx_Central_ActualizarSupervisorConformacion ?, ?, ?, ?",
                    sucursal,
                    nombreGrupo,
                    idUsuarioSupervisor,
                    nombreSupervisor
            );
        } catch (DataAccessException ex) {
            String supervisor = nombreSupervisor == null ? "" : nombreSupervisor.trim();
            try {
                return centralTemplate.update(
                        "UPDATE dbo.tbl_ConformacionCuadrillaDiario " +
                                "SET idUsuarioSupervisor = ?, supervisorACargo = ? " +
                                "WHERE LTRIM(RTRIM(ISNULL(grupo, ''))) = LTRIM(RTRIM(?)) " +
                                "  AND LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(sucursal, ''))), '_', ''), '-', ''), ' ', '')) = " +
                                "      LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(?)), '_', ''), '-', ''), ' ', '')) " +
                                "  AND ISNULL(e_eliminado, 0) = 0",
                        idUsuarioSupervisor,
                        supervisor,
                        nombreGrupo,
                        sucursal
                );
            } catch (DataAccessException ignored) {
                return centralTemplate.update(
                        "UPDATE dbo.tbl_ConformacionCuadrillaDiario " +
                                "SET id_usuario_supervisor = ?, supervisor_a_cargo = ? " +
                                "WHERE LTRIM(RTRIM(ISNULL(grupo, ''))) = LTRIM(RTRIM(?)) " +
                                "  AND LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(sucursal, ''))), '_', ''), '-', ''), ' ', '')) = " +
                                "      LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(?)), '_', ''), '-', ''), ' ', '')) " +
                                "  AND ISNULL(e_eliminado, 0) = 0",
                        idUsuarioSupervisor,
                        supervisor,
                        nombreGrupo,
                        sucursal
                );
            }
        }
    }
}
