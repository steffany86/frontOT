-- Búsqueda ampliada de datos NPS de Daniel Carreño
-- Para verificar si existen datos en otros períodos o con otros nombres

USE BDControlOrdenes;
GO

PRINT '=== 1. Buscar registros con "Daniel" o "Carreno" en cualquier periodo ===';
SELECT TOP 20
    fecha_de_respuesta,
    tecnico_nombre,
    dealer_tecnico_nombre,
    COUNT(*) OVER (PARTITION BY tecnico_nombre) AS total_registros_tecnico
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO
WHERE UPPER(tecnico_nombre) LIKE '%DANIEL%' 
   OR UPPER(dealer_tecnico_nombre) LIKE '%DANIEL%'
   OR UPPER(tecnico_nombre) LIKE '%CARREN%'
   OR UPPER(dealer_tecnico_nombre) LIKE '%CARREN%'
ORDER BY CONVERT(DATE, fecha_de_respuesta, 103) DESC;

GO

PRINT '=== 2. Resumen por técnico que contenga "Daniel" ===';
SELECT 
    tecnico_nombre,
    COUNT(*) AS total_respuestas,
    MIN(fecha_de_respuesta) AS primera_respuesta,
    MAX(fecha_de_respuesta) AS ultima_respuesta
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO
WHERE UPPER(tecnico_nombre) LIKE '%DANIEL%'
GROUP BY tecnico_nombre
ORDER BY total_respuestas DESC;

GO

PRINT '=== 3. Técnicos con más respuestas NPS en mayo 2026 ===';
SELECT TOP 10
    tecnico_nombre,
    COUNT(*) AS total_respuestas_mayo_2026
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO
WHERE CONVERT(DATE, fecha_de_respuesta, 103) BETWEEN '2026-05-01' AND '2026-05-31'
GROUP BY tecnico_nombre
ORDER BY total_respuestas_mayo_2026 DESC;

GO

PRINT '=== 4. Total de registros NPS en mayo 2026 ===';
SELECT COUNT(*) AS total_registros_mayo_2026
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO
WHERE CONVERT(DATE, fecha_de_respuesta, 103) BETWEEN '2026-05-01' AND '2026-05-31';

GO

PRINT '=== 5. Verificar en tabla de Invitaciones ===';
SELECT TOP 20
    fecha_creacion,
    tecnico,
    dealer,
    external_transaction_id,
    respuesta,
    fecha_respuesta
FROM dbo.tbl_NPS_INVITACIONES_MAKIRO
WHERE UPPER(tecnico) LIKE '%DANIEL%CARREN%'
   OR UPPER(tecnico) LIKE '%CARREN%DANIEL%'
ORDER BY id_NPS_INVITACIONES_MAKIRO DESC;
