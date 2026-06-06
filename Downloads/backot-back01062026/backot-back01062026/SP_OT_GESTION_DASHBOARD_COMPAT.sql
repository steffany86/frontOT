-- Compatibilidad de SPs para tablero GestionOTs.
-- Objetivo: centralizar puntos de extension para cabecera/detalle por Id_Venta
-- y permitir cambios rapidos en SQL sin tocar backend/frontend.

IF OBJECT_ID('dbo.sp_ObtenerCabezeraOrdenTrabajo_X_Numero', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.sp_ObtenerCabezeraOrdenTrabajo_X_Numero @Id_Venta BIGINT AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_ObtenerOrdenTrabajo_X_Id_Venta @Id_Venta; END');
END
GO

ALTER PROC dbo.sp_ObtenerCabezeraOrdenTrabajo_X_Numero
    @Id_Venta BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ObtenerOrdenTrabajo_X_Id_Venta @Id_Venta;
END
GO

IF OBJECT_ID('dbo.sp_ObtenerInstalado_X_Numero', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.sp_ObtenerInstalado_X_Numero @Id_Venta BIGINT AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_ObtenerDetalleVenta_Instalado_X_ID @Id_Venta; END');
END
GO

ALTER PROC dbo.sp_ObtenerInstalado_X_Numero
    @Id_Venta BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ObtenerDetalleVenta_Instalado_X_ID @Id_Venta;
END
GO

IF OBJECT_ID('dbo.sp_ObteneRetirado_X_Numero', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.sp_ObteneRetirado_X_Numero @Id_Venta BIGINT AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_ObtenerDetalleVenta_Retirado_X_ID @Id_Venta; END');
END
GO

ALTER PROC dbo.sp_ObteneRetirado_X_Numero
    @Id_Venta BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ObtenerDetalleVenta_Retirado_X_ID @Id_Venta;
END
GO

-- Nota:
-- sp_ObtenerDetalleVenta_CargoUsuario_X_ID ya es el SP objetivo para cargo usuario.
-- Si se requiere, se puede crear otro wrapper con el mismo patron.
