SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/*
    SP para filtros de "Llamada de Atencion".
    Se crea en:
      - BDSistemaAntenaUTecnico (Santa Cruz)
      - SucrePrueba (Sucre)

    Uso:
      EXEC dbo.spx_ObtenerTecnicosLlamadaAtencion;
      EXEC dbo.spx_ObtenerTecnicosLlamadaAtencion @Filtro = 'juan';
      EXEC dbo.spx_ObtenerTecnicosLlamadaAtencion @Filtro = '1024';
*/

USE [BDSistemaAntenaUTecnico]
GO

IF OBJECT_ID('dbo.spx_ObtenerTecnicosLlamadaAtencion', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerTecnicosLlamadaAtencion @Filtro NVARCHAR(150) = NULL AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO

ALTER PROC dbo.spx_ObtenerTecnicosLlamadaAtencion
    @Filtro NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FiltroNorm NVARCHAR(150) = NULLIF(LTRIM(RTRIM(@Filtro)), '');

    SELECT
        v.Id_Vendedor AS id_tecnico,
        LTRIM(RTRIM(v.Nombre)) AS tecnico,
        NULLIF(LTRIM(RTRIM(v.CodEmpleado)), '') AS cod_empleado,
        NULLIF(LTRIM(RTRIM(v.CuentaSF)), '') AS cuenta_sf,
        NULLIF(LTRIM(RTRIM(v.SalesForce)), '') AS salesforce,
        NULLIF(LTRIM(RTRIM(v.Habilidad)), '') AS habilidad,
        NULLIF(LTRIM(RTRIM(v.Vehiculo)), '') AS vehiculo,
        v.id_tiposolicitante AS id_tipo_solicitante,
        ts.Nombre AS tipo_solicitante
    FROM dbo.tbl_Vendedor v
    LEFT JOIN dbo.tbl_TipoSolicitante ts
        ON ts.id_Tipo_Solicitante = v.id_tiposolicitante
    WHERE ISNULL(v.E_Eliminado, 0) = 0
      AND (
            @FiltroNorm IS NULL
            OR CONVERT(NVARCHAR(30), v.Id_Vendedor) = @FiltroNorm
            OR v.Nombre LIKE '%' + @FiltroNorm + '%'
            OR ISNULL(v.CodEmpleado, '') LIKE '%' + @FiltroNorm + '%'
            OR ISNULL(v.CuentaSF, '') LIKE '%' + @FiltroNorm + '%'
            OR ISNULL(v.SalesForce, '') LIKE '%' + @FiltroNorm + '%'
          )
    ORDER BY v.Nombre;
END
GO

USE [SucrePrueba]
GO

IF OBJECT_ID('dbo.spx_ObtenerTecnicosLlamadaAtencion', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerTecnicosLlamadaAtencion @Filtro NVARCHAR(150) = NULL AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO

ALTER PROC dbo.spx_ObtenerTecnicosLlamadaAtencion
    @Filtro NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FiltroNorm NVARCHAR(150) = NULLIF(LTRIM(RTRIM(@Filtro)), '');

    SELECT
        v.Id_Vendedor AS id_tecnico,
        LTRIM(RTRIM(v.Nombre)) AS tecnico,
        NULLIF(LTRIM(RTRIM(v.CodEmpleado)), '') AS cod_empleado,
        NULLIF(LTRIM(RTRIM(v.CuentaSF)), '') AS cuenta_sf,
        NULLIF(LTRIM(RTRIM(v.SalesForce)), '') AS salesforce,
        NULLIF(LTRIM(RTRIM(v.Habilidad)), '') AS habilidad,
        NULLIF(LTRIM(RTRIM(v.Vehiculo)), '') AS vehiculo,
        v.id_tiposolicitante AS id_tipo_solicitante,
        ts.Nombre AS tipo_solicitante
    FROM dbo.tbl_Vendedor v
    LEFT JOIN dbo.tbl_TipoSolicitante ts
        ON ts.id_Tipo_Solicitante = v.id_tiposolicitante
    WHERE ISNULL(v.E_Eliminado, 0) = 0
      AND (
            @FiltroNorm IS NULL
            OR CONVERT(NVARCHAR(30), v.Id_Vendedor) = @FiltroNorm
            OR v.Nombre LIKE '%' + @FiltroNorm + '%'
            OR ISNULL(v.CodEmpleado, '') LIKE '%' + @FiltroNorm + '%'
            OR ISNULL(v.CuentaSF, '') LIKE '%' + @FiltroNorm + '%'
            OR ISNULL(v.SalesForce, '') LIKE '%' + @FiltroNorm + '%'
          )
    ORDER BY v.Nombre;
END
GO
