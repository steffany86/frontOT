-- Resumen completo NPS Daniel Carreño - Mayo 2026
USE BDControlOrdenes;
GO

DECLARE @F1 DATE = '2026-05-01', @F2 DATE = '2026-05-31';

PRINT '===== DANIEL CARREÑO ROJAS - MAYO 2026 =====';
PRINT '';

-- 1. Total de registros únicos
PRINT '1. TOTAL DE REGISTROS:';
WITH base AS (
    SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @F1 AND @F2
      AND r.tecnico_nombre LIKE '%DANIEL CARREÑO ROJAS%'
)
SELECT COUNT(*) AS Total_Registros_Unicos FROM base WHERE rn=1;

PRINT '';
PRINT '2. DISTRIBUCIÓN POR TIPO DE NPS:';
WITH base AS (
    SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @F1 AND @F2
      AND r.tecnico_nombre LIKE '%DANIEL CARREÑO ROJAS%'
)
SELECT 
    nps_tipo,
    COUNT(*) AS Cantidad,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS Porcentaje
FROM base WHERE rn=1
GROUP BY nps_tipo
ORDER BY Cantidad DESC;

PRINT '';
PRINT '3. DISTRIBUCIÓN POR CIUDAD:';
WITH base AS (
    SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @F1 AND @F2
      AND r.tecnico_nombre LIKE '%DANIEL CARREÑO ROJAS%'
)
SELECT 
    ISNULL(LTRIM(RTRIM(ciudad)), 'Sin ciudad') AS Ciudad,
    COUNT(*) AS Cantidad
FROM base WHERE rn=1
GROUP BY ciudad
ORDER BY Cantidad DESC;

PRINT '';
PRINT '4. PROMEDIO LTR (Likelihood to Recommend):';
WITH base AS (
    SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @F1 AND @F2
      AND r.tecnico_nombre LIKE '%DANIEL CARREÑO ROJAS%'
)
SELECT 
    AVG(CASE WHEN ISNUMERIC(ltr)=1 THEN CAST(ltr AS FLOAT) ELSE NULL END) AS Promedio_LTR,
    MIN(CASE WHEN ISNUMERIC(ltr)=1 THEN CAST(ltr AS INT) ELSE NULL END) AS LTR_Minimo,
    MAX(CASE WHEN ISNUMERIC(ltr)=1 THEN CAST(ltr AS INT) ELSE NULL END) AS LTR_Maximo
FROM base WHERE rn=1;

PRINT '';
PRINT '5. PRIMEROS 10 REGISTROS:';
WITH base AS (
    SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @F1 AND @F2
      AND r.tecnico_nombre LIKE '%DANIEL CARREÑO ROJAS%'
)
SELECT TOP 10
    CONVERT(VARCHAR(10), fecha_de_respuesta, 103) AS Fecha,
    nro_orden AS Orden,
    LTRIM(RTRIM(ISNULL(cliente_nombre_completo, id_cliente))) AS Cliente,
    ltr AS LTR,
    nps_tipo AS Tipo_NPS,
    LTRIM(RTRIM(ciudad)) AS Ciudad
FROM base WHERE rn=1
ORDER BY CONVERT(DATE, fecha_de_respuesta, 103) DESC;
