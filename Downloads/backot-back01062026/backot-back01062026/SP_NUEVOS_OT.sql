-- SP nuevo para registro de OT (cabecera)
-- Ejecutar en la BD de la sucursal donde se registran las OT.

IF OBJECT_ID('dbo.spx_RegistrarOrdenTrabajo', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_RegistrarOrdenTrabajo AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_RegistrarOrdenTrabajo
    @Id_Usuario INT,
    @Id_Ruta INT,
    @Id_TipoServicio INT,
    @CodigoCliente INT = NULL,
    @Id_Estado INT = NULL,
    @Observacion NVARCHAR(255) = NULL,
    @TieneObservacion BIT = 0,
    @Id_Sucursal INT = NULL,
    @NombreCliente NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Id_Usuario IS NULL OR @Id_Ruta IS NULL OR @Id_TipoServicio IS NULL
    BEGIN
        RAISERROR('Parametros requeridos faltantes.', 16, 1);
        RETURN;
    END

    IF @TieneObservacion = 1 AND ( @Observacion IS NULL OR LTRIM(RTRIM(@Observacion)) = '' )
    BEGIN
        RAISERROR('Observacion requerida cuando TieneObservacion=1.', 16, 1);
        RETURN;
    END

    DECLARE @Id_Vendedor INT;
    SELECT @Id_Vendedor = Id_Vendedor
    FROM dbo.tbl_Ruta
    WHERE Id_Ruta = @Id_Ruta AND E_Eliminado = 0;

    IF @Id_Vendedor IS NULL
    BEGIN
        RAISERROR('Ruta no valida.', 16, 1);
        RETURN;
    END

    DECLARE @OrdenTrabajo INT;

    BEGIN TRAN;
        -- Bloqueo pesimista: evita que dos sesiones tomen el mismo OrdenTrabajo
        SELECT @OrdenTrabajo = ISNULL(MAX(OrdenTrabajo), 0) + 1
        FROM dbo.tbl_Venta WITH (TABLOCKX, HOLDLOCK);

        INSERT INTO dbo.tbl_Venta (
            Id_Usuario,
            Id_Vendedor,
            Id_Ruta,
            Id_TipoServicio,
            Fecha_Ejecucion,
            Fecha_Registro,
            OrdenTrabajo,
            Observacion,
            Total,
            Id_UsuarioE,
            E_Eliminado,
            Nombre,
            Id_Estado,
            Id_Sucursal,
            CodigoCliente,
            TieneObservacion
        )
        VALUES (
            @Id_Usuario,
            @Id_Vendedor,
            @Id_Ruta,
            @Id_TipoServicio,
            GETDATE(),
            GETDATE(),
            @OrdenTrabajo,
            @Observacion,
            NULL,
            NULL,
            0,
            @NombreCliente,
            @Id_Estado,
            @Id_Sucursal,
            @CodigoCliente,
            @TieneObservacion
        );
    COMMIT TRAN;

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Id_Venta, @OrdenTrabajo AS OrdenTrabajo;
END
GO
