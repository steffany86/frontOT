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
