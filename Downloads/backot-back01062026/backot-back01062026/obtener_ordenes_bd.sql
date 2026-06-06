
USE BDControlOrdenes;
GO

DECLARE @F1 DATE = '2026-05-01', @F2 DATE = '2026-05-31';

WITH base AS (
    SELECT 
        r.nro_orden,
        r.fecha_de_respuesta,
        r.cliente_nombre_completo,
        r.tecnico_nombre,
        ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE CONVERT(DATE, r.fecha_de_respuesta, 103) BETWEEN @F1 AND @F2
      AND r.tecnico_nombre LIKE '%DANIEL CARREÑO ROJAS%'
)
SELECT 
    nro_orden,
    CONVERT(VARCHAR(10), fecha_de_respuesta, 103) AS fecha_respuesta,
    cliente_nombre_completo
FROM base 
WHERE rn=1
ORDER BY nro_orden;
