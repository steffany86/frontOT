USE [SucrePrueba];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.relacion_cuadrillas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.relacion_cuadrillas (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        id_ruta INT NOT NULL,
        id_tecnico_auxiliar INT NULL,
        auxiliar NVARCHAR(200) NULL,
        id_usuario_digitador INT NULL,
        digitador NVARCHAR(200) NULL,
        activo BIT NOT NULL CONSTRAINT DF_relacion_cuadrillas_activo DEFAULT(1),
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_relacion_cuadrillas_fecha_registro DEFAULT(GETDATE()),
        fecha_actualizacion DATETIME NOT NULL CONSTRAINT DF_relacion_cuadrillas_fecha_actualizacion DEFAULT(GETDATE())
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.relacion_cuadrillas')
      AND name = 'UX_relacion_cuadrillas_id_ruta'
)
BEGIN
    CREATE UNIQUE INDEX UX_relacion_cuadrillas_id_ruta
        ON dbo.relacion_cuadrillas(id_ruta);
END
GO

IF OBJECT_ID('dbo.spx_GuardarRelacionCuadrilla', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE dbo.spx_GuardarRelacionCuadrilla AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE dbo.spx_GuardarRelacionCuadrilla
    @id_ruta INT,
    @id_tecnico_auxiliar INT = NULL,
    @auxiliar NVARCHAR(200) = NULL,
    @id_usuario_digitador INT = NULL,
    @digitador NVARCHAR(200) = NULL,
    @activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF (@id_ruta IS NULL OR @id_ruta <= 0)
    BEGIN
        RAISERROR('id_ruta es requerido para guardar relacion de cuadrilla.', 16, 1);
        RETURN;
    END

    IF (@activo IS NULL)
        SET @activo = 1;

    UPDATE dbo.relacion_cuadrillas
       SET id_tecnico_auxiliar = @id_tecnico_auxiliar,
           auxiliar = @auxiliar,
           id_usuario_digitador = @id_usuario_digitador,
           digitador = @digitador,
           activo = @activo,
           fecha_actualizacion = GETDATE()
     WHERE id_ruta = @id_ruta;

    IF (@@ROWCOUNT = 0)
    BEGIN
        INSERT INTO dbo.relacion_cuadrillas (
            id_ruta,
            id_tecnico_auxiliar,
            auxiliar,
            id_usuario_digitador,
            digitador,
            activo,
            fecha_registro,
            fecha_actualizacion
        )
        VALUES (
            @id_ruta,
            @id_tecnico_auxiliar,
            @auxiliar,
            @id_usuario_digitador,
            @digitador,
            @activo,
            GETDATE(),
            GETDATE()
        );
    END
END
GO

