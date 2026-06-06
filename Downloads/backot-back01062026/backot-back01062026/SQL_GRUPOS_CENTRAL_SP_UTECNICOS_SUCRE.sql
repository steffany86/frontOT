SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* =========================================================
   1) BDControlOrdenes: asignar menu faltante a rol Central
   ========================================================= */
USE [BDControlOrdenes]
GO

DECLARE @IdRolCentral INT;
DECLARE @IdMenuLlamadaSupervisor INT;

SELECT TOP 1 @IdRolCentral = r.Id_Rol
FROM dbo.tbl_Rol r
WHERE ISNULL(r.E_Eliminado, 0) = 0
  AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central';

SELECT TOP 1 @IdMenuLlamadaSupervisor = m.Id
FROM dbo.tbl_tablamenu m
WHERE ISNULL(m.e_eliminado, 0) = 0
  AND LOWER(LTRIM(RTRIM(m.nombre))) = 'tsm_llamadaatencion_supervisor';

IF @IdRolCentral IS NOT NULL AND @IdMenuLlamadaSupervisor IS NOT NULL
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_RolMenu rm
        WHERE rm.Id_Rol = @IdRolCentral
          AND rm.Id_Menu = @IdMenuLlamadaSupervisor
    )
    BEGIN
        UPDATE dbo.tbl_RolMenu
        SET E_Eliminado = 0
        WHERE Id_Rol = @IdRolCentral
          AND Id_Menu = @IdMenuLlamadaSupervisor;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado)
        VALUES (@IdMenuLlamadaSupervisor, @IdRolCentral, 0);
    END
END
GO

/* =========================================================
   2) BDSistemaAntenaUTecnico: SPs de grupos para rol Central
   ========================================================= */
USE [BDSistemaAntenaUTecnico]
GO

IF OBJECT_ID('dbo.spx_Grupo_FiltroSupervisoresCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_FiltroSupervisoresCentral AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_FiltroSupervisoresCentral
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb;
END
GO

IF OBJECT_ID('dbo.spx_Grupo_FiltroTecnicosCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_FiltroTecnicosCentral AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_FiltroTecnicosCentral
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb;
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

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede crear grupos.', 16, 1);
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
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede asignar supervisores a grupos.', 16, 1);
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
    DECLARE @ExisteTecnico INT = 0;
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
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede asignar tecnicos a grupos.', 16, 1);
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

    IF @ColumnaTecnico IS NULL
    BEGIN
        RAISERROR('No se encontro la columna PK de usuario tecnico.', 16, 1);
        RETURN;
    END

    SET @Sql = N'
        SELECT @ExisteOut = CASE WHEN EXISTS (
            SELECT 1 FROM ' + @TablaTecnico + N' t WHERE t.' + QUOTENAME(@ColumnaTecnico) + N' = @IdTec
        ) THEN 1 ELSE 0 END;';
    EXEC sp_executesql @Sql, N'@IdTec INT, @ExisteOut INT OUTPUT', @IdTec = @IdUsuarioTecnico, @ExisteOut = @ExisteTecnico OUTPUT;

    IF @ExisteTecnico = 0
    BEGIN
        RAISERROR('El tecnico indicado no existe en tabla usuario_tecnico.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico
    )
    BEGIN
        SELECT dg.id_detalle_grupo, dg.id_grupo, dg.id_usuario_tecnico, dg.fecha_registro
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico;
        RETURN;
    END

    INSERT INTO dbo.tbl_DetalleGrupo (id_grupo, id_usuario_tecnico, fecha_registro)
    VALUES (@IdGrupo, @IdUsuarioTecnico, GETDATE());

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

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede listar grupos.', 16, 1);
        RETURN;
    END

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

/* =========================================================
   3) SucrePrueba: SPs de grupos para rol Central
   ========================================================= */
USE [SucrePrueba]
GO

IF OBJECT_ID('dbo.spx_Grupo_FiltroSupervisoresCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_FiltroSupervisoresCentral AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_FiltroSupervisoresCentral
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb;
END
GO

IF OBJECT_ID('dbo.spx_Grupo_FiltroTecnicosCentral', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_Grupo_FiltroTecnicosCentral AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO
ALTER PROC dbo.spx_Grupo_FiltroTecnicosCentral
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb;
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

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede crear grupos.', 16, 1);
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
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede asignar supervisores a grupos.', 16, 1);
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
    DECLARE @ExisteTecnico INT = 0;
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
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede asignar tecnicos a grupos.', 16, 1);
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

    IF @ColumnaTecnico IS NULL
    BEGIN
        RAISERROR('No se encontro la columna PK de usuario tecnico.', 16, 1);
        RETURN;
    END

    SET @Sql = N'
        SELECT @ExisteOut = CASE WHEN EXISTS (
            SELECT 1 FROM ' + @TablaTecnico + N' t WHERE t.' + QUOTENAME(@ColumnaTecnico) + N' = @IdTec
        ) THEN 1 ELSE 0 END;';
    EXEC sp_executesql @Sql, N'@IdTec INT, @ExisteOut INT OUTPUT', @IdTec = @IdUsuarioTecnico, @ExisteOut = @ExisteTecnico OUTPUT;

    IF @ExisteTecnico = 0
    BEGIN
        RAISERROR('El tecnico indicado no existe en tabla usuario_tecnico.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico
    )
    BEGIN
        SELECT dg.id_detalle_grupo, dg.id_grupo, dg.id_usuario_tecnico, dg.fecha_registro
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico;
        RETURN;
    END

    INSERT INTO dbo.tbl_DetalleGrupo (id_grupo, id_usuario_tecnico, fecha_registro)
    VALUES (@IdGrupo, @IdUsuarioTecnico, GETDATE());

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

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede listar grupos.', 16, 1);
        RETURN;
    END

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

