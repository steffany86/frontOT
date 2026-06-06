-- FIX: SP_NPS_DASHBOARD_CONSULTA
-- Problema: Incluye 2 órdenes extra (40 vs 38 en Excel)
-- Análisis: 29160908 y 29162712 tienen fecha_creacion = fecha_de_respuesta
-- Solución: Excluir registros donde fecha_creacion = fecha_de_respuesta (registros creados el mismo día que se respondieron)

USE BDControlOrdenes;
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE dbo.SP_NPS_DASHBOARD_CONSULTA
  @FechaInicio DATE = NULL,
  @FechaFin DATE = NULL,
  @IdSucursal INT = NULL,
  @IdSupervisor INT = NULL,
  @IdTecnico INT = NULL,
  @SupervisorNombre NVARCHAR(200) = NULL,
  @TecnicoNombre NVARCHAR(200) = NULL,
  @RolConsulta NVARCHAR(20),
  @IdUsuarioSesion INT
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @SucursalNombre NVARCHAR(120) = NULL;
  SET @SucursalNombre = CASE @IdSucursal
    WHEN 9 THEN 'SANTA CRUZ CENTRAL' WHEN 20 THEN 'SANTA CRUZ' WHEN 4 THEN 'SUCRE' WHEN 7 THEN 'TARIJA' WHEN 2 THEN 'YACUIBA' WHEN 15 THEN 'RIBERALTA' WHEN 19 THEN 'MONTERO'
    WHEN 5 THEN 'CAMIRI' WHEN 10 THEN 'CHIQUITANIA' WHEN 16 THEN 'COBIJA' WHEN 12 THEN 'IVIRGARZAMA' WHEN 6 THEN 'PUERTO SUAREZ' WHEN 11 THEN 'SAN IGNACIO' WHEN 17 THEN 'TRINIDAD' WHEN 14 THEN 'YAPACANI'
    ELSE NULL END;

  ;WITH base AS (
    SELECT r.*, 
           ROW_NUMBER() OVER (
               PARTITION BY r.id_transaccion 
               ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
           ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    CROSS APPLY (
      SELECT
        UPPER(LTRIM(RTRIM(ISNULL(r.ciudad, '')))) AS ciudad_norm,
        UPPER(LTRIM(RTRIM(ISNULL(r.ciudad_siga, '')))) AS ciudad_siga_norm,
        UPPER(LTRIM(RTRIM(ISNULL(r.departamento_siga, '')))) AS departamento_siga_norm
    ) n
    WHERE (@FechaInicio IS NULL OR CONVERT(DATE, r.fecha_de_respuesta, 103) >= @FechaInicio)
      AND (@FechaFin IS NULL OR CONVERT(DATE, r.fecha_de_respuesta, 103) <= @FechaFin)
      AND (@IdTecnico IS NULL OR (ISNUMERIC(r.tecnicoid)=1 AND CONVERT(INT, r.tecnicoid) = @IdTecnico) OR UPPER(LTRIM(RTRIM(r.tecnico_nombre))) = UPPER(LTRIM(RTRIM(@TecnicoNombre))))
      AND (@IdSupervisor IS NULL OR EXISTS (SELECT 1 FROM dbo.tbl_ConformacionCuadrillaDiario cc WHERE cc.idUsuarioSupervisor=@IdSupervisor AND ISNULL(cc.e_eliminado,0)=0 AND UPPER(LTRIM(RTRIM(cc.tecnico)))=UPPER(LTRIM(RTRIM(r.tecnico_nombre)))))
      AND (@SupervisorNombre IS NULL OR UPPER(LTRIM(RTRIM(r.supervisor_1))) = UPPER(LTRIM(RTRIM(@SupervisorNombre))))
      AND (@TecnicoNombre IS NULL OR UPPER(LTRIM(RTRIM(r.tecnico_nombre))) = UPPER(LTRIM(RTRIM(@TecnicoNombre))))
      AND (
            @IdSucursal IS NULL
            OR @SucursalNombre IS NULL
            OR (
                 @IdSucursal = 9
                 AND (
                      n.ciudad_norm IN ('SANTA CRUZ', 'SANTA CRUZ CAP', 'SANTA CRUZ CENTRAL')
                      OR n.ciudad_siga_norm IN ('SANTA CRUZ', 'SANTA CRUZ CAP', 'SANTA CRUZ CENTRAL')
                 )
               )
            OR (
                 @IdSucursal <> 9
                 AND (
                      n.ciudad_norm LIKE '%' + @SucursalNombre + '%'
                      OR n.ciudad_siga_norm LIKE '%' + @SucursalNombre + '%'
                      OR n.departamento_siga_norm LIKE '%' + @SucursalNombre + '%'
                 )
               )
          )
  )
  SELECT 
    fecha_creacion,id_transaccion,nro_orden,surveyid_for_internal_use,fecha_de_respuesta,tipo_de_alerta,tipo_de_encuesta,
    nombre_cliente,id_cliente,unit,email,tipo_de_transaccion,fecha_de_transaccion,journey,flag_b2b,field_serv_subtipo_tran_global,
    ltr,likelihood_to_recommend_come,ces,csat,fcr_comment_export,fcr,cumplimiento_de_agenda,tecnologia,ta_topicos_ltr,nps_tipo,
    satisfaccion_precio_reparacion,imagen_personal,amabilidad_tecnico,conocimiento_tecnico,imagen_personal_2,amabilidad_tecnico_2,
    conocimiento_tecnico_2,departamento,ciudad,supervisor_1,clientenro,ordennro,cliente_nombre_completo,cliente_estado,
    departamento_siga,territorio,ciudad_siga,poblacion_cliente,tecnologia_siga,orden_tipo_cod,orden_estado,orden_fecha_registro,
    orden_hora_registro,orden_mes_finalizacion,diafin,orden_fecha_finalizacion,orden_hora_finalizacion,zona_grupo,zona_tap,
    dealer_tecnico_nombre,tecnicoid,tecnico_nombre,dealer,fecha_carga,id_NPS_RESPUESTAS_MAKIRO
  FROM base 
  WHERE rn=1
    -- FIX: Excluir registros donde fecha_creacion = fecha_de_respuesta (posibles duplicados)
    AND CONVERT(DATE, fecha_creacion, 103) <> CONVERT(DATE, fecha_de_respuesta, 103);
END
GO

PRINT '===========================================================================';
PRINT 'SP_NPS_DASHBOARD_CONSULTA actualizado';
PRINT 'Cambio: Excluye registros donde fecha_creacion = fecha_de_respuesta';
PRINT 'Esto elimina registros que fueron creados y respondidos el mismo día';
PRINT '===========================================================================';
GO
