SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* Ejecutar este script en la DB objetivo:
   - BDSistemaAntenaUTecnico
   - SucrePrueba
*/

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
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tbl_Grupo')
      AND name = 'UX_tbl_Grupo_nombre'
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
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tbl_GrupoSup')
      AND name = 'UX_tbl_GrupoSup_usuario_grupo'
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

-- Evita duplicar tecnico dentro del mismo grupo
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
      AND name = 'UX_tbl_DetalleGrupo_grupo_tecnico'
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo
        GROUP BY id_grupo, id_usuario_tecnico
        HAVING COUNT(*) > 1
    )
    BEGIN
        CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_DetalleGrupo_grupo_tecnico
            ON dbo.tbl_DetalleGrupo (id_grupo, id_usuario_tecnico);
    END
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tbl_DetalleGrupo')
      AND name = 'UX_tbl_DetalleGrupo_grupo_tecnico'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_DetalleGrupo_grupo_tecnico
        ON dbo.tbl_DetalleGrupo(id_grupo, id_usuario_tecnico);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
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
        SELECT 1 FROM sys.foreign_keys
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
    SELECT 1 FROM sys.foreign_keys
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
        ELSE IF COL_LENGTH(@TablaTecnico, 'id') IS NOT NULL SET @ColumnaPkTecnico = 'id';

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

