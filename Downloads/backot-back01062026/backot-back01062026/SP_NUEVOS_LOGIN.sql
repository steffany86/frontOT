-- Nuevos SP para el flujo de login (Opcion B: un solo API, conexion dinamica a la BD de la sucursal)
-- Ejecutar en la BD de cada sucursal.

-- SP obligatorio: valida usuario y password (hash MD5+Base64)
IF OBJECT_ID('dbo.spx_ValidarUsuario', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ValidarUsuario AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ValidarUsuario
    @Login nvarchar(50),
    @PasswordHash varchar(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        u.Id_Usuario,
        u.Nombre,
        u.Loggin,
        u.Id_Rol,
        u.NecesitaCambio,
        u.UltimaModificacion,
        u.TipoUsuario,
        u.Id_Empleado,
        u.CodEmpleado,
        u.correo
    FROM dbo.tbl_usuario u
    WHERE u.E_Eliminado = 0
      AND u.Loggin = @Login
      AND u.Password = @PasswordHash;
END
GO

-- SP opcional: valida usuario + sucursal (si se quiere validar pertenencia)
IF OBJECT_ID('dbo.spx_ValidarUsuarioSucursal', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ValidarUsuarioSucursal AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ValidarUsuarioSucursal
    @Login nvarchar(50),
    @PasswordHash varchar(50),
    @Id_Sucursal int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        u.Id_Usuario,
        u.Nombre,
        u.Loggin,
        u.Id_Rol,
        u.NecesitaCambio,
        u.UltimaModificacion,
        u.TipoUsuario,
        u.Id_Empleado,
        u.CodEmpleado,
        u.correo,
        us.Id_Sucursal
    FROM dbo.tbl_usuario u
    INNER JOIN dbo.tbl_UsuarioSucursal us
        ON us.Id_Usuario = u.Id_Usuario
       AND us.E_Eliminado = 0
       AND us.Id_Sucursal = @Id_Sucursal
    WHERE u.E_Eliminado = 0
      AND u.Loggin = @Login
      AND u.Password = @PasswordHash;
END
GO
