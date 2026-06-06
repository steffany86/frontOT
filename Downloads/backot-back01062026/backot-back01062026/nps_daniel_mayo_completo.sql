-- Consulta completa NPS de DANIEL CARREÑO ROJAS para Mayo 2026
USE BDControlOrdenes;
GO

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

-- Total de registros
;WITH base AS (
    SELECT r.*, 
           ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND UPPER(LTRIM(RTRIM(r.tecnico_nombre))) = UPPER(LTRIM(RTRIM(@TecnicoNombre)))
)
SELECT 
    'Total Registros Mayo 2026' AS Descripcion,
    COUNT(*) AS Cantidad
FROM base WHERE rn=1;

GO

-- Resumen por tipo de NPS
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

;WITH base AS (
    SELECT r.*, 
           ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND UPPER(LTRIM(RTRIM(r.tecnico_nombre))) = UPPER(LTRIM(RTRIM(@TecnicoNombre)))
)
SELECT 
    nps_tipo,
    COUNT(*) AS cantidad,
    CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS porcentaje
FROM base 
WHERE rn=1
GROUP BY nps_tipo
ORDER BY cantidad DESC;

GO

-- Primeros 10 registros detallados
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

;WITH base AS (
    SELECT r.*, 
           ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND UPPER(LTRIM(RTRIM(r.tecnico_nombre))) = UPPER(LTRIM(RTRIM(@TecnicoNombre)))
)
SELECT TOP 10
    fecha_de_respuesta,
    nro_orden,
    cliente_nombre_completo,
    ltr,
    nps_tipo,
    ciudad,
    supervisor_1,
    dealer
FROM base 
WHERE rn=1
ORDER BY CONVERT(DATE, fecha_de_respuesta, 103) DESC;
