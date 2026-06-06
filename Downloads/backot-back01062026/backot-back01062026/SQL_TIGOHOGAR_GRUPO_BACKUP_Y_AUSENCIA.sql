SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

USE [BD_TigoHogar]
GO

IF OBJECT_ID('dbo.tbl_Grupo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_Grupo (
        id_grupo INT IDENTITY(1,1) NOT NULL,
        nombre NVARCHAR(120) NOT NULL,
        supervisor_ausente BIT NOT NULL CONSTRAINT DF_tbl_Grupo_supervisor_ausente DEFAULT (0),
        e_eliminado BIT NOT NULL CONSTRAINT DF_tbl_Grupo_e_eliminado DEFAULT (0),
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_tbl_Grupo_fecha_registro DEFAULT (GETDATE()),
        CONSTRAINT PK_tbl_Grupo PRIMARY KEY CLUSTERED (id_grupo)
    );
END
GO

IF COL_LENGTH('dbo.tbl_Grupo', 'supervisor_ausente') IS NULL
BEGIN
    ALTER TABLE dbo.tbl_Grupo
        ADD supervisor_ausente BIT NOT NULL CONSTRAINT DF_tbl_Grupo_supervisor_ausente_2 DEFAULT (0);
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

IF OBJECT_ID('dbo.tbl_GrupoBackup', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_GrupoBackup (
        id_grupo_backup INT IDENTITY(1,1) NOT NULL,
        id_grupo INT NOT NULL,
        id_usuario_tecnico_temporal INT NOT NULL,
        e_activo BIT NOT NULL CONSTRAINT DF_tbl_GrupoBackup_e_activo DEFAULT (1),
        fecha_inicio DATETIME NOT NULL CONSTRAINT DF_tbl_GrupoBackup_fecha_inicio DEFAULT (GETDATE()),
        fecha_fin DATETIME NULL,
        id_usuario_registra INT NULL,
        id_usuario_actualiza INT NULL,
        fecha_actualizacion DATETIME NULL,
        CONSTRAINT PK_tbl_GrupoBackup PRIMARY KEY CLUSTERED (id_grupo_backup)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_tbl_GrupoBackup_tbl_Grupo'
      AND parent_object_id = OBJECT_ID('dbo.tbl_GrupoBackup')
)
BEGIN
    ALTER TABLE dbo.tbl_GrupoBackup
        ADD CONSTRAINT FK_tbl_GrupoBackup_tbl_Grupo
            FOREIGN KEY (id_grupo) REFERENCES dbo.tbl_Grupo(id_grupo);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tbl_GrupoBackup')
      AND name = 'UX_tbl_GrupoBackup_grupo_activo'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_GrupoBackup_grupo_activo
        ON dbo.tbl_GrupoBackup(id_grupo)
        WHERE e_activo = 1;
END
GO

IF OBJECT_ID('dbo.spx_Grupo_ListarCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_ListarCentral @IdUsuarioEjecutor INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_ListarCentral
    @IdUsuarioEjecutor INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        g.id_grupo,
        g.nombre,
        g.supervisor_ausente,
        g.fecha_registro,
        CAST(NULL AS NVARCHAR(200)) AS supervisor,
        (SELECT COUNT(1) FROM dbo.tbl_DetalleGrupo dgc WHERE dgc.id_grupo = g.id_grupo) AS cantidad_tecnicos,
        CAST(0 AS INT) AS cantidad_supervisores,
        dg.id_usuario_tecnico,
        CONCAT('Tecnico ', CAST(dg.id_usuario_tecnico AS NVARCHAR(30))) AS tecnico,
        gb.id_usuario_tecnico_temporal AS id_tecnico_temporal_backup,
        CONCAT('Tecnico ', CAST(gb.id_usuario_tecnico_temporal AS NVARCHAR(30))) AS tecnico_temporal_backup
    FROM dbo.tbl_Grupo g
    LEFT JOIN dbo.tbl_DetalleGrupo dg
           ON dg.id_grupo = g.id_grupo
    LEFT JOIN dbo.tbl_GrupoBackup gb
           ON gb.id_grupo = g.id_grupo
          AND gb.e_activo = 1
    WHERE ISNULL(g.e_eliminado, 0) = 0
    ORDER BY g.nombre, dg.id_usuario_tecnico;
END
GO

IF OBJECT_ID('dbo.spx_Grupo_MarcarSupervisorAusenteCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_MarcarSupervisorAusenteCentral @IdUsuarioEjecutor INT, @IdGrupo INT, @IdUsuarioTecnico INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_MarcarSupervisorAusenteCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF @IdUsuarioTecnico IS NULL OR @IdUsuarioTecnico <= 0
    BEGIN
        RAISERROR('IdUsuarioTecnico es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o eliminado.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico
    )
    BEGIN
        RAISERROR('El tecnico temporal debe pertenecer al grupo.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_GrupoBackup
    SET e_activo = 0,
        fecha_fin = ISNULL(fecha_fin, GETDATE()),
        id_usuario_actualiza = @IdUsuarioEjecutor,
        fecha_actualizacion = GETDATE()
    WHERE id_grupo = @IdGrupo
      AND e_activo = 1;

    INSERT INTO dbo.tbl_GrupoBackup (
        id_grupo,
        id_usuario_tecnico_temporal,
        e_activo,
        fecha_inicio,
        id_usuario_registra
    )
    VALUES (
        @IdGrupo,
        @IdUsuarioTecnico,
        1,
        GETDATE(),
        @IdUsuarioEjecutor
    );

    UPDATE dbo.tbl_Grupo
    SET supervisor_ausente = 1
    WHERE id_grupo = @IdGrupo;

    SELECT TOP 1
        g.id_grupo,
        g.nombre,
        g.supervisor_ausente,
        gb.id_usuario_tecnico_temporal AS id_tecnico_temporal_backup
    FROM dbo.tbl_Grupo g
    INNER JOIN dbo.tbl_GrupoBackup gb
            ON gb.id_grupo = g.id_grupo
           AND gb.e_activo = 1
    WHERE g.id_grupo = @IdGrupo
    ORDER BY gb.id_grupo_backup DESC;
END
GO

IF OBJECT_ID('dbo.spx_Grupo_RestaurarSupervisorCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_RestaurarSupervisorCentral @IdUsuarioEjecutor INT, @IdGrupo INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_RestaurarSupervisorCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o eliminado.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_GrupoBackup
    SET e_activo = 0,
        fecha_fin = ISNULL(fecha_fin, GETDATE()),
        id_usuario_actualiza = @IdUsuarioEjecutor,
        fecha_actualizacion = GETDATE()
    WHERE id_grupo = @IdGrupo
      AND e_activo = 1;

    UPDATE dbo.tbl_Grupo
    SET supervisor_ausente = 0
    WHERE id_grupo = @IdGrupo;

    SELECT TOP 1
        g.id_grupo,
        g.nombre,
        g.supervisor_ausente
    FROM dbo.tbl_Grupo g
    WHERE g.id_grupo = @IdGrupo;
END
GO

IF OBJECT_ID('dbo.spx_Grupo_CambiarColaboradorBackupCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_CambiarColaboradorBackupCentral @IdUsuarioEjecutor INT, @IdGrupo INT, @IdUsuarioTecnico INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_CambiarColaboradorBackupCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF @IdUsuarioTecnico IS NULL OR @IdUsuarioTecnico <= 0
    BEGIN
        RAISERROR('IdUsuarioTecnico es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o eliminado.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.supervisor_ausente, 0) = 1
    )
    BEGIN
        RAISERROR('El grupo no esta en estado supervisor ausente.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico
    )
    BEGIN
        RAISERROR('El tecnico temporal debe pertenecer al grupo.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_GrupoBackup gb
        WHERE gb.id_grupo = @IdGrupo
          AND gb.e_activo = 1
    )
    BEGIN
        RAISERROR('No existe backup activo para el grupo.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_GrupoBackup
    SET id_usuario_tecnico_temporal = @IdUsuarioTecnico,
        id_usuario_actualiza = @IdUsuarioEjecutor,
        fecha_actualizacion = GETDATE()
    WHERE id_grupo = @IdGrupo
      AND e_activo = 1;

    SELECT TOP 1
        gb.id_grupo_backup,
        gb.id_grupo,
        gb.id_usuario_tecnico_temporal AS id_tecnico_temporal_backup,
        gb.e_activo
    FROM dbo.tbl_GrupoBackup gb
    WHERE gb.id_grupo = @IdGrupo
      AND gb.e_activo = 1
    ORDER BY gb.id_grupo_backup DESC;
END
GO
