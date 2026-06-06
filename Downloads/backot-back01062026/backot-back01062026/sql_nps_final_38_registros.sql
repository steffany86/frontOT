-- SQL FINAL: Registros NPS para Daniel Carreño en Mayo 2026 (38 registros)
-- Lógica: fecha_respuesta en Mayo, EXCLUYENDO órdenes con última fecha_carga fuera de Mayo

USE BDControlOrdenes;
GO

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

-- SOLUCIÓN: Filtrar por fecha_respuesta en Mayo 
-- PERO excluir transacciones cuyo registro más reciente (rn=1) fue cargado FUERA de Mayo
;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, 
                     r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARREÑO%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
)
SELECT 
    nro_orden,
    CONVERT(VARCHAR(10), fecha_creacion, 103) AS fecha_creacion,
    CONVERT(VARCHAR(10), fecha_de_respuesta, 103) AS fecha_respuesta,
    CONVERT(VARCHAR(10), fecha_carga, 103) AS fecha_carga,
    SUBSTRING(cliente_nombre_completo, 1, 30) AS cliente,
    ltr,
    nps_tipo,
    ciudad
FROM base 
WHERE rn = 1
  AND CONVERT(DATE, fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin  -- Última carga también en Mayo
ORDER BY CONVERT(DATE, fecha_de_respuesta, 103) DESC, nro_orden;

GO

-- Contar cuántos da
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';

;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, 
                     r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARREÑO%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
)
SELECT 
    COUNT(*) AS Total_Registros,
    'Lógica del Excel: fecha_respuesta en Mayo Y última fecha_carga en Mayo' AS Descripcion
FROM base 
WHERE rn = 1
  AND CONVERT(DATE, fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin;

GO

PRINT '';
PRINT '===== ÓRDENES EXCLUIDAS (última carga fuera de Mayo) =====';

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';

;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, 
                     r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARREÑO%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
)
SELECT 
    nro_orden,
    CONVERT(VARCHAR(10), fecha_de_respuesta, 103) AS fecha_respuesta,
    CONVERT(VARCHAR(10), fecha_carga, 103) AS fecha_carga_ultima,
    SUBSTRING(cliente_nombre_completo, 1, 35) AS cliente,
    'Última carga fuera de Mayo' AS Motivo_Exclusion
FROM base 
WHERE rn = 1
  AND CONVERT(DATE, fecha_carga, 103) NOT BETWEEN @FechaInicio AND @FechaFin
ORDER BY nro_orden;
