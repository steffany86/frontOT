-- SPs para Conformacion de Cuadrillas (BackOffice)
-- Ejecutar en BDControlOrdenes (central) y, si se requiere fallback, tambien en BDSistemaAntenaUTecnico.

IF OBJECT_ID('dbo.tbl_ConformacionCuadrillaDiario', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_ConformacionCuadrillaDiario
    (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        fecha DATE NOT NULL CONSTRAINT DF_tbl_ConformacionCuadrillaDiario_fecha DEFAULT (CAST(GETDATE() AS DATE)),
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
        fechaRegistro DATETIME NOT NULL CONSTRAINT DF_tbl_ConformacionCuadrillaDiario_fechaRegistro DEFAULT (GETDATE()),
        e_eliminado BIT NOT NULL CONSTRAINT DF_tbl_ConformacionCuadrillaDiario_e_eliminado DEFAULT (0)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_tbl_ConformacionCuadrillaDiario_busqueda'
      AND object_id = OBJECT_ID('dbo.tbl_ConformacionCuadrillaDiario')
)
BEGIN
    CREATE INDEX IX_tbl_ConformacionCuadrillaDiario_busqueda
        ON dbo.tbl_ConformacionCuadrillaDiario (e_eliminado, fecha, sucursal, id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_tbl_ConformacionCuadrillaDiario_estado'
)
BEGIN
    ALTER TABLE dbo.tbl_ConformacionCuadrillaDiario
    ADD CONSTRAINT CK_tbl_ConformacionCuadrillaDiario_estado
        CHECK (estado IN ('ACTIVO', 'AUSENTE'));
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_tbl_ConformacionCuadrillaDiario_actividad'
)
BEGIN
    ALTER TABLE dbo.tbl_ConformacionCuadrillaDiario
    ADD CONSTRAINT CK_tbl_ConformacionCuadrillaDiario_actividad
        CHECK (actividad IN ('TITULAR', 'BACKUP'));
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_tbl_ConformacionCuadrillaDiario_tecnico_auxiliar'
)
BEGIN
    ALTER TABLE dbo.tbl_ConformacionCuadrillaDiario
    ADD CONSTRAINT CK_tbl_ConformacionCuadrillaDiario_tecnico_auxiliar
        CHECK (id_tecnicoAuxiliar IS NULL OR id_tecnicoAuxiliar <> id_tecnico);
END
GO

IF OBJECT_ID('dbo.spx_ObtenerListadoConformacionCuadrillaBackOffice', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerListadoConformacionCuadrillaBackOffice AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerListadoConformacionCuadrillaBackOffice
    @Fecha DATE = NULL,
    @Sucursal NVARCHAR(100) = NULL,
    @Limite INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (CASE WHEN @Limite IS NULL OR @Limite <= 0 THEN 2147483647 ELSE @Limite END)
        *
    FROM dbo.tbl_ConformacionCuadrillaDiario
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

IF OBJECT_ID('dbo.spx_ObtenerConformacionCuadrillaBackOffice', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerConformacionCuadrillaBackOffice AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerConformacionCuadrillaBackOffice
    @Fecha DATE = NULL,
    @Sucursal NVARCHAR(100) = NULL,
    @Limite INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.spx_ObtenerListadoConformacionCuadrillaBackOffice
        @Fecha = @Fecha,
        @Sucursal = @Sucursal,
        @Limite = @Limite;
END
GO

IF OBJECT_ID('dbo.spx_RegistrarConformacionCuadrillaBackOffice', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_RegistrarConformacionCuadrillaBackOffice AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_RegistrarConformacionCuadrillaBackOffice
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

    INSERT INTO dbo.tbl_ConformacionCuadrillaDiario (
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
END
GO

IF OBJECT_ID('dbo.spx_ActualizarConformacionCuadrillaBackOffice', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ActualizarConformacionCuadrillaBackOffice AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ActualizarConformacionCuadrillaBackOffice
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
    SET NOCOUNT ON;

    UPDATE dbo.tbl_ConformacionCuadrillaDiario
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

IF OBJECT_ID('dbo.spx_TraerVendedores_x_FormTecnico', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_TraerVendedores_x_FormTecnico AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_TraerVendedores_x_FormTecnico
AS
BEGIN
    SET NOCOUNT ON;

    SELECT v.*, ts.id_Tipo_Solicitante, ts.Nombre AS TipoSolicitante
    FROM dbo.tbl_Vendedor v
    INNER JOIN dbo.tbl_TipoSolicitante ts ON ts.id_Tipo_Solicitante = v.id_tiposolicitante
    WHERE v.E_Eliminado = 0
    ORDER BY v.Nombre;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerDatosTecnicoCuadrilla', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerDatosTecnicoCuadrilla AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerDatosTecnicoCuadrilla
    @Id_Tecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        v.*,
        r.*,
        (SELECT TOP 1 sucursal FROM dbo.tbl_version) AS sucursal
    FROM dbo.tbl_Vendedor v
    LEFT JOIN dbo.tbl_Ruta r ON r.Id_Vendedor = v.Id_Vendedor AND r.E_Eliminado = 0
    WHERE v.Id_Vendedor = @Id_Tecnico
      AND v.E_Eliminado = 0
    ORDER BY r.Id_Ruta;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerDigitadores', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerDigitadores AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerDigitadores
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

IF OBJECT_ID('dbo.spx_ObtenerSupervisores', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerSupervisores AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerSupervisores
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

IF OBJECT_ID('dbo.spx_ObtenerSucursalActual', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerSucursalActual AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ObtenerSucursalActual
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 sucursal
    FROM dbo.tbl_version;
END
GO

IF OBJECT_ID('dbo.[listar-vehiculo]', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.[listar-vehiculo] AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.[listar-vehiculo]
    @Filtro NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FiltroNormalizado NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Filtro)), '');

    CREATE TABLE #Vehiculos
    (
        Vehiculo NVARCHAR(100) NOT NULL
    );

    IF OBJECT_ID('dbo.tbl_ConformacionCuadrillaDiario', 'U') IS NOT NULL
    BEGIN
        INSERT INTO #Vehiculos (Vehiculo)
        SELECT LTRIM(RTRIM(vehiculo))
        FROM dbo.tbl_ConformacionCuadrillaDiario
        WHERE e_eliminado = 0
          AND vehiculo IS NOT NULL
          AND LTRIM(RTRIM(vehiculo)) <> '';
    END

    IF OBJECT_ID('dbo.tbl_ConformacionCuadrillaDiarioWeb', 'U') IS NOT NULL
    BEGIN
        INSERT INTO #Vehiculos (Vehiculo)
        SELECT LTRIM(RTRIM(vehiculo))
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb
        WHERE e_eliminado = 0
          AND vehiculo IS NOT NULL
          AND LTRIM(RTRIM(vehiculo)) <> '';
    END

    SELECT DISTINCT Vehiculo
    FROM #Vehiculos
    WHERE @FiltroNormalizado IS NULL
       OR Vehiculo LIKE '%' + @FiltroNormalizado + '%'
    ORDER BY Vehiculo;
END
GO
