SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
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
