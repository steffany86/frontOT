SET NOCOUNT ON;

IF OBJECT_ID('dbo.tbl_Rol', 'U') IS NULL
BEGIN
    RAISERROR('No existe la tabla dbo.tbl_Rol en la base actual.', 16, 1);
    RETURN;
END;

DECLARE @NombreRol NVARCHAR(100) = N'Central';
DECLARE @IdRolCentral INT;

SELECT TOP 1
       @IdRolCentral = r.Id_Rol
FROM dbo.tbl_Rol r
WHERE LOWER(LTRIM(RTRIM(r.Nombre))) = LOWER(LTRIM(RTRIM(@NombreRol)));

IF @IdRolCentral IS NULL
BEGIN
    INSERT INTO dbo.tbl_Rol (Nombre, E_Eliminado)
    VALUES (@NombreRol, 0);

    SET @IdRolCentral = SCOPE_IDENTITY();
END
ELSE
BEGIN
    UPDATE dbo.tbl_Rol
    SET Nombre = @NombreRol,
        E_Eliminado = 0
    WHERE Id_Rol = @IdRolCentral;
END;

SELECT TOP 1
       r.Id_Rol,
       r.Nombre,
       ISNULL(r.E_Eliminado, 0) AS E_Eliminado
FROM dbo.tbl_Rol r
WHERE r.Id_Rol = @IdRolCentral;
