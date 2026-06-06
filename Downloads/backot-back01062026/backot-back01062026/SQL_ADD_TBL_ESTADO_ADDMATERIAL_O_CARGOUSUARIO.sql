-- Agrega la columna de control para habilitar Cargar Material / Cargo Usuario por estado.
-- Ejecutar en la BD de cada sucursal antes de aplicar SP_FIX_VALIDAR_VENTA_Y_DETALLE_WB.sql

IF COL_LENGTH('dbo.tbl_estado', 'AddMaterial_o_CargoUsuario') IS NULL
BEGIN
    ALTER TABLE dbo.tbl_estado
    ADD AddMaterial_o_CargoUsuario BIT NOT NULL
        CONSTRAINT DF_tbl_estado_AddMaterial_o_CargoUsuario DEFAULT (0);
END
GO

