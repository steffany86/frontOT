-- Persistencia central para Conformacion Cuadrilla Diario Web
-- Ejecutar en BDControlOrdenes.
-- La lectura operativa por sucursal ahora vive en SP_CONFORMACION_CUADRILLA_WEB_OPERATIVA.sql

IF OBJECT_ID('dbo.tbl_ConformacionCuadrillaDiarioWeb', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_ConformacionCuadrillaDiarioWeb
    (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        fecha DATE NOT NULL CONSTRAINT DF_tbl_ConformacionCuadrillaDiarioWeb_fecha DEFAULT (CAST(GETDATE() AS DATE)),
        estado NVARCHAR(20) NOT NULL,
        actividad NVARCHAR(20) NOT NULL,
        id_tecnico INT NOT NULL,
        cuenta_sf NVARCHAR(100) NULL,
        salesforce NVARCHAR(100) NULL,
        habilidad NVARCHAR(100) NULL,
        vehiculo NVARCHAR(100) NULL,
        [grupo] NVARCHAR(100) NULL,
        almacen NVARCHAR(100) NULL,
        grupoDigitacion NVARCHAR(100) NULL,
        idUsuarioDigitador INT NULL,
        digitador NVARCHAR(150) NULL,
        tecnico NVARCHAR(150) NULL,
        id_tecnicoAuxiliar INT NULL,
        auxiliar NVARCHAR(150) NULL,
        idUsuarioSupervisor INT NOT NULL,
        supervisorACargo NVARCHAR(150) NULL,
        sucursal NVARCHAR(100) NOT NULL,
        observacion NVARCHAR(500) NULL,
        idUsuarioRegistra INT NOT NULL,
        fechaRegistro DATETIME NOT NULL CONSTRAINT DF_tbl_ConformacionCuadrillaDiarioWeb_fechaRegistro DEFAULT (GETDATE()),
        e_eliminado BIT NOT NULL CONSTRAINT DF_tbl_ConformacionCuadrillaDiarioWeb_e_eliminado DEFAULT (0)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_tbl_ConformacionCuadrillaDiarioWeb_busqueda'
      AND object_id = OBJECT_ID('dbo.tbl_ConformacionCuadrillaDiarioWeb')
)
BEGIN
    CREATE INDEX IX_tbl_ConformacionCuadrillaDiarioWeb_busqueda
        ON dbo.tbl_ConformacionCuadrillaDiarioWeb (e_eliminado, fecha, sucursal, id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_tbl_ConformacionCuadrillaDiarioWeb_estado'
)
BEGIN
    ALTER TABLE dbo.tbl_ConformacionCuadrillaDiarioWeb
    ADD CONSTRAINT CK_tbl_ConformacionCuadrillaDiarioWeb_estado
        CHECK (estado IN ('ACTIVO', 'AUSENTE'));
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_tbl_ConformacionCuadrillaDiarioWeb_actividad'
)
BEGIN
    ALTER TABLE dbo.tbl_ConformacionCuadrillaDiarioWeb
    ADD CONSTRAINT CK_tbl_ConformacionCuadrillaDiarioWeb_actividad
        CHECK (actividad IN ('TITULAR', 'BACKUP'));
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_tbl_ConformacionCuadrillaDiarioWeb_tecnico_auxiliar'
)
BEGIN
    ALTER TABLE dbo.tbl_ConformacionCuadrillaDiarioWeb
    ADD CONSTRAINT CK_tbl_ConformacionCuadrillaDiarioWeb_tecnico_auxiliar
        CHECK (id_tecnicoAuxiliar IS NULL OR id_tecnicoAuxiliar <> id_tecnico);
END
GO

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

    SELECT TOP (CASE WHEN @Limite IS NULL OR @Limite <= 0 THEN 2147483647 ELSE @Limite END)
        *
    FROM dbo.tbl_ConformacionCuadrillaDiarioWeb
    WHERE e_eliminado = 0
      AND (@Fecha IS NULL OR fecha = @Fecha)
      AND (
            @Sucursal IS NULL
            OR LTRIM(RTRIM(@Sucursal)) = ''
            OR sucursal = LTRIM(RTRIM(@Sucursal))
          )
    ORDER BY fechaRegistro DESC, id DESC;
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

    SELECT TOP 1 *
    FROM dbo.tbl_ConformacionCuadrillaDiarioWeb
    WHERE id = @Id
      AND e_eliminado = 0;
END
GO