IF OBJECT_ID('dbo.spx_Grupo_CrearCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_CrearCentral @IdUsuarioEjecutor INT, @Nombre NVARCHAR(120) AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_CrearCentral
    @IdUsuarioEjecutor INT,
    @Nombre NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NombreNorm NVARCHAR(120) = NULLIF(LTRIM(RTRIM(@Nombre)), '');
    IF @NombreNorm IS NULL
    BEGIN
        RAISERROR('Nombre de grupo es requerido.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE ISNULL(g.e_eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(g.nombre))) = LOWER(@NombreNorm)
    )
    BEGIN
        RAISERROR('Ya existe un grupo activo con ese nombre.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.tbl_Grupo (nombre, e_eliminado, fecha_registro)
    VALUES (@NombreNorm, 0, GETDATE());

    SELECT TOP 1 id_grupo, nombre, e_eliminado, fecha_registro
    FROM dbo.tbl_Grupo
    WHERE id_grupo = SCOPE_IDENTITY();
END
GO

IF OBJECT_ID('dbo.spx_Grupo_AsignarSupervisorCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_AsignarSupervisorCentral @IdUsuarioEjecutor INT, @IdGrupo INT, @IdUsuarioSupervisor INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_AsignarSupervisorCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF @IdUsuarioSupervisor IS NULL OR @IdUsuarioSupervisor <= 0
    BEGIN
        RAISERROR('IdUsuarioSupervisor es requerido.', 16, 1);
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
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioSupervisor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) LIKE '%supervisor%'
    )
    BEGIN
        RAISERROR('El usuario indicado no es supervisor activo.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_GrupoSup gs
        WHERE gs.id_grupo = @IdGrupo
          AND gs.id_usuario = @IdUsuarioSupervisor
    )
    BEGIN
        SELECT gs.id_grupo_sup, gs.id_usuario, gs.id_grupo, gs.fecha_registro
        FROM dbo.tbl_GrupoSup gs
        WHERE gs.id_grupo = @IdGrupo
          AND gs.id_usuario = @IdUsuarioSupervisor;
        RETURN;
    END

    INSERT INTO dbo.tbl_GrupoSup (id_usuario, id_grupo, fecha_registro)
    VALUES (@IdUsuarioSupervisor, @IdGrupo, GETDATE());

    SELECT TOP 1 gs.id_grupo_sup, gs.id_usuario, gs.id_grupo, gs.fecha_registro
    FROM dbo.tbl_GrupoSup gs
    WHERE gs.id_grupo_sup = SCOPE_IDENTITY();
END
GO

IF OBJECT_ID('dbo.spx_Grupo_AsignarTecnicoCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_AsignarTecnicoCentral @IdUsuarioEjecutor INT, @IdGrupo INT, @IdUsuarioTecnico INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_AsignarTecnicoCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TablaTecnico SYSNAME = NULL;
    DECLARE @ColumnaTecnico SYSNAME = NULL;
    DECLARE @IdTecnicoResuelto INT = NULL;
    DECLARE @Sql NVARCHAR(MAX);

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

    IF OBJECT_ID('dbo.tbl_usuario_tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_usuario_tecnico';
    ELSE IF OBJECT_ID('dbo.tbl_UsuarioTecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_UsuarioTecnico';
    ELSE IF OBJECT_ID('dbo.tbl_Usuario_Tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_Usuario_Tecnico';

    IF @TablaTecnico IS NULL
    BEGIN
        RAISERROR('No existe tabla de usuario tecnico en esta BD.', 16, 1);
        RETURN;
    END

    IF COL_LENGTH(@TablaTecnico, 'id_usuario_tecnico') IS NOT NULL SET @ColumnaTecnico = 'id_usuario_tecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'idUsuarioTecnico') IS NOT NULL SET @ColumnaTecnico = 'idUsuarioTecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'Id_Usuario_Tecnico') IS NOT NULL SET @ColumnaTecnico = 'Id_Usuario_Tecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'id') IS NOT NULL SET @ColumnaTecnico = 'id';

    IF @ColumnaTecnico IS NULL
    BEGIN
        RAISERROR('No se encontro la columna PK de usuario tecnico.', 16, 1);
        RETURN;
    END

    SET @Sql = N'
        SELECT TOP 1 @IdResOut = t.' + QUOTENAME(@ColumnaTecnico) + N'
        FROM ' + @TablaTecnico + N' t
        WHERE t.' + QUOTENAME(@ColumnaTecnico) + N' = @IdInput
          AND (COL_LENGTH(''' + @TablaTecnico + ''', ''e_eliminado'') IS NULL OR ISNULL(t.e_eliminado,0)=0);';
    EXEC sp_executesql @Sql, N'@IdInput INT, @IdResOut INT OUTPUT', @IdInput = @IdUsuarioTecnico, @IdResOut = @IdTecnicoResuelto OUTPUT;

    IF @IdTecnicoResuelto IS NULL
       AND (COL_LENGTH(@TablaTecnico, 'id_vendedor') IS NOT NULL OR COL_LENGTH(@TablaTecnico, 'id_Vendedor') IS NOT NULL)
    BEGIN
        SET @Sql = N'
            SELECT TOP 1 @IdResOut = t.' + QUOTENAME(@ColumnaTecnico) + N'
            FROM ' + @TablaTecnico + N' t
            WHERE (
                    (COL_LENGTH(''' + @TablaTecnico + ''', ''id_vendedor'') IS NOT NULL AND t.id_vendedor = @IdInput)
                 OR (COL_LENGTH(''' + @TablaTecnico + ''', ''id_Vendedor'') IS NOT NULL AND t.id_Vendedor = @IdInput)
                  )
              AND (COL_LENGTH(''' + @TablaTecnico + ''', ''e_eliminado'') IS NULL OR ISNULL(t.e_eliminado,0)=0);';
        EXEC sp_executesql @Sql, N'@IdInput INT, @IdResOut INT OUTPUT', @IdInput = @IdUsuarioTecnico, @IdResOut = @IdTecnicoResuelto OUTPUT;
    END

    IF @IdTecnicoResuelto IS NULL
       AND (COL_LENGTH(@TablaTecnico, 'id_vendedor') IS NOT NULL OR COL_LENGTH(@TablaTecnico, 'id_Vendedor') IS NOT NULL)
    BEGIN
        DECLARE @TablaVendedor SYSNAME = NULL;
        DECLARE @ColVendedorPk SYSNAME = NULL;
        DECLARE @ColTecnicoVendedor SYSNAME = NULL;
        DECLARE @ExisteVendedor INT = 0;
        DECLARE @InsertCols NVARCHAR(MAX);
        DECLARE @InsertVals NVARCHAR(MAX);

        IF OBJECT_ID('dbo.tbl_vendedor', 'U') IS NOT NULL SET @TablaVendedor = 'dbo.tbl_vendedor';
        ELSE IF OBJECT_ID('dbo.tbl_Vendedor', 'U') IS NOT NULL SET @TablaVendedor = 'dbo.tbl_Vendedor';

        IF @TablaVendedor IS NOT NULL
        BEGIN
            IF COL_LENGTH(@TablaVendedor, 'id_vendedor') IS NOT NULL SET @ColVendedorPk = 'id_vendedor';
            ELSE IF COL_LENGTH(@TablaVendedor, 'Id_Vendedor') IS NOT NULL SET @ColVendedorPk = 'Id_Vendedor';
        END

        IF COL_LENGTH(@TablaTecnico, 'id_vendedor') IS NOT NULL SET @ColTecnicoVendedor = 'id_vendedor';
        ELSE IF COL_LENGTH(@TablaTecnico, 'id_Vendedor') IS NOT NULL SET @ColTecnicoVendedor = 'id_Vendedor';

        IF @TablaVendedor IS NOT NULL AND @ColVendedorPk IS NOT NULL AND @ColTecnicoVendedor IS NOT NULL
        BEGIN
            SET @Sql = N'
                SELECT TOP 1 @ExisteOut = 1
                FROM ' + @TablaVendedor + N' v
                WHERE v.' + QUOTENAME(@ColVendedorPk) + N' = @IdInput
                  AND (COL_LENGTH(''' + @TablaVendedor + ''', ''e_eliminado'') IS NULL OR ISNULL(v.e_eliminado,0)=0);';
            EXEC sp_executesql @Sql, N'@IdInput INT, @ExisteOut INT OUTPUT', @IdInput = @IdUsuarioTecnico, @ExisteOut = @ExisteVendedor OUTPUT;
        END

        IF @ExisteVendedor = 1
        BEGIN
            SET @InsertCols = QUOTENAME(@ColTecnicoVendedor);
            SET @InsertVals = N'@IdVendedor';

            IF COL_LENGTH(@TablaTecnico, 'id_Usuario') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [id_Usuario]';
                SET @InsertVals = @InsertVals + N', NULL';
            END
            IF COL_LENGTH(@TablaTecnico, 'id_UsuarioRegistra') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [id_UsuarioRegistra]';
                SET @InsertVals = @InsertVals + N', ISNULL(@IdUsuarioRegistra,0)';
            END
            IF COL_LENGTH(@TablaTecnico, 'e_eliminado') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [e_eliminado]';
                SET @InsertVals = @InsertVals + N', 0';
            END
            IF COL_LENGTH(@TablaTecnico, 'fecharegistro') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [fecharegistro]';
                SET @InsertVals = @InsertVals + N', GETDATE()';
            END
            IF COL_LENGTH(@TablaTecnico, 'fecha_registro') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [fecha_registro]';
                SET @InsertVals = @InsertVals + N', GETDATE()';
            END

            SET @Sql = N'
                INSERT INTO ' + @TablaTecnico + N' (' + @InsertCols + N')
                VALUES (' + @InsertVals + N');

                SELECT TOP 1 @IdResOut = t.' + QUOTENAME(@ColumnaTecnico) + N'
                FROM ' + @TablaTecnico + N' t
                WHERE t.' + QUOTENAME(@ColTecnicoVendedor) + N' = @IdVendedor
                  AND (COL_LENGTH(''' + @TablaTecnico + ''', ''e_eliminado'') IS NULL OR ISNULL(t.e_eliminado,0)=0)
                ORDER BY t.' + QUOTENAME(@ColumnaTecnico) + N' DESC;';
            EXEC sp_executesql
                @Sql,
                N'@IdVendedor INT, @IdUsuarioRegistra INT, @IdResOut INT OUTPUT',
                @IdVendedor = @IdUsuarioTecnico,
                @IdUsuarioRegistra = @IdUsuarioEjecutor,
                @IdResOut = @IdTecnicoResuelto OUTPUT;
        END
    END

    IF @IdTecnicoResuelto IS NULL
    BEGIN
        RAISERROR('El tecnico indicado no existe en tabla usuario_tecnico (ni por id interno ni por id_vendedor).', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdTecnicoResuelto
    )
    BEGIN
        SELECT dg.id_detalle_grupo, dg.id_grupo, dg.id_usuario_tecnico, dg.fecha_registro
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdTecnicoResuelto;
        RETURN;
    END

    INSERT INTO dbo.tbl_DetalleGrupo (id_grupo, id_usuario_tecnico, fecha_registro)
    VALUES (@IdGrupo, @IdTecnicoResuelto, GETDATE());

    SELECT TOP 1 dg.id_detalle_grupo, dg.id_grupo, dg.id_usuario_tecnico, dg.fecha_registro
    FROM dbo.tbl_DetalleGrupo dg
    WHERE dg.id_detalle_grupo = SCOPE_IDENTITY();
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
        g.fecha_registro,
        COUNT(DISTINCT gs.id_grupo_sup) AS cantidad_supervisores,
        COUNT(DISTINCT dg.id_detalle_grupo) AS cantidad_tecnicos
    FROM dbo.tbl_Grupo g
    LEFT JOIN dbo.tbl_GrupoSup gs
           ON gs.id_grupo = g.id_grupo
    LEFT JOIN dbo.tbl_DetalleGrupo dg
           ON dg.id_grupo = g.id_grupo
    WHERE ISNULL(g.e_eliminado, 0) = 0
    GROUP BY g.id_grupo, g.nombre, g.fecha_registro
    ORDER BY g.nombre;
END
GO
