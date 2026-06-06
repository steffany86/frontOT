/*
SP para registrar una venta/OT en dbo.tbl_venta incluyendo validacion de Nro Orden unico.
Si el numero de orden ya existe, lanza error y no inserta.
*/

IF OBJECT_ID('dbo.spx_RegistrarVentaParaRegistroOTwb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE dbo.spx_RegistrarVentaParaRegistroOTwb AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE dbo.spx_RegistrarVentaParaRegistroOTwb
    @Id_Usuario INT,
    @Id_Vendedor INT,
    @Id_Grupo INT,
    @Id_TipoServicio INT,
    @OrdenTrabajo INT,
    @Observacion NVARCHAR(MAX) = NULL,
    @Total DECIMAL(18, 2) = 0,
    @Id_UsuarioE INT = NULL,
    @E_Eliminado BIT = 0,
    @Nombre NVARCHAR(250) = NULL,
    @Origen NVARCHAR(100),
    @Id_Estado INT,
    @Id_Sucursal INT,
    @CodigoCliente INT,
    @TieneObservacion BIT = 0,
    @Latitud DECIMAL(9, 6) = NULL,
    @Longitud DECIMAL(9, 6) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @Origen IS NULL OR LTRIM(RTRIM(@Origen)) = ''
        BEGIN
            RAISERROR('Origen es requerido.',16,1);
            RETURN;
        END

        IF COL_LENGTH('dbo.tbl_venta', 'Origen') IS NULL
        BEGIN
            RAISERROR('La columna Origen no existe en dbo.tbl_venta.',16,1);
            RETURN;
        END

        BEGIN TRANSACTION;

        IF EXISTS (
            SELECT 1
            FROM dbo.tbl_venta WITH (UPDLOCK, HOLDLOCK)
            WHERE OrdenTrabajo = @OrdenTrabajo
        )
        BEGIN
            RAISERROR('Ya existe una OT registrada con el mismo numero de orden.',16,1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        INSERT INTO dbo.tbl_venta (
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
            Origen,
            Id_Estado,
            Id_Sucursal,
            CodigoCliente,
            TieneObservacion,
            Latitud,
            Longitud
        )
        VALUES (
            @Id_Usuario,
            @Id_Vendedor,
            @Id_Grupo,
            @Id_TipoServicio,
            GETDATE(),
            GETDATE(),
            @OrdenTrabajo,
            @Observacion,
            ISNULL(@Total, 0),
            @Id_UsuarioE,
            ISNULL(@E_Eliminado, 0),
            @Nombre,
            @Origen,
            @Id_Estado,
            @Id_Sucursal,
            @CodigoCliente,
            ISNULL(@TieneObservacion, 0),
            @Latitud,
            @Longitud
        );

        DECLARE @Id_Venta INT;
        SET @Id_Venta = CAST(SCOPE_IDENTITY() AS INT);

        COMMIT TRANSACTION;

        SELECT
            @Id_Venta AS Id_Venta,
            @OrdenTrabajo AS OrdenTrabajo,
            @CodigoCliente AS CodigoCliente,
            @Id_Sucursal AS Id_Sucursal,
            @Origen AS Origen,
            @Latitud AS Latitud,
            @Longitud AS Longitud;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg,16,1);
    END CATCH
END;
GO

