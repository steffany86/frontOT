-- SQL para traer registros NPS con FECHA DE REGISTRO (fecha_carga) en MAYO 2026
-- Solo toma el registro más reciente por transacción
-- Base de datos: BDControlOrdenes

USE BDControlOrdenes;
GO

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

PRINT '===== OPCIÓN 1: Filtro por FECHA_CARGA en Mayo =====';
PRINT '';

;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
      AND CONVERT(DATE, r.fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin  -- Filtro por fecha_carga
)
SELECT 
    COUNT(*) AS Total_Registros,
    'Filtro: fecha_carga en Mayo' AS Criterio
FROM base 
WHERE rn = 1;

GO

-- Ver detalle de los registros
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

PRINT '';
PRINT 'Primeros 10 registros con fecha_carga en Mayo:';
PRINT '';

;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
      AND CONVERT(DATE, r.fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin
)
SELECT TOP 10
    nro_orden,
    CONVERT(VARCHAR(10), fecha_de_respuesta, 103) AS fecha_respuesta,
    CONVERT(VARCHAR(10), fecha_carga, 103) AS fecha_carga,
    SUBSTRING(cliente_nombre_completo, 1, 30) AS cliente,
    ltr,
    nps_tipo
FROM base 
WHERE rn = 1
ORDER BY CONVERT(DATE, fecha_de_respuesta, 103) DESC;

GO

PRINT '';
PRINT '===== OPCIÓN 2: Filtro COMBINADO (fecha_respuesta Y fecha_carga en Mayo) =====';
PRINT '';

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND CONVERT(DATE, r.fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin  -- Ambas fechas en mayo
)
SELECT 
    COUNT(*) AS Total_Registros,
    'Filtro: fecha_respuesta Y fecha_carga en Mayo' AS Criterio
FROM base 
WHERE rn = 1;

GO

PRINT '';
PRINT '===== OPCIÓN 3: Todas las transacciones con AL MENOS UN registro en Mayo =====';
PRINT '';

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

;WITH transacciones_mayo AS (
    -- Identificar transacciones que tienen al menos un registro cargado en mayo
    SELECT DISTINCT id_transaccion
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO
    WHERE tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
      AND CONVERT(DATE, fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin
),
base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    INNER JOIN transacciones_mayo tm ON r.id_transaccion = tm.id_transaccion
    WHERE r.tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
)
SELECT 
    COUNT(*) AS Total_Registros,
    'Filtro: Al menos un registro en Mayo, toma el más reciente' AS Criterio
FROM base 
WHERE rn = 1;

GO

PRINT '';
PRINT '===== COMPARACIÓN: 38 vs 40 registros =====';
PRINT '';

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

-- Contar con diferentes criterios
SELECT 
    'fecha_respuesta en Mayo' AS Criterio,
    COUNT(DISTINCT r.id_transaccion) AS Total
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
WHERE r.tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
  AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin

UNION ALL

SELECT 
    'fecha_carga en Mayo' AS Criterio,
    COUNT(DISTINCT r.id_transaccion) AS Total
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
WHERE r.tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
  AND CONVERT(DATE, r.fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin

UNION ALL

SELECT 
    'fecha_respuesta Y fecha_carga en Mayo' AS Criterio,
    COUNT(DISTINCT r.id_transaccion) AS Total
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
WHERE r.tecnico_nombre LIKE '%' + @TecnicoNombre + '%'
  AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
  AND CONVERT(DATE, r.fecha_carga, 103) BETWEEN @FechaInicio AND @FechaFin;
