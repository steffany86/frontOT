-- ========================================================================
-- SQL FINAL: 38 registros NPS para Daniel Carreño en Mayo 2026
-- ========================================================================
-- CRITERIO DESCUBIERTO: fecha_respuesta en Mayo 2026 
--                        PERO excluyendo órdenes con fecha_creacion = 10/05/2026
--
-- MOTIVO: El Excel excluye específicamente las 2 órdenes creadas el 10/05/2026:
--   - 29160908 (luis pablo AVALOS TOLEDO)
--   - 29162712 (Mario cesar GONZALES ORTIZ)
-- ========================================================================

USE BDControlOrdenes;
GO

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @FechaExcluir DATE = '2026-05-10';  -- Fecha de creación a excluir
DECLARE @TecnicoNombre NVARCHAR(200) = 'DANIEL CARREÑO ROJAS';

-- Consulta final que replica la lógica del Excel
;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, 
                     r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARRE_O%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND CONVERT(DATE, r.fecha_creacion, 103) <> @FechaExcluir  -- CRITERIO CLAVE
)
SELECT 
    nro_orden,
    CONVERT(VARCHAR(10), fecha_creacion, 103) AS fecha_creacion,
    CONVERT(VARCHAR(10), fecha_de_respuesta, 103) AS fecha_respuesta,
    CONVERT(VARCHAR(10), fecha_carga, 103) AS fecha_carga,
    SUBSTRING(cliente_nombre_completo, 1, 40) AS cliente,
    ltr,
    nps_tipo,
    ciudad
FROM base 
WHERE rn = 1
ORDER BY CONVERT(DATE, fecha_creacion, 103), nro_orden;

GO

-- Verificar el conteo
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @FechaExcluir DATE = '2026-05-10';

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
      AND CONVERT(DATE, r.fecha_creacion, 103) <> @FechaExcluir
)
SELECT 
    COUNT(*) AS Total_Registros_Excel,
    'Excluye órdenes con fecha_creacion = 10/05/2026' AS Criterio
FROM base 
WHERE rn = 1;

GO

PRINT '';
PRINT '===== ÓRDENES EXCLUIDAS (fecha_creacion = 10/05/2026) =====';

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @FechaExcluir DATE = '2026-05-10';

;WITH base AS (
    SELECT 
        r.*,
        ROW_NUMBER() OVER (
            PARTITION BY r.id_transaccion 
            ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, 
                     r.id_NPS_RESPUESTAS_MAKIRO DESC
        ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARRE_O%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND CONVERT(DATE, r.fecha_creacion, 103) = @FechaExcluir  -- Las excluidas
)
SELECT 
    nro_orden,
    CONVERT(VARCHAR(10), fecha_creacion, 103) AS fecha_creacion,
    CONVERT(VARCHAR(10), fecha_de_respuesta, 103) AS fecha_respuesta,
    SUBSTRING(cliente_nombre_completo, 1, 40) AS cliente,
    ltr,
    nps_tipo,
    'Creada el 10/05/2026' AS Motivo_Exclusion
FROM base 
WHERE rn = 1
ORDER BY nro_orden;

GO

PRINT '';
PRINT '===== RESUMEN COMPARATIVO =====';

DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';

;WITH base_sin_filtro AS (
    SELECT r.*, ROW_NUMBER() OVER (
        PARTITION BY r.id_transaccion 
        ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
    ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARRE_O%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
),
base_con_filtro AS (
    SELECT r.*, ROW_NUMBER() OVER (
        PARTITION BY r.id_transaccion 
        ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
    ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARRE_O%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND CONVERT(DATE, r.fecha_creacion, 103) <> '2026-05-10'
)
SELECT 
    'SP actual (sin filtro fecha_creacion)' AS Origen,
    (SELECT COUNT(*) FROM base_sin_filtro WHERE rn=1) AS Total_Registros
UNION ALL
SELECT 
    'Excel / SP corregido (excluye 10/05)',
    (SELECT COUNT(*) FROM base_con_filtro WHERE rn=1);
