-- Ajuste de SP para validar detalle de venta OT web.
-- Cambios solicitados:
--   1) considerar registros de tbl_CodigoVentaCargoUsuario.
--   2) exponer AddMaterial_o_CargoUsuario segun el estado (tbl_estado).
--   3) exponer HabilitarCargarMaterial para evitar reglas hardcodeadas en frontend.
--   4) filtrar ventas origen OT_WEB (no considerar Manual en este SP).
-- Ejecutar en la BD de cada sucursal.

IF OBJECT_ID('dbo.spx_ValidarVentaYDetallewb', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ValidarVentaYDetallewb AS SELECT 1 AS placeholder;');
END
GO

ALTER PROC dbo.spx_ValidarVentaYDetallewb
    @Fecha DATETIME,
    @NroOT INT,
    @NumeroCliente INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CantidadVentas INT = 0;
    DECLARE @CantidadDetallesVenta INT = 0;
    DECLARE @CantidadDetallesCargoUsuario INT = 0;
    DECLARE @CantidadDetalles INT = 0;
    DECLARE @IdEstado INT = NULL;
    DECLARE @AddMaterial_o_CargoUsuario INT = 0;
    DECLARE @HabilitarCargarMaterial INT = 0;

    SELECT @CantidadVentas = COUNT(1)
    FROM dbo.tbl_Venta v
    WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
      AND v.OrdenTrabajo = @NroOT
      AND v.CodigoCliente = @NumeroCliente
      AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
      AND ISNULL(v.E_Eliminado, 0) = 0;

    IF (@CantidadVentas > 0)
    BEGIN
        SELECT TOP (1)
            @IdEstado = v.Id_Estado
        FROM dbo.tbl_Venta v
        WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
          AND v.OrdenTrabajo = @NroOT
          AND v.CodigoCliente = @NumeroCliente
          AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
          AND ISNULL(v.E_Eliminado, 0) = 0;

        SELECT @CantidadDetallesVenta = COUNT(1)
        FROM dbo.tbl_CodigoVenta cv
        INNER JOIN dbo.tbl_Venta v
            ON v.Id_Venta = cv.Id_Venta
        WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
          AND v.OrdenTrabajo = @NroOT
          AND v.CodigoCliente = @NumeroCliente
          AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
          AND ISNULL(v.E_Eliminado, 0) = 0
          AND ISNULL(cv.E_Eliminado, 0) = 0;

        SELECT @CantidadDetallesCargoUsuario = COUNT(1)
        FROM dbo.tbl_CodigoVentaCargoUsuario cvu
        INNER JOIN dbo.tbl_Venta v
            ON v.Id_Venta = cvu.Id_Venta
        WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
          AND v.OrdenTrabajo = @NroOT
          AND v.CodigoCliente = @NumeroCliente
          AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
          AND ISNULL(v.E_Eliminado, 0) = 0
          AND ISNULL(cvu.E_Eliminado, 0) = 0;
    END

    IF (@IdEstado IS NOT NULL)
    BEGIN
        SELECT TOP (1)
            @AddMaterial_o_CargoUsuario = CASE WHEN ISNULL(e.AddMaterial_o_CargoUsuario, 0) = 1 THEN 1 ELSE 0 END
        FROM dbo.tbl_estado e
        WHERE e.Id_Estado = @IdEstado
          AND ISNULL(e.E_Eliminado, 0) = 0;
    END

    SET @CantidadDetalles = ISNULL(@CantidadDetallesVenta, 0) + ISNULL(@CantidadDetallesCargoUsuario, 0);
    SET @HabilitarCargarMaterial = CASE
        WHEN @AddMaterial_o_CargoUsuario = 1
             AND @CantidadVentas > 0
             AND @CantidadDetalles = 0
        THEN 1
        ELSE 0
    END;

    SELECT
        CONVERT(DATE, @Fecha) AS Fecha,
        @NroOT AS NroOT,
        @NumeroCliente AS NumeroCliente,
        CASE WHEN @CantidadVentas > 0 THEN 1 ELSE 0 END AS ExisteVenta,
        @CantidadVentas AS CantidadVentas,
        CASE WHEN @CantidadDetalles > 0 THEN 1 ELSE 0 END AS TieneDetalleEnCodigoVenta,
        @CantidadDetalles AS CantidadDetalles,
        @IdEstado AS IdEstado,
        @AddMaterial_o_CargoUsuario AS AddMaterial_o_CargoUsuario,
        @HabilitarCargarMaterial AS HabilitarCargarMaterial;
END
GO
