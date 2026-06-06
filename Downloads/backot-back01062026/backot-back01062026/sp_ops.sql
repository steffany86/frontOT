SET NOCOUNT ON;
SELECT
  SCHEMA_NAME(p.schema_id) AS schema_name,
  p.name AS proc_name,
  CASE WHEN LOWER(m.definition) LIKE '%select%' THEN 1 ELSE 0 END AS has_select,
  CASE WHEN LOWER(m.definition) LIKE '%insert%' THEN 1 ELSE 0 END AS has_insert,
  CASE WHEN LOWER(m.definition) LIKE '%update%' THEN 1 ELSE 0 END AS has_update,
  CASE WHEN LOWER(m.definition) LIKE '%delete%' THEN 1 ELSE 0 END AS has_delete,
  CASE WHEN LOWER(m.definition) LIKE '%merge%' THEN 1 ELSE 0 END AS has_merge,
  CASE WHEN LOWER(m.definition) LIKE '%exec%' OR LOWER(m.definition) LIKE '%execute%' THEN 1 ELSE 0 END AS has_exec,
  CASE
    WHEN LOWER(p.name) LIKE '%login%' OR LOWER(m.definition) LIKE '%login%' OR LOWER(m.definition) LIKE '%token%' OR LOWER(m.definition) LIKE '%auth%' OR LOWER(m.definition) LIKE '%usuario%' THEN 'auth'
    WHEN LOWER(p.name) LIKE '%report%' OR LOWER(p.name) LIKE '%reporte%' OR LOWER(p.name) LIKE '%rpt%' OR LOWER(m.definition) LIKE '%report%' OR LOWER(m.definition) LIKE '%reporte%' OR LOWER(m.definition) LIKE '%kpi%' THEN 'report'
    WHEN LOWER(p.name) LIKE '%manten%' OR LOWER(p.name) LIKE '%maintenance%' OR LOWER(m.definition) LIKE '%cleanup%' OR LOWER(m.definition) LIKE '%purge%' OR LOWER(m.definition) LIKE '%archive%' THEN 'maintenance'
    WHEN LOWER(p.name) LIKE '%sync%' OR LOWER(p.name) LIKE '%sincron%' OR LOWER(m.definition) LIKE '%import%' OR LOWER(m.definition) LIKE '%export%' OR LOWER(m.definition) LIKE '%etl%' THEN 'sync'
    WHEN LOWER(p.name) LIKE '%config%' OR LOWER(p.name) LIKE '%param%' OR LOWER(p.name) LIKE '%catalog%' OR LOWER(p.name) LIKE '%cat_%' OR LOWER(m.definition) LIKE '%config%' OR LOWER(m.definition) LIKE '%param%' OR LOWER(m.definition) LIKE '%catalog%' THEN 'config'
    WHEN LOWER(p.name) LIKE '%factura%' OR LOWER(p.name) LIKE '%cobro%' OR LOWER(p.name) LIKE '%pago%' OR LOWER(m.definition) LIKE '%invoice%' OR LOWER(m.definition) LIKE '%payment%' THEN 'billing'
    WHEN LOWER(p.name) LIKE '%invent%' OR LOWER(p.name) LIKE '%stock%' OR LOWER(p.name) LIKE '%almacen%' OR LOWER(m.definition) LIKE '%warehouse%' OR LOWER(m.definition) LIKE '%producto%' THEN 'inventory'
    WHEN LOWER(p.name) LIKE '%cliente%' OR LOWER(p.name) LIKE '%account%' OR LOWER(p.name) LIKE '%abonado%' OR LOWER(m.definition) LIKE '%cliente%' OR LOWER(m.definition) LIKE '%customer%' THEN 'customer'
    WHEN LOWER(p.name) LIKE '%pedido%' OR LOWER(p.name) LIKE '%venta%' OR LOWER(p.name) LIKE '%order%' OR LOWER(m.definition) LIKE '%sale%' THEN 'order'
    WHEN LOWER(p.name) LIKE '%tecnico%' OR LOWER(p.name) LIKE '%antena%' OR LOWER(p.name) LIKE '%ticket%' OR LOWER(m.definition) LIKE '%soporte%' OR LOWER(m.definition) LIKE '%support%' THEN 'tech'
    ELSE 'general'
  END AS uso_probable
FROM sys.procedures p
JOIN sys.sql_modules m ON p.object_id = m.object_id
ORDER BY schema_name, proc_name;
