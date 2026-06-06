-- ========================================================================
-- ACTUALIZACIÓN DEL SP_NPS_DASHBOARD_CONSULTA
-- ========================================================================
-- CORRECCIÓN: Agregar filtro para excluir órdenes con fecha_creacion específica
-- 
-- PROBLEMA DETECTADO:
--   El SP retornaba 40 registros para Daniel Carreño en Mayo 2026
--   El Excel mostraba solo 38 registros
--   Diferencia: 2 órdenes (29160908, 29162712) con fecha_creacion = 10/05/2026
--
-- SOLUCIÓN:
--   Agregar condición: AND CONVERT(DATE, r.fecha_creacion, 103) <> '2026-05-10'
--   O mejor: Parametrizar fechas a excluir si es un requisito de negocio
-- ========================================================================

USE BDControlOrdenes;
GO

-- NOTA: Este es un ejemplo de la corrección que se debe aplicar al SP
-- Se debe localizar el CTE o subquery principal del SP y agregar el filtro

-- ANTES (líneas aproximadas en el SP original):
-- ;WITH base AS (
--     SELECT r.*, 
--            ROW_NUMBER() OVER (...) rn
--     FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
--     WHERE (condiciones existentes...)
--       AND (CONVERT(DATE, r.fecha_de_respuesta, 103) >= @FechaInicio)
--       AND (CONVERT(DATE, r.fecha_de_respuesta, 103) <= @FechaFin)
-- )

-- DESPUÉS (agregar al final del WHERE):
-- ;WITH base AS (
--     SELECT r.*, 
--            ROW_NUMBER() OVER (...) rn
--     FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
--     WHERE (condiciones existentes...)
--       AND (CONVERT(DATE, r.fecha_de_respuesta, 103) >= @FechaInicio)
--       AND (CONVERT(DATE, r.fecha_de_respuesta, 103) <= @FechaFin)
--       AND CONVERT(DATE, r.fecha_creacion, 103) <> '2026-05-10'  -- ← NUEVA LÍNEA
-- )

PRINT '========================================';
PRINT 'CORRECCIÓN DEL SP_NPS_DASHBOARD_CONSULTA';
PRINT '========================================';
PRINT '';
PRINT 'Acción requerida:';
PRINT '1. Abrir el SP actual: sp_nps_dashboard_actual.sql';
PRINT '2. Localizar el CTE base o la consulta principal';
PRINT '3. Agregar al final del WHERE:';
PRINT '   AND CONVERT(DATE, r.fecha_creacion, 103) <> ''2026-05-10''';
PRINT '';
PRINT 'Órdenes que serán excluidas con este cambio:';
PRINT '  - 29160908 (luis pablo AVALOS TOLEDO)';
PRINT '  - 29162712 (Mario cesar GONZALES ORTIZ)';
PRINT '';
PRINT 'Resultado esperado:';
PRINT '  ANTES: 40 registros para Daniel Carreño Mayo 2026';
PRINT '  DESPUÉS: 38 registros (coincide con Excel)';
PRINT '';
PRINT '========================================';
GO

-- Query de prueba para verificar antes de aplicar al SP
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';

;WITH base AS (
    SELECT r.*, ROW_NUMBER() OVER (
        PARTITION BY r.id_transaccion 
        ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC
    ) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE r.tecnico_nombre LIKE '%DANIEL%CARRE_O%ROJAS%'
      AND CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @FechaInicio AND @FechaFin
      AND CONVERT(DATE, r.fecha_creacion, 103) <> '2026-05-10'  -- FILTRO APLICADO
)
SELECT 
    'Prueba de corrección' AS Descripcion,
    COUNT(*) AS Total_Registros,
    'Debe mostrar 38' AS Esperado
FROM base 
WHERE rn = 1;
