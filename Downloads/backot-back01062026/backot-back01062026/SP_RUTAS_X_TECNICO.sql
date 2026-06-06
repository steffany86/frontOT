SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID('dbo.spx_ObtenerRutaXIdTecnico', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerRutaXIdTecnico @Id_Tecnico INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO

ALTER PROC dbo.spx_ObtenerRutaXIdTecnico
    @Id_Tecnico INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF OBJECT_ID('dbo.tbl_Ruta', 'U') IS NULL
    BEGIN
        RAISERROR('No existe la tabla dbo.tbl_Ruta.', 16, 1);
        RETURN;
    END

    DECLARE @sql NVARCHAR(MAX);

    SET @sql = N'
    SELECT
        r.Id_Ruta AS id_ruta,
        r.Nombre AS cuadrilla,
        r.Nombre AS ruta,
        r.Id_Vendedor AS id_tecnico,'
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'Tipo') IS NOT NULL
            THEN N' r.Tipo AS tipo,'
            ELSE N' CAST(NULL AS NVARCHAR(50)) AS tipo,'
          END
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'visible') IS NOT NULL
            THEN N' r.visible AS visible,'
            ELSE N' CAST(NULL AS BIT) AS visible,'
          END
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'BodegaTigo') IS NOT NULL
            THEN N' r.BodegaTigo AS bodega_tigo,'
            ELSE N' CAST(NULL AS NVARCHAR(250)) AS bodega_tigo,'
          END
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'almacenTigo') IS NOT NULL
            THEN N' r.almacenTigo AS almacen_tigo,'
            ELSE N' CAST(NULL AS NVARCHAR(250)) AS almacen_tigo,'
          END
        + N'
        r.Id_Ruta,
        r.Nombre,
        r.Id_Vendedor,
        r.E_Eliminado
    FROM dbo.tbl_Ruta r
    WHERE ISNULL(r.E_Eliminado, 0) = 0
      AND (@Id_Tecnico IS NULL OR r.Id_Vendedor = @Id_Tecnico)
    ORDER BY r.Nombre;';

    EXEC sp_executesql @sql, N'@Id_Tecnico INT', @Id_Tecnico = @Id_Tecnico;
END
GO
