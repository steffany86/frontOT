SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

DECLARE @rows TABLE (
  nombre NVARCHAR(200) NOT NULL,
  padre INT NOT NULL,
  pagina_asociada NVARCHAR(200) NOT NULL,
  nombre_sidebar NVARCHAR(200) NULL,
  direccion NVARCHAR(300) NULL
);

INSERT INTO @rows (nombre, padre, pagina_asociada, nombre_sidebar, direccion) VALUES
  ('tsm_OT_Dashboard', 2, 'OtDashboardPage', 'Gestion de Ordenes de Trabajo', '/ot'),
  ('tsm_OT_Crear', 2, 'OtCreatePage', NULL, '/ot/crear'),
  ('tsm_OT_Lista', 2, 'OtListPage', NULL, '/ot/lista'),
  ('tsm_OT_Detalle', 2, 'OtDetailPage', NULL, '/ot/:id'),
  ('tsm_OT_RegistrarOrdenAgendaDetalle', 2, 'OtRealizadaPage', NULL, '/ot/RegistrarOrdenAgenda_Detalle'),
  ('tsm_OT_RegistrarOrdenAgenda', 2, 'RegistrarOTAgendaPage', NULL, '/ot/RegistrarOrdenAgenda'),
  ('tsm_OT_Modificar', 2, 'OtModificarPage', NULL, '/ot/modificar'),
  ('tsm_OT_ModificarFecha', 2, 'OtModificarFechaPage', NULL, '/ot/modificar-fecha'),
  ('tsm_OT_Anular', 2, 'OtAnularPage', NULL, '/ot/anular'),
  ('tsm_CuNoRealizado_Lista', 2, 'CuNoRealizadoListPage', NULL, '/cu-no-realizado'),
  ('tsm_CuNoRealizado_Crear', 2, 'CuNoRealizadoCreatePage', NULL, '/cu-no-realizado/nuevo'),
  ('tsm_CuNoRealizado_Detalle', 2, 'CuNoRealizadoDetailPage', NULL, '/cu-no-realizado/:id'),
  ('tsm_Cuadrillas_Conformacion', 1, 'ConformacionCuadrillaPage', 'Cuadrillas', '/supervisor/conformacion-cuadrilla'),
  ('tsm_Privilegios_Admin', 3, 'PrivilegiosPage', 'Pool de Privilegios', '/admin/privilegios');

;WITH parent_order AS (
  SELECT padre, ISNULL(MAX([orden]), 0) AS max_orden
  FROM dbo.tbl_tablamenu
  WHERE ISNULL(e_eliminado, 0) = 0
  GROUP BY padre
), incoming AS (
  SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.padre ORDER BY r.nombre) AS rn,
         ISNULL(po.max_orden, 0) AS max_orden
  FROM @rows r
  LEFT JOIN parent_order po ON po.padre = r.padre
)
UPDATE t
SET t.pagina_asociada = i.pagina_asociada,
    t.nombre_sidebar = COALESCE(i.nombre_sidebar, t.nombre_sidebar),
    t.Direccion = COALESCE(i.direccion, t.Direccion),
    t.e_eliminado = 0
FROM dbo.tbl_tablamenu t
INNER JOIN incoming i ON t.nombre = i.nombre AND t.padre = i.padre;

;WITH parent_order AS (
  SELECT padre, ISNULL(MAX([orden]), 0) AS max_orden
  FROM dbo.tbl_tablamenu
  WHERE ISNULL(e_eliminado, 0) = 0
  GROUP BY padre
), incoming AS (
  SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.padre ORDER BY r.nombre) AS rn,
         ISNULL(po.max_orden, 0) AS max_orden
  FROM @rows r
  LEFT JOIN parent_order po ON po.padre = r.padre
)
INSERT INTO dbo.tbl_tablamenu (nombre, [orden], padre, e_eliminado, fecharegistro, id_Usuario, pagina_asociada, nombre_sidebar, Direccion)
SELECT i.nombre,
       i.max_orden + i.rn,
       i.padre,
       0,
       GETDATE(),
       1,
       i.pagina_asociada,
       i.nombre_sidebar,
       i.direccion
FROM incoming i
WHERE NOT EXISTS (
  SELECT 1
  FROM dbo.tbl_tablamenu t
  WHERE t.nombre = i.nombre
    AND t.padre = i.padre
);

COMMIT TRAN;

SELECT Id, nombre, padre, [orden], pagina_asociada, nombre_sidebar, Direccion, e_eliminado
FROM dbo.tbl_tablamenu
WHERE padre IN (1,2,3)
ORDER BY padre, [orden], Id;
