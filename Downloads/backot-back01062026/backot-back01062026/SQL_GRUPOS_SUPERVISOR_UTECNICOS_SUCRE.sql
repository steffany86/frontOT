SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/*
    Estructura de grupos para supervisor y tecnicos.
    Ejecutar en:
      - BDSistemaAntenaUTecnico
      - SucrePrueba

    Tablas nuevas:
      - dbo.tbl_Grupo
      - dbo.tbl_GrupoSup          (relacion supervisor -> grupo)
      - dbo.tbl_DetalleGrupo      (relacion grupo -> usuario_tecnico)
*/

/* =========================================================
   DB: BDSistemaAntenaUTecnico
   ========================================================= */
USE [BDSistemaAntenaUTecnico]
GO

IF OBJECT_ID('dbo.tbl_Grupo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Grupo (
        id_grupo INT IDENTITY(1,1) NOT NULL,
        nombre NVARCHAR(120) NOT NULL,
        e_eliminado BIT NOT NULL CONSTRAINT DF_tbl_Grupo_e_eliminado DEFAULT (0),
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_tbl_Grupo_fecha_registro DEFAULT (GETDATE()),
        CONSTRAINT PK_tbl_Grupo PRIMARY KEY CLUSTERED (id_grupo)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_tbl_Grupo_nombre'
      AND object_id = OBJECT_ID('dbo.tbl_Grupo')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_Grupo_nombre
        ON dbo.tbl_Grupo(nombre);
END
GO

IF OBJECT_ID('dbo.tbl_GrupoSup', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_GrupoSup (
        id_grupo_sup INT IDENTITY(1,1) NOT NULL,
        id_usuario INT NOT NULL,
        id_grupo INT NOT NULL,
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_tbl_GrupoSup_fecha_registro DEFAULT (GETDATE()),
        CONSTRAINT PK_tbl_GrupoSup PRIMARY KEY CLUSTERED (id_grupo_sup)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_tbl_GrupoSup_usuario_grupo'
      AND object_id = OBJECT_ID('dbo.tbl_GrupoSup')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_GrupoSup_usuario_grupo
        ON dbo.tbl_GrupoSup(id_usuario, id_grupo);
END
GO

IF OBJECT_ID('dbo.tbl_DetalleGrupo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_DetalleGrupo (
        id_detalle_grupo INT IDENTITY(1,1) NOT NULL,
        id_grupo INT NOT NULL,
        id_usuario_tecnico INT NOT NULL,
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_tbl_DetalleGrupo_fecha_registro DEFAULT (GETDATE()),
        CONSTRAINT PK_tbl_DetalleGrupo PRIMARY KEY CLUSTERED (id_detalle_grupo)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_tbl_DetalleGrupo_grupo_tecnico'
      AND object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_DetalleGrupo_grupo_tecnico
        ON dbo.tbl_DetalleGrupo(id_grupo, id_usuario_tecnico);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_tbl_GrupoSup_tbl_Grupo'
      AND parent_object_id = OBJECT_ID('dbo.tbl_GrupoSup')
)
BEGIN
    ALTER TABLE dbo.tbl_GrupoSup
        ADD CONSTRAINT FK_tbl_GrupoSup_tbl_Grupo
            FOREIGN KEY (id_grupo) REFERENCES dbo.tbl_Grupo(id_grupo);
END
GO

IF OBJECT_ID('dbo.tbl_Usuario', 'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_tbl_GrupoSup_tbl_Usuario'
          AND parent_object_id = OBJECT_ID('dbo.tbl_GrupoSup')
   )
BEGIN
    ALTER TABLE dbo.tbl_GrupoSup
        ADD CONSTRAINT FK_tbl_GrupoSup_tbl_Usuario
            FOREIGN KEY (id_usuario) REFERENCES dbo.tbl_Usuario(Id_Usuario);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_tbl_DetalleGrupo_tbl_Grupo'
      AND parent_object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
)
BEGIN
    ALTER TABLE dbo.tbl_DetalleGrupo
        ADD CONSTRAINT FK_tbl_DetalleGrupo_tbl_Grupo
            FOREIGN KEY (id_grupo) REFERENCES dbo.tbl_Grupo(id_grupo);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_tbl_DetalleGrupo_tbl_usuario_tecnico'
      AND parent_object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
)
BEGIN
    DECLARE @TablaTecnico SYSNAME = NULL;
    DECLARE @ColumnaPkTecnico SYSNAME = NULL;
    DECLARE @SqlFkTecnico NVARCHAR(MAX);

    IF OBJECT_ID('dbo.tbl_usuario_tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_usuario_tecnico';
    ELSE IF OBJECT_ID('dbo.tbl_UsuarioTecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_UsuarioTecnico';
    ELSE IF OBJECT_ID('dbo.tbl_Usuario_Tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_Usuario_Tecnico';

    IF @TablaTecnico IS NOT NULL
    BEGIN
        IF COL_LENGTH(@TablaTecnico, 'id_usuario_tecnico') IS NOT NULL SET @ColumnaPkTecnico = 'id_usuario_tecnico';
        ELSE IF COL_LENGTH(@TablaTecnico, 'idUsuarioTecnico') IS NOT NULL SET @ColumnaPkTecnico = 'idUsuarioTecnico';
        ELSE IF COL_LENGTH(@TablaTecnico, 'Id_Usuario_Tecnico') IS NOT NULL SET @ColumnaPkTecnico = 'Id_Usuario_Tecnico';

        IF @ColumnaPkTecnico IS NOT NULL
        BEGIN
            SET @SqlFkTecnico = N'ALTER TABLE dbo.tbl_DetalleGrupo
                ADD CONSTRAINT FK_tbl_DetalleGrupo_tbl_usuario_tecnico
                FOREIGN KEY (id_usuario_tecnico) REFERENCES ' + @TablaTecnico + N'(' + QUOTENAME(@ColumnaPkTecnico) + N')';
            EXEC sp_executesql @SqlFkTecnico;
        END
    END
END
GO

/* =========================================================
   DB: SucrePrueba
   ========================================================= */
USE [SucrePrueba]
GO

IF OBJECT_ID('dbo.tbl_Grupo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Grupo (
        id_grupo INT IDENTITY(1,1) NOT NULL,
        nombre NVARCHAR(120) NOT NULL,
        e_eliminado BIT NOT NULL CONSTRAINT DF_tbl_Grupo_e_eliminado DEFAULT (0),
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_tbl_Grupo_fecha_registro DEFAULT (GETDATE()),
        CONSTRAINT PK_tbl_Grupo PRIMARY KEY CLUSTERED (id_grupo)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_tbl_Grupo_nombre'
      AND object_id = OBJECT_ID('dbo.tbl_Grupo')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_Grupo_nombre
        ON dbo.tbl_Grupo(nombre);
END
GO

IF OBJECT_ID('dbo.tbl_GrupoSup', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_GrupoSup (
        id_grupo_sup INT IDENTITY(1,1) NOT NULL,
        id_usuario INT NOT NULL,
        id_grupo INT NOT NULL,
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_tbl_GrupoSup_fecha_registro DEFAULT (GETDATE()),
        CONSTRAINT PK_tbl_GrupoSup PRIMARY KEY CLUSTERED (id_grupo_sup)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_tbl_GrupoSup_usuario_grupo'
      AND object_id = OBJECT_ID('dbo.tbl_GrupoSup')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_GrupoSup_usuario_grupo
        ON dbo.tbl_GrupoSup(id_usuario, id_grupo);
END
GO

IF OBJECT_ID('dbo.tbl_DetalleGrupo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_DetalleGrupo (
        id_detalle_grupo INT IDENTITY(1,1) NOT NULL,
        id_grupo INT NOT NULL,
        id_usuario_tecnico INT NOT NULL,
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_tbl_DetalleGrupo_fecha_registro DEFAULT (GETDATE()),
        CONSTRAINT PK_tbl_DetalleGrupo PRIMARY KEY CLUSTERED (id_detalle_grupo)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_tbl_DetalleGrupo_grupo_tecnico'
      AND object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_DetalleGrupo_grupo_tecnico
        ON dbo.tbl_DetalleGrupo(id_grupo, id_usuario_tecnico);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_tbl_GrupoSup_tbl_Grupo'
      AND parent_object_id = OBJECT_ID('dbo.tbl_GrupoSup')
)
BEGIN
    ALTER TABLE dbo.tbl_GrupoSup
        ADD CONSTRAINT FK_tbl_GrupoSup_tbl_Grupo
            FOREIGN KEY (id_grupo) REFERENCES dbo.tbl_Grupo(id_grupo);
END
GO

IF OBJECT_ID('dbo.tbl_Usuario', 'U') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE name = 'FK_tbl_GrupoSup_tbl_Usuario'
          AND parent_object_id = OBJECT_ID('dbo.tbl_GrupoSup')
   )
BEGIN
    ALTER TABLE dbo.tbl_GrupoSup
        ADD CONSTRAINT FK_tbl_GrupoSup_tbl_Usuario
            FOREIGN KEY (id_usuario) REFERENCES dbo.tbl_Usuario(Id_Usuario);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_tbl_DetalleGrupo_tbl_Grupo'
      AND parent_object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
)
BEGIN
    ALTER TABLE dbo.tbl_DetalleGrupo
        ADD CONSTRAINT FK_tbl_DetalleGrupo_tbl_Grupo
            FOREIGN KEY (id_grupo) REFERENCES dbo.tbl_Grupo(id_grupo);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_tbl_DetalleGrupo_tbl_usuario_tecnico'
      AND parent_object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
)
BEGIN
    DECLARE @TablaTecnico SYSNAME = NULL;
    DECLARE @ColumnaPkTecnico SYSNAME = NULL;
    DECLARE @SqlFkTecnico NVARCHAR(MAX);

    IF OBJECT_ID('dbo.tbl_usuario_tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_usuario_tecnico';
    ELSE IF OBJECT_ID('dbo.tbl_UsuarioTecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_UsuarioTecnico';
    ELSE IF OBJECT_ID('dbo.tbl_Usuario_Tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_Usuario_Tecnico';

    IF @TablaTecnico IS NOT NULL
    BEGIN
        IF COL_LENGTH(@TablaTecnico, 'id_usuario_tecnico') IS NOT NULL SET @ColumnaPkTecnico = 'id_usuario_tecnico';
        ELSE IF COL_LENGTH(@TablaTecnico, 'idUsuarioTecnico') IS NOT NULL SET @ColumnaPkTecnico = 'idUsuarioTecnico';
        ELSE IF COL_LENGTH(@TablaTecnico, 'Id_Usuario_Tecnico') IS NOT NULL SET @ColumnaPkTecnico = 'Id_Usuario_Tecnico';

        IF @ColumnaPkTecnico IS NOT NULL
        BEGIN
            SET @SqlFkTecnico = N'ALTER TABLE dbo.tbl_DetalleGrupo
                ADD CONSTRAINT FK_tbl_DetalleGrupo_tbl_usuario_tecnico
                FOREIGN KEY (id_usuario_tecnico) REFERENCES ' + @TablaTecnico + N'(' + QUOTENAME(@ColumnaPkTecnico) + N')';
            EXEC sp_executesql @SqlFkTecnico;
        END
    END
END
GO
