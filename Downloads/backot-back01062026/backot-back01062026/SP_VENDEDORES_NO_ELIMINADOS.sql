SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID('dbo.spx_ObtenerVendedoresNoEliminados', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerVendedoresNoEliminados AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO

ALTER PROC dbo.spx_ObtenerVendedoresNoEliminados
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @tabla SYSNAME = NULL;
    DECLARE @colEliminado SYSNAME = NULL;
    DECLARE @colNombre SYSNAME = NULL;
    DECLARE @sql NVARCHAR(MAX);

    IF OBJECT_ID('dbo.vendedores', 'U') IS NOT NULL
        SET @tabla = 'dbo.vendedores';
    ELSE IF OBJECT_ID('dbo.tbl_Vendedor', 'U') IS NOT NULL
        SET @tabla = 'dbo.tbl_Vendedor';

    IF @tabla IS NULL
    BEGIN
        RAISERROR('No existe la tabla de vendedores (dbo.vendedores o dbo.tbl_Vendedor).', 16, 1);
        RETURN;
    END

    IF COL_LENGTH(@tabla, 'E_Eliminado') IS NOT NULL
        SET @colEliminado = 'E_Eliminado';
    ELSE IF COL_LENGTH(@tabla, 'e_eliminado') IS NOT NULL
        SET @colEliminado = 'e_eliminado';
    ELSE IF COL_LENGTH(@tabla, 'Eliminado') IS NOT NULL
        SET @colEliminado = 'Eliminado';
    ELSE IF COL_LENGTH(@tabla, 'eliminado') IS NOT NULL
        SET @colEliminado = 'eliminado';

    IF @colEliminado IS NULL
    BEGIN
        RAISERROR('No existe columna de eliminado en la tabla de vendedores.', 16, 1);
        RETURN;
    END

    IF COL_LENGTH(@tabla, 'Nombre') IS NOT NULL
        SET @colNombre = 'Nombre';
    ELSE IF COL_LENGTH(@tabla, 'nombre') IS NOT NULL
        SET @colNombre = 'nombre';

    SET @sql = N'SELECT * FROM ' + @tabla + N' WHERE ISNULL(' + QUOTENAME(@colEliminado) + N', 0) = 0';

    IF @colNombre IS NOT NULL
        SET @sql += N' ORDER BY ' + QUOTENAME(@colNombre);

    EXEC sp_executesql @sql;
END
GO
