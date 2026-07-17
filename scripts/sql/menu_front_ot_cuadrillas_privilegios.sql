/*
  Crea/actualiza menus hijos para paginas Front (OT, Cuadrillas, Privilegios).
  Padres esperados:
    1 = tsm_ConformacionCuadrillas
    2 = tsm_GestionOTs
    3 = tsm_privilegios

  Nota:
  - Este script usa SQL Server (T-SQL).
  - Es idempotente: si el menu (nombre + padre) existe, solo actualiza pagina_asociada.
*/

SET NOCOUNT ON;

DECLARE @menus TABLE (
  nombre NVARCHAR(150) NOT NULL,
  padre INT NOT NULL,
  pagina_asociada NVARCHAR(150) NOT NULL,
  nombre_sidebar NVARCHAR(150) NULL
);

/* OT (padre = 2) */
INSERT INTO @menus (nombre, padre, pagina_asociada, nombre_sidebar) VALUES
  ('tsm_OT_Dashboard', 2, 'OtDashboardPage', 'Gestion de Ordenes de Trabajo'),
  ('tsm_OT_Crear', 2, 'OtCreatePage', 'Crear OT'),
  ('tsm_OT_Lista', 2, 'OtListPage', 'Ordenes pendientes'),
  ('tsm_OT_Detalle', 2, 'OtDetailPage', 'Detalle OT'),
  ('tsm_OT_RegistrarOrdenAgendaDetalle', 2, 'OtRealizadaPage', 'Registrar detalle'),
  ('tsm_OT_RegistrarOrdenAgenda', 2, 'RegistrarOTAgendaPage', 'Registrar OT Agenda'),
  ('tsm_OT_Modificar', 2, 'OtModificarPage', 'Modificar OT'),
  ('tsm_OT_ModificarFecha', 2, 'OtModificarFechaPage', 'Modificar fecha OT'),
  ('tsm_OT_Anular', 2, 'OtAnularPage', 'Anular OT'),
  ('tsm_CuNoRealizado_Lista', 2, 'CuNoRealizadoListPage', 'CU No Realizado'),
  ('tsm_CuNoRealizado_Crear', 2, 'CuNoRealizadoCreatePage', 'Registrar CU No Realizado'),
  ('tsm_CuNoRealizado_Detalle', 2, 'CuNoRealizadoDetailPage', 'Detalle CU No Realizado');

/* Cuadrillas (padre = 1) */
INSERT INTO @menus (nombre, padre, pagina_asociada, nombre_sidebar) VALUES
  ('tsm_Cuadrillas_Conformacion', 1, 'ConformacionCuadrillaPage', 'Cuadrillas');

/* Privilegios (padre = 3) */
INSERT INTO @menus (nombre, padre, pagina_asociada, nombre_sidebar) VALUES
  ('tsm_Privilegios_Admin', 3, 'PrivilegiosPage', 'Pool de Privilegios');

/*
  UPSERT por (nombre, padre).
  Ajusta columnas si tu tabla usa otro nombre:
    - id_menu / idMenu
    - nombre_sidebar / nombreSidebar
*/
MERGE INTO menu AS target
USING @menus AS src
ON target.nombre = src.nombre
   AND target.padre = src.padre
WHEN MATCHED THEN
  UPDATE SET
    target.pagina_asociada = src.pagina_asociada,
    target.nombre_sidebar = src.nombre_sidebar
WHEN NOT MATCHED THEN
  INSERT (nombre, padre, pagina_asociada, nombre_sidebar)
  VALUES (src.nombre, src.padre, src.pagina_asociada, src.nombre_sidebar);

/* Verificacion */
SELECT idMenu, nombre, padre, pagina_asociada, nombre_sidebar
FROM menu
WHERE (padre IN (1,2,3) AND nombre LIKE 'tsm_%')
ORDER BY padre, nombre;

