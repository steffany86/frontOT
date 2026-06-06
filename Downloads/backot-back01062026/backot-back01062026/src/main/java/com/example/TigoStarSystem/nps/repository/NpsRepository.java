package com.example.TigoStarSystem.nps.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.dao.DataAccessException;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class NpsRepository {

    public List<Map<String, Object>> listarSupervisoresSucursal(JdbcTemplate sucursalTemplate, Integer idSucursal) {
        return sucursalTemplate.queryForList("EXEC dbo.SP_NPS_LISTAR_SUPERVISORES_SUCURSAL ?", idSucursal);
    }

    public List<Map<String, Object>> listarTecnicosPorSupervisor(JdbcTemplate sucursalTemplate, Integer idSucursal, Integer idSupervisor) {
        return sucursalTemplate.queryForList("EXEC dbo.SP_NPS_LISTAR_TECNICOS_POR_SUPERVISOR ?, ?", idSucursal, idSupervisor);
    }

    public List<Map<String, Object>> listarTecnicosDeSupervisorEnCentral(JdbcTemplate centralTemplate, Integer idSupervisor, Integer idSucursal) {
        return centralTemplate.queryForList("EXEC dbo.SP_NPS_LISTAR_TECNICOS_SUPERVISOR_CENTRAL ?, ?", idSupervisor, idSucursal);
    }

    public List<Map<String, Object>> listarTecnicosHistoricosSupervisorNps(JdbcTemplate centralTemplate, Integer idSupervisor, Integer idSucursal) {
        return centralTemplate.queryForList("EXEC dbo.SP_NPS_LISTAR_TECNICOS_SUPERVISOR_HISTORICO ?, ?", idSupervisor, idSucursal);
    }

    public List<Map<String, Object>> obtenerDashboard(
            JdbcTemplate centralTemplate,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Integer idSucursal,
            Integer idSupervisor,
            Integer idTecnico,
            String supervisorNombre,
            String tecnicoNombre,
            String rolConsulta,
            Integer idUsuarioSesion) {
        Date fechaInicioSql = fechaInicio == null ? null : Date.valueOf(fechaInicio);
        Date fechaFinSql = fechaFin == null ? null : Date.valueOf(fechaFin);
        return centralTemplate.queryForList(
                "EXEC dbo.SP_NPS_DASHBOARD_CONSULTA ?, ?, ?, ?, ?, ?, ?, ?, ?",
                fechaInicioSql,
                fechaFinSql,
                idSucursal,
                idSupervisor,
                idTecnico,
                supervisorNombre,
                tecnicoNombre,
                rolConsulta,
                idUsuarioSesion
        );
    }

    public List<Map<String, Object>> listarFiltrosCentralPorNombres(JdbcTemplate centralTemplate, Integer idSucursal) {
        return centralTemplate.queryForList("EXEC dbo.SP_NPS_FILTROS_CENTRAL_NOMBRES ?", idSucursal);
    }

    public List<Map<String, Object>> obtenerDashboardInvitado(
            JdbcTemplate centralTemplate,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Integer idSucursal,
            Integer idSupervisor,
            Integer idTecnico,
            String supervisorNombre,
            String tecnicoNombre) {
        Date fechaInicioSql = fechaInicio == null ? null : Date.valueOf(fechaInicio);
        Date fechaFinSql = fechaFin == null ? null : Date.valueOf(fechaFin);
        return centralTemplate.queryForList(
                "DECLARE @SucursalNombre NVARCHAR(120) = CASE ? " +
                        "WHEN 9 THEN 'SANTA CRUZ' WHEN 20 THEN 'SANTA CRUZ' WHEN 4 THEN 'SUCRE' WHEN 7 THEN 'TARIJA' WHEN 2 THEN 'YACUIBA' WHEN 15 THEN 'RIBERALTA' WHEN 19 THEN 'MONTERO' " +
                        "WHEN 5 THEN 'CAMIRI' WHEN 10 THEN 'CHIQUITANIA' WHEN 16 THEN 'COBIJA' WHEN 12 THEN 'IVIRGARZAMA' WHEN 6 THEN 'PUERTO SUAREZ' WHEN 11 THEN 'SAN IGNACIO' WHEN 17 THEN 'TRINIDAD' WHEN 14 THEN 'YAPACANI' " +
                        "ELSE NULL END; " +
                        "DECLARE @SucursalNombreNorm NVARCHAR(120) = REPLACE(REPLACE(UPPER(ISNULL(@SucursalNombre,'')), ' ', ''), '_', ''); " +
                        "WITH base AS ( " +
                        "  SELECT i.*, rel.supervisorACargo AS _supervisorACargo, rel.idUsuarioSupervisor AS _idUsuarioSupervisor, rel.sucursal AS _sucursal, " +
                        "         ROW_NUMBER() OVER (PARTITION BY i.external_transaction_id ORDER BY " +
                        "             CASE WHEN ISDATE(i.fecha_carga)=1 THEN CONVERT(DATETIME, i.fecha_carga, 103) ELSE CONVERT(DATETIME, '1900-01-01', 120) END DESC, " +
                        "             i.id_NPS_INVITACIONES_MAKIRO DESC) _rn " +
                        "  FROM dbo.tbl_NPS_INVITACIONES_MAKIRO i " +
                        "  OUTER APPLY ( " +
                        "      SELECT TOP 1 cc.supervisorACargo, cc.idUsuarioSupervisor, cc.sucursal " +
                        "      FROM dbo.tbl_ConformacionCuadrillaDiario cc " +
                        "      WHERE ISNULL(cc.e_eliminado,0)=0 AND UPPER(LTRIM(RTRIM(cc.tecnico))) = UPPER(LTRIM(RTRIM(i.tecnico))) " +
                        "      ORDER BY cc.fecha DESC, cc.id DESC " +
                        "  ) rel " +
                        "  WHERE (? IS NULL OR (ISDATE(i.fecha_creacion)=1 AND CONVERT(DATE, i.fecha_creacion, 103) >= ?)) " +
                        "    AND (? IS NULL OR (ISDATE(i.fecha_creacion)=1 AND CONVERT(DATE, i.fecha_creacion, 103) <= ?)) " +
                        "    AND (? IS NULL OR UPPER(LTRIM(RTRIM(i.tecnico))) = UPPER(LTRIM(RTRIM(?)))) " +
                        "    AND (? IS NULL OR UPPER(LTRIM(RTRIM(i.tecnico))) = UPPER(LTRIM(RTRIM(?)))) " +
                        "    AND (? IS NULL OR rel.idUsuarioSupervisor = ?) " +
                        "    AND (? IS NULL OR UPPER(LTRIM(RTRIM(rel.supervisorACargo))) = UPPER(LTRIM(RTRIM(?)))) " +
                        "    AND (? IS NULL OR @SucursalNombre IS NULL OR ISNULL(rel.sucursal,'') = '' OR REPLACE(REPLACE(UPPER(ISNULL(rel.sucursal,'')), ' ', ''), '_', '') LIKE '%' + @SucursalNombreNorm + '%') " +
                        ") " +
                        "SELECT " +
                        "  i.fecha_creacion AS fecha_creacion, " +
                        "  i.external_transaction_id AS id_transaccion, " +
                        "  i.external_transaction_id AS nro_orden, " +
                        "  i.external_transaction_id AS surveyid_for_internal_use, " +
                        "  ISNULL(i.fecha_respuesta, i.fecha_creacion) AS fecha_de_respuesta, " +
                        "  NULL AS tipo_de_alerta, NULL AS tipo_de_encuesta, " +
                        "  i.id_cliente AS nombre_cliente, i.id_cliente AS id_cliente, " +
                        "  NULL AS unit, NULL AS email, i.tipo_transaccion AS tipo_de_transaccion, i.fecha_transaccion AS fecha_de_transaccion, " +
                        "  NULL AS journey, NULL AS flag_b2b, NULL AS field_serv_subtipo_tran_global, " +
                        "  i.respuesta AS ltr, i.respuesta AS likelihood_to_recommend_come, NULL AS ces, NULL AS csat, NULL AS fcr_comment_export, NULL AS fcr, " +
                        "  NULL AS cumplimiento_de_agenda, i.tecnologia AS tecnologia, NULL AS ta_topicos_ltr, " +
                        "  CASE WHEN ISNUMERIC(NULLIF(LTRIM(RTRIM(i.respuesta)), ''))=1 AND CONVERT(INT, NULLIF(LTRIM(RTRIM(i.respuesta)), '')) >= 9 THEN 'PROMOTOR' " +
                        "       WHEN ISNUMERIC(NULLIF(LTRIM(RTRIM(i.respuesta)), ''))=1 AND CONVERT(INT, NULLIF(LTRIM(RTRIM(i.respuesta)), '')) >= 7 THEN 'PASIVO' " +
                        "       WHEN ISNUMERIC(NULLIF(LTRIM(RTRIM(i.respuesta)), ''))=1 AND CONVERT(INT, NULLIF(LTRIM(RTRIM(i.respuesta)), '')) >= 0 THEN 'DETRACTOR' " +
                        "       ELSE 'SIN_RESPUESTA' END AS nps_tipo, " +
                        "  NULL AS satisfaccion_precio_reparacion, NULL AS imagen_personal, NULL AS amabilidad_tecnico, NULL AS conocimiento_tecnico, NULL AS imagen_personal_2, NULL AS amabilidad_tecnico_2, NULL AS conocimiento_tecnico_2, " +
                        "  NULL AS departamento, ISNULL(i._sucursal, '-') AS ciudad, i._supervisorACargo AS supervisor_1, " +
                        "  i.id_cliente AS clientenro, i.external_transaction_id AS ordennro, i.id_cliente AS cliente_nombre_completo, " +
                        "  NULL AS cliente_estado, NULL AS departamento_siga, NULL AS territorio, ISNULL(i._sucursal, '-') AS ciudad_siga, NULL AS poblacion_cliente, NULL AS tecnologia_siga, " +
                        "  NULL AS orden_tipo_cod, NULL AS orden_estado, NULL AS orden_fecha_registro, NULL AS orden_hora_registro, NULL AS orden_mes_finalizacion, NULL AS diafin, NULL AS orden_fecha_finalizacion, NULL AS orden_hora_finalizacion, NULL AS zona_grupo, NULL AS zona_tap, " +
                        "  i.tecnico AS dealer_tecnico_nombre, NULL AS tecnicoid, i.tecnico AS tecnico_nombre, i.dealer AS dealer, i.fecha_carga AS fecha_carga, i.id_NPS_INVITACIONES_MAKIRO AS id_NPS_RESPUESTAS_MAKIRO, " +
                        "  i.telefono_encuesta AS telefono_encuesta, i.contratista AS contratista, i.respuesta AS respuesta, i.fecha_respuesta AS fecha_respuesta, i.mes_respuesta AS mes_respuesta, " +
                        "  CASE WHEN ISDATE(i.fecha_creacion)=1 THEN DATEDIFF(DAY, CONVERT(DATE, i.fecha_creacion, 103), CONVERT(DATE, GETDATE())) ELSE NULL END AS dias_envio " +
                        "FROM base i WHERE i._rn=1;",
                idSucursal,
                fechaInicioSql, fechaInicioSql,
                fechaFinSql, fechaFinSql,
                tecnicoNombre, tecnicoNombre,
                tecnicoNombre, tecnicoNombre,
                idSupervisor, idSupervisor,
                supervisorNombre, supervisorNombre,
                idSucursal
        );
    }

    public List<Integer> listarIdsTecnicoNpsPorUsuario(JdbcTemplate sucursalTemplate, Integer idUsuario) {
        List<Integer> out = new ArrayList<Integer>();
        String[] sqls = new String[] {
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_UsuarioTecnico ut WHERE ut.id_usuario = ? AND ut.id_vendedor IS NOT NULL",
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_UsuarioTecnico ut WHERE ut.id_tecnico = ? AND ut.id_vendedor IS NOT NULL",
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_UsuarioTecnico ut WHERE ut.Id_Tecnico = ? AND ut.id_vendedor IS NOT NULL",
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_UsuarioTecnico ut WHERE ut.Id_Usuario = ? AND ut.id_vendedor IS NOT NULL",
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_usuariotecnico ut WHERE ut.id_usuario = ? AND ut.id_vendedor IS NOT NULL",
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_usuariotecnico ut WHERE ut.id_tecnico = ? AND ut.id_vendedor IS NOT NULL",
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_usuaritecnico ut WHERE ut.id_usuario = ? AND ut.id_vendedor IS NOT NULL",
                "SELECT DISTINCT ut.id_vendedor AS idTecnicoNps FROM dbo.tbl_usuaritecnico ut WHERE ut.id_tecnico = ? AND ut.id_vendedor IS NOT NULL"
        };
        for (String sql : sqls) {
            try {
                List<Map<String, Object>> rows = sucursalTemplate.queryForList(sql, idUsuario);
                for (Map<String, Object> row : rows) {
                    Object value = row.get("idTecnicoNps");
                    if (value instanceof Number) {
                        out.add(((Number) value).intValue());
                        continue;
                    }
                    if (value != null) {
                        try {
                            out.add(Integer.parseInt(String.valueOf(value).trim()));
                        } catch (Exception ignore) {
                            // skip invalid ids
                        }
                    }
                }
                if (!out.isEmpty()) break;
            } catch (DataAccessException ex) {
                // Try next variant for schema compatibility.
            }
        }
        return out;
    }
}