IF OBJECT_ID('dbo.spx_RegistrarConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_RegistrarConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_RegistrarConformacionCuadrillaWeb
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.tbl_ConformacionCuadrillaDiarioWeb (
        fecha,
        estado,
        actividad,
        id_tecnico,
        cuenta_sf,
        salesforce,
        habilidad,
        vehiculo,
        [grupo],
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
    )
    VALUES (
        ISNULL(@Fecha, CAST(GETDATE() AS DATE)),
        @Estado,
        @Actividad,
        @Id_Tecnico,
        @Cuenta_SF,
        @Salesforce,
        @Habilidad,
        @Vehiculo,
        @Grupo,
        @Almacen,
        @GrupoDigitacion,
        @IdUsuarioDigitador,
        @Digitador,
        @Tecnico,
        @Id_TecnicoAuxiliar,
        @Auxiliar,
        @IdUsuarioSupervisor,
        @SupervisorACargo,
        @Sucursal,
        @Observacion,
        @IdUsuarioRegistra,
        GETDATE(),
        0
    );

    SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS id;
END
GO

IF OBJECT_ID('dbo.spx_ActualizarConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ActualizarConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ActualizarConformacionCuadrillaWeb
    @Id BIGINT,
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    UPDATE dbo.tbl_ConformacionCuadrillaDiarioWeb
    SET fecha = ISNULL(@Fecha, fecha),
        estado = @Estado,
        actividad = @Actividad,
        id_tecnico = @Id_Tecnico,
        cuenta_sf = @Cuenta_SF,
        salesforce = @Salesforce,
        habilidad = @Habilidad,
        vehiculo = @Vehiculo,
        [grupo] = @Grupo,
        almacen = @Almacen,
        grupoDigitacion = @GrupoDigitacion,
        idUsuarioDigitador = @IdUsuarioDigitador,
        digitador = @Digitador,
        tecnico = @Tecnico,
        id_tecnicoAuxiliar = @Id_TecnicoAuxiliar,
        auxiliar = @Auxiliar,
        idUsuarioSupervisor = @IdUsuarioSupervisor,
        supervisorACargo = @SupervisorACargo,
        sucursal = @Sucursal,
        observacion = @Observacion,
        idUsuarioRegistra = @IdUsuarioRegistra
    WHERE id = @Id
      AND e_eliminado = 0;
END
GO

IF OBJECT_ID('dbo.spx_EliminarConformacionCuadrillaWeb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_EliminarConformacionCuadrillaWeb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_EliminarConformacionCuadrillaWeb
    @Id BIGINT
AS
BEGIN
    UPDATE dbo.tbl_ConformacionCuadrillaDiarioWeb
    SET e_eliminado = 1
    WHERE id = @Id
      AND e_eliminado = 0;
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

    SELECT v.Id_Vendedor AS id_tecnico,
           v.Nombre AS tecnico,
           v.CuentaSF AS cuenta_sf,
           v.SalesForce AS salesforce,
           v.Habilidad AS habilidad,
           v.Vehiculo AS vehiculo,
           v.Id_Vendedor,
           v.Nombre,
           v.CuentaSF,
           v.SalesForce,
           v.Habilidad,
           v.Vehiculo
    FROM dbo.tbl_Vendedor v
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

    SELECT v.Id_Vendedor AS id_tecnicoAuxiliar,
           v.Nombre AS auxiliar,
           v.Id_Vendedor,
           v.Nombre
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

    SELECT u.Id_Usuario,
           u.Nombre,
           u.Loggin,
           u.Id_Rol
    FROM dbo.tbl_Usuario u
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

    SELECT u.Id_Usuario,
           u.Nombre,
           u.Loggin,
           u.Id_Rol,
           r.Nombre AS Rol
    FROM dbo.tbl_Usuario u
    INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
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
        SELECT LTRIM(RTRIM(v.Vehiculo)) AS Vehiculo
        FROM dbo.tbl_Vendedor v
        WHERE v.E_Eliminado = 0
          AND v.Vehiculo IS NOT NULL
          AND LTRIM(RTRIM(v.Vehiculo)) <> ''

        UNION

        SELECT LTRIM(RTRIM(c.vehiculo)) AS Vehiculo
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb c
        WHERE c.e_eliminado = 0
          AND c.vehiculo IS NOT NULL
          AND LTRIM(RTRIM(c.vehiculo)) <> ''
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

    SELECT TOP 1
        v.Id_Vendedor AS id_tecnico,
        v.Nombre AS tecnico,
        v.CuentaSF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        r.Tipo AS grupo,
        r.Tipo AS almacen,
        r.almacenTigo AS grupoDigitacion,
        (
            SELECT TOP 1 vv.sucursal
            FROM dbo.tbl_version vv
            WHERE vv.sucursal IS NOT NULL
              AND LTRIM(RTRIM(vv.sucursal)) <> ''
            ORDER BY vv.sucursal
        ) AS sucursal
    FROM dbo.tbl_Vendedor v
    LEFT JOIN dbo.tbl_Ruta r
           ON r.Id_Vendedor = v.Id_Vendedor
          AND r.E_Eliminado = 0
    WHERE v.Id_Vendedor = @Id_Tecnico
      AND v.E_Eliminado = 0
    ORDER BY r.Id_Ruta;
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
