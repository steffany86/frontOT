-- SPs de lectura para Conformacion Cuadrilla Web
-- Ejecutar en BDSistemaAntenaUTecnico y en SucrePrueba.
-- La persistencia de confirmaciones sigue en BDControlOrdenes.

IF OBJECT_ID('dbo.spx_ObtenerConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerConformacionCuadrillaWeb
    @Fecha DATE = NULL,
    @Sucursal NVARCHAR(100) = NULL,
    @Limite INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SucursalNormalizada NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Sucursal)), '');

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    ),
    BaseCuadrillas AS (
        SELECT
            CAST(r.Id_Ruta AS BIGINT) AS id,
            CAST(GETDATE() AS DATE) AS fecha,
            CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
            CAST(
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(r.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                        THEN UPPER(LTRIM(RTRIM(r.Tipo)))
                    ELSE 'TITULAR'
                END
                AS NVARCHAR(20)
            ) AS actividad,
            v.Id_Vendedor AS id_tecnico,
            v.CuentaSF AS cuenta_sf,
            v.SalesForce AS salesforce,
            v.Habilidad AS habilidad,
            v.Vehiculo AS vehiculo,
            r.Nombre AS grupo,
            NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS almacen,
            NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS grupoDigitacion,
            CAST(NULL AS INT) AS idUsuarioDigitador,
            CAST(NULL AS NVARCHAR(150)) AS digitador,
            v.Nombre AS tecnico,
            CAST(NULL AS INT) AS id_tecnicoAuxiliar,
            CAST(NULL AS NVARCHAR(150)) AS auxiliar,
            CAST(NULL AS INT) AS idUsuarioSupervisor,
            CAST(NULL AS NVARCHAR(150)) AS supervisorACargo,
            va.sucursal AS sucursal,
            CAST(NULL AS NVARCHAR(500)) AS observacion,
            CAST(NULL AS INT) AS idUsuarioRegistra,
            GETDATE() AS fechaRegistro,
            CONVERT(BIT, ISNULL(r.E_Eliminado, 0)) AS e_eliminado
        FROM dbo.tbl_Ruta r
        INNER JOIN dbo.tbl_Vendedor v
            ON v.Id_Vendedor = r.Id_Vendedor
        CROSS JOIN VersionActual va
        WHERE v.E_Eliminado = 0
    )
    SELECT TOP (CASE WHEN @Limite IS NULL OR @Limite <= 0 THEN 2147483647 ELSE @Limite END)
        id,
        fecha,
        estado,
        actividad,
        id_tecnico,
        cuenta_sf,
        salesforce,
        habilidad,
        vehiculo,
        grupo,
        almacen,
        grupoDigitacion,
        idUsuarioDigitador,
        digitador,
        tecnico,
        id_tecnicoAuxiliar,
        auxiliar,
        idUsuarioSupervisor,
        supervisorACargo,
        sucursal,
        observacion,
        idUsuarioRegistra,
        fechaRegistro,
        e_eliminado
    FROM BaseCuadrillas
    WHERE @SucursalNormalizada IS NULL
       OR UPPER(LTRIM(RTRIM(ISNULL(sucursal, '')))) = UPPER(@SucursalNormalizada)
    ORDER BY e_eliminado, grupo, tecnico, id;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerConformacionCuadrillaWebPorId', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerConformacionCuadrillaWebPorId AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerConformacionCuadrillaWebPorId
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    )
    SELECT TOP 1
        CAST(r.Id_Ruta AS BIGINT) AS id,
        CAST(GETDATE() AS DATE) AS fecha,
        CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
        CAST(
            CASE
                WHEN UPPER(LTRIM(RTRIM(ISNULL(r.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                    THEN UPPER(LTRIM(RTRIM(r.Tipo)))
                ELSE 'TITULAR'
            END
            AS NVARCHAR(20)
        ) AS actividad,
        v.Id_Vendedor AS id_tecnico,
        v.CuentaSF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        r.Nombre AS grupo,
        NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS almacen,
        NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS grupoDigitacion,
        CAST(NULL AS INT) AS idUsuarioDigitador,
        CAST(NULL AS NVARCHAR(150)) AS digitador,
        v.Nombre AS tecnico,
        CAST(NULL AS INT) AS id_tecnicoAuxiliar,
        CAST(NULL AS NVARCHAR(150)) AS auxiliar,
        CAST(NULL AS INT) AS idUsuarioSupervisor,
        CAST(NULL AS NVARCHAR(150)) AS supervisorACargo,
        va.sucursal AS sucursal,
        CAST(NULL AS NVARCHAR(500)) AS observacion,
        CAST(NULL AS INT) AS idUsuarioRegistra,
        GETDATE() AS fechaRegistro,
        CONVERT(BIT, ISNULL(r.E_Eliminado, 0)) AS e_eliminado
    FROM dbo.tbl_Ruta r
    INNER JOIN dbo.tbl_Vendedor v
        ON v.Id_Vendedor = r.Id_Vendedor
    CROSS JOIN VersionActual va
    WHERE r.Id_Ruta = @Id
      AND v.E_Eliminado = 0
    ORDER BY r.Id_Ruta;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        v.Id_Vendedor AS id_tecnico,
        v.Nombre AS tecnico,
        v.CuentaSF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        ruta.Id_Ruta AS id_ruta,
        ruta.Nombre AS grupo,
        ruta.BodegaTigo AS almacen,
        ruta.BodegaTigo AS grupoDigitacion,
        v.*
    FROM dbo.tbl_Vendedor v
    OUTER APPLY (
        SELECT TOP 1 r.Id_Ruta, r.Nombre, r.BodegaTigo
        FROM dbo.tbl_Ruta r
        WHERE r.Id_Vendedor = v.Id_Vendedor
          AND ISNULL(r.E_Eliminado, 0) = 0
        ORDER BY r.Id_Ruta
    ) ruta
    WHERE v.E_Eliminado = 0
    ORDER BY v.Nombre;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerAuxiliaresConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerAuxiliaresConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerAuxiliaresConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        v.Id_Vendedor AS id_tecnicoAuxiliar,
        v.Nombre AS auxiliar,
        v.CuentaSF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        v.*
    FROM dbo.tbl_Vendedor v
    WHERE v.E_Eliminado = 0
    ORDER BY v.Nombre;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerDigitadoresConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerDigitadoresConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerDigitadoresConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.Id_Usuario AS idUsuarioDigitador,
        u.Nombre AS digitador,
        r.Nombre AS rol,
        u.*
    FROM dbo.tbl_Usuario u
    LEFT JOIN dbo.tbl_Rol r
        ON r.Id_Rol = u.Id_Rol
    WHERE u.E_Eliminado = 0
      AND u.Id_Rol = 3
    ORDER BY u.Nombre;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.Id_Usuario AS idUsuarioSupervisor,
        u.Nombre AS supervisorACargo,
        r.Nombre AS rol,
        u.*
    FROM dbo.tbl_Usuario u
    INNER JOIN dbo.tbl_Rol r
        ON r.Id_Rol = u.Id_Rol
    WHERE u.E_Eliminado = 0
      AND (r.Nombre = 'Supervisor' OR r.Nombre LIKE '%supervisor%')
    ORDER BY u.Nombre;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerActividadesConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerActividadesConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerActividadesConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 'TITULAR' AS actividad
    UNION ALL
    SELECT 'BACKUP' AS actividad;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerVehiculosConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerVehiculosConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerVehiculosConformacionCuadrillaWeb
    @Filtro NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FiltroNormalizado NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Filtro)), '');

    ;WITH Vehiculos AS (
        SELECT DISTINCT
            LTRIM(RTRIM(v.Vehiculo)) AS Vehiculo
        FROM dbo.tbl_Vendedor v
        WHERE v.E_Eliminado = 0
          AND v.Vehiculo IS NOT NULL
          AND LTRIM(RTRIM(v.Vehiculo)) <> ''
    )
    SELECT Vehiculo
    FROM Vehiculos
    WHERE @FiltroNormalizado IS NULL
       OR Vehiculo LIKE '%' + @FiltroNormalizado + '%'
    ORDER BY Vehiculo;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerDatosTecnicoConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerDatosTecnicoConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerDatosTecnicoConformacionCuadrillaWeb
    @Id_Tecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    )
    SELECT TOP 1
        v.Id_Vendedor AS id_tecnico,
        v.Nombre AS tecnico,
        v.CuentaSF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        ruta.Id_Ruta AS id,
        ruta.Id_Ruta AS id_ruta,
        CAST(GETDATE() AS DATE) AS fecha,
        CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
        CAST(
            CASE
                WHEN UPPER(LTRIM(RTRIM(ISNULL(ruta.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                    THEN UPPER(LTRIM(RTRIM(ruta.Tipo)))
                ELSE 'TITULAR'
            END
            AS NVARCHAR(20)
        ) AS actividad,
        ruta.Nombre AS grupo,
        NULLIF(LTRIM(RTRIM(ruta.BodegaTigo)), '') AS almacen,
        NULLIF(LTRIM(RTRIM(ruta.BodegaTigo)), '') AS grupoDigitacion,
        CAST(NULL AS INT) AS idUsuarioDigitador,
        CAST(NULL AS NVARCHAR(150)) AS digitador,
        CAST(NULL AS INT) AS id_tecnicoAuxiliar,
        CAST(NULL AS NVARCHAR(150)) AS auxiliar,
        CAST(NULL AS INT) AS idUsuarioSupervisor,
        CAST(NULL AS NVARCHAR(150)) AS supervisorACargo,
        va.sucursal AS sucursal,
        CAST(NULL AS NVARCHAR(500)) AS observacion,
        CAST(NULL AS INT) AS idUsuarioRegistra,
        GETDATE() AS fechaRegistro,
        CONVERT(BIT, ISNULL(ruta.E_Eliminado, 0)) AS e_eliminado,
        v.*,
        ruta.*
    FROM dbo.tbl_Vendedor v
    OUTER APPLY (
        SELECT TOP 1 r.*
        FROM dbo.tbl_Ruta r
        WHERE r.Id_Vendedor = v.Id_Vendedor
          AND ISNULL(r.E_Eliminado, 0) = 0
        ORDER BY r.Id_Ruta
    ) ruta
    CROSS JOIN VersionActual va
    WHERE v.Id_Vendedor = @Id_Tecnico
      AND v.E_Eliminado = 0
    ORDER BY ruta.Id_Ruta;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerSucursalesConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerSucursalesConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerSucursalesConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        LTRIM(RTRIM(v.sucursal)) AS sucursal
    FROM dbo.tbl_version v
    WHERE v.sucursal IS NOT NULL
      AND LTRIM(RTRIM(v.sucursal)) <> ''
    ORDER BY sucursal;
END
GO
