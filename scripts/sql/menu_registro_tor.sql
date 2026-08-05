SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

DECLARE @nombre NVARCHAR(200) = 'tsm_Registro_TOR';
DECLARE @paginaAsociada NVARCHAR(200) = 'RegistroTorPage';
DECLARE @nombreSidebar NVARCHAR(200) = 'Registro_TOR BackOffice';
DECLARE @direccion NVARCHAR(300) = '/Registro_TOR';
DECLARE @padre INT = 2;
DECLARE @orden INT;

SELECT @orden = ISNULL(MAX([orden]), 0) + 1
FROM dbo.tbl_tablamenu
WHERE padre = @padre
  AND ISNULL(e_eliminado, 0) = 0;

UPDATE dbo.tbl_tablamenu
SET pagina_asociada = @paginaAsociada,
    nombre_sidebar = @nombreSidebar,
    Direccion = @direccion,
    e_eliminado = 0
WHERE nombre = @nombre
  AND padre = @padre;

IF @@ROWCOUNT = 0
BEGIN
  INSERT INTO dbo.tbl_tablamenu (
    nombre,
    [orden],
    padre,
    e_eliminado,
    fecharegistro,
    id_Usuario,
    pagina_asociada,
    nombre_sidebar,
    Direccion
  )
  VALUES (
    @nombre,
    @orden,
    @padre,
    0,
    GETDATE(),
    1,
    @paginaAsociada,
    @nombreSidebar,
    @direccion
  );
END;

COMMIT TRAN;

SELECT Id, nombre, padre, [orden], pagina_asociada, nombre_sidebar, Direccion, e_eliminado
FROM dbo.tbl_tablamenu
WHERE nombre = @nombre
  AND padre = @padre;
