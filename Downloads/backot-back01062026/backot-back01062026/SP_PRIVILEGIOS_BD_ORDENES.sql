-- Privilegios en BDControlOrdenes usando la nueva tabla dbo.tbl_tablamenu
-- Incluye: menu base minimo + SP de lectura/guardado por rol

IF DB_ID('BDControlOrdenes') IS NULL
BEGIN
    RAISERROR('BDControlOrdenes no existe en este servidor.', 16, 1);
    RETURN;
END
GO

USE BDControlOrdenes
GO

IF OBJECT_ID('dbo.tbl_tablamenu', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_tablamenu (
        Id INT IDENTITY(1,1) NOT NULL,
        nombre NVARCHAR(150) NULL,
        nombre_sidebar NVARCHAR(150) NULL,
        pagina_asociada NVARCHAR(150) NULL,
        [orden] INT NULL,
        padre INT NULL,
        e_eliminado BIT NULL,
        fecharegistro DATETIME NULL,
        id_Usuario INT NULL,
        CONSTRAINT PK_tbl_tablamenu PRIMARY KEY (Id)
    );
END
GO

IF COL_LENGTH('dbo.tbl_tablamenu', 'pagina_asociada') IS NULL
BEGIN
    ALTER TABLE dbo.tbl_tablamenu
    ADD pagina_asociada NVARCHAR(150) NULL;
END
GO

IF COL_LENGTH('dbo.tbl_tablamenu', 'nombre_sidebar') IS NULL
BEGIN
    ALTER TABLE dbo.tbl_tablamenu
    ADD nombre_sidebar NVARCHAR(150) NULL;
END
GO

IF OBJECT_ID('dbo.tbl_RolMenu', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_RolMenu (
        Id_RolMenu INT IDENTITY(1,1) NOT NULL,
        Id_Menu INT NULL,
        Id_Rol INT NULL,
        E_Eliminado BIT NULL,
        CONSTRAINT PK_tbl_RolMenu PRIMARY KEY (Id_RolMenu)
    );
END
GO

IF OBJECT_ID('dbo.tbl_MenuPaginaAsociada', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_MenuPaginaAsociada (
        Id_MenuPaginaAsociada INT IDENTITY(1,1) NOT NULL,
        Id_Menu INT NOT NULL,
        Pagina_Asociada NVARCHAR(150) NOT NULL,
        E_Eliminado BIT NULL,
        FechaRegistro DATETIME NULL,
        Id_Usuario INT NULL,
        CONSTRAINT PK_tbl_MenuPaginaAsociada PRIMARY KEY (Id_MenuPaginaAsociada)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tbl_MenuPaginaAsociada')
      AND name = 'UX_tbl_MenuPaginaAsociada_IdMenu_Pagina'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_tbl_MenuPaginaAsociada_IdMenu_Pagina
    ON dbo.tbl_MenuPaginaAsociada (Id_Menu, Pagina_Asociada);
END
GO

-- Menus minimos actuales
DECLARE @ahora DATETIME = GETDATE();

IF NOT EXISTS (
    SELECT 1
    FROM dbo.tbl_tablamenu
    WHERE LOWER(LTRIM(RTRIM(nombre))) = 'tsm_conformacioncuadrillas'
)
BEGIN
    INSERT INTO dbo.tbl_tablamenu (nombre, [orden], padre, e_eliminado, fecharegistro, id_Usuario)
    VALUES (N'tsm_ConformacionCuadrillas', 1, 1, 0, @ahora, 1);
END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.tbl_tablamenu
    WHERE LOWER(LTRIM(RTRIM(nombre))) = 'tsm_listaagenda'
)
BEGIN
    INSERT INTO dbo.tbl_tablamenu (nombre, [orden], padre, e_eliminado, fecharegistro, id_Usuario)
    VALUES (N'tsm_ListaAgenda', 2, 1, 0, @ahora, 1);
END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.tbl_tablamenu
    WHERE LOWER(LTRIM(RTRIM(nombre))) = 'tsm_privilegios'
)
BEGIN
    INSERT INTO dbo.tbl_tablamenu (nombre, [orden], padre, e_eliminado, fecharegistro, id_Usuario)
    VALUES (N'tsm_privilegios', 3, 1, 0, @ahora, 1);
END

IF NOT EXISTS (
    SELECT 1
    FROM dbo.tbl_tablamenu
    WHERE LOWER(LTRIM(RTRIM(nombre))) = 'prueba'
)
BEGIN
    INSERT INTO dbo.tbl_tablamenu (nombre, [orden], padre, e_eliminado, fecharegistro, id_Usuario)
    VALUES (N'prueba', 4, 1, 0, @ahora, 1);
END
GO

-- Migra valor legacy de pagina unica (tbl_tablamenu.pagina_asociada) a tabla intermedia.
INSERT INTO dbo.tbl_MenuPaginaAsociada (Id_Menu, Pagina_Asociada, E_Eliminado, FechaRegistro, Id_Usuario)
SELECT m.Id,
       LTRIM(RTRIM(m.pagina_asociada)),
       0,
       GETDATE(),
       ISNULL(m.id_Usuario, 1)
FROM dbo.tbl_tablamenu m
WHERE m.pagina_asociada IS NOT NULL
  AND LTRIM(RTRIM(m.pagina_asociada)) <> ''
  AND ISNULL(m.e_eliminado, 0) = 0
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.tbl_MenuPaginaAsociada mp
      WHERE mp.Id_Menu = m.Id
        AND LOWER(LTRIM(RTRIM(mp.Pagina_Asociada))) = LOWER(LTRIM(RTRIM(m.pagina_asociada)))
  );
GO

-- Seed base de asociaciones menu -> paginas JSX (idempotente).
DECLARE @MenuPaginasSeed TABLE (
    MenuNombre NVARCHAR(150) NOT NULL,
    PaginaAsociada NVARCHAR(150) NOT NULL
);

INSERT INTO @MenuPaginasSeed (MenuNombre, PaginaAsociada)
VALUES
    (N'tsm_listaagenda', N'OTPrincipal'),
    (N'tsm_conformacioncuadrillas', N'CuadrillasPrincipal'),
    (N'tsm_privilegios', N'PrivilegiosPrincipal');

INSERT INTO dbo.tbl_MenuPaginaAsociada (Id_Menu, Pagina_Asociada, E_Eliminado, FechaRegistro, Id_Usuario)
SELECT m.Id,
       s.PaginaAsociada,
       0,
       GETDATE(),
       1
FROM @MenuPaginasSeed s
INNER JOIN dbo.tbl_tablamenu m
        ON LOWER(LTRIM(RTRIM(m.nombre))) = s.MenuNombre
       AND ISNULL(m.e_eliminado, 0) = 0
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.tbl_MenuPaginaAsociada mp
    WHERE mp.Id_Menu = m.Id
      AND LOWER(LTRIM(RTRIM(mp.Pagina_Asociada))) = LOWER(LTRIM(RTRIM(s.PaginaAsociada)))
);
GO

-- Seed inicial de nombres sidebar (idempotente).
UPDATE m
SET m.nombre_sidebar = CASE
    WHEN LOWER(LTRIM(RTRIM(m.nombre))) = 'tsm_listaagenda' THEN N'OT'
    WHEN LOWER(LTRIM(RTRIM(m.nombre))) = 'tsm_conformacioncuadrillas' THEN N'Cuadrillas'
    WHEN LOWER(LTRIM(RTRIM(m.nombre))) = 'tsm_privilegios' THEN N'Privilegios'
    ELSE m.nombre_sidebar
END
FROM dbo.tbl_tablamenu m
WHERE ISNULL(m.e_eliminado, 0) = 0
  AND (
      LOWER(LTRIM(RTRIM(m.nombre))) IN ('tsm_listaagenda', 'tsm_conformacioncuadrillas', 'tsm_privilegios')
  )
  AND (m.nombre_sidebar IS NULL OR LTRIM(RTRIM(m.nombre_sidebar)) = '');
GO

IF OBJECT_ID('dbo.spx_ObtenerPrivilegiosRoles', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerPrivilegiosRoles AS SELECT 1 AS placeholder;');
END
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROC dbo.spx_ObtenerPrivilegiosRoles
AS
BEGIN
    SET NOCOUNT ON;

    SELECT r.Id_Rol,
           r.Nombre AS Rol
    FROM dbo.tbl_Rol r
    WHERE ISNULL(r.E_Eliminado, 0) = 0
    ORDER BY r.Nombre;
END
GO

IF OBJECT_ID('dbo.spx_ObtenerPrivilegiosRolDetalle', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerPrivilegiosRolDetalle AS SELECT 1 AS placeholder;');
END
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROC dbo.spx_ObtenerPrivilegiosRolDetalle
    @IdRol INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdRol IS NULL
    BEGIN
        RAISERROR('IdRol es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Rol r
        WHERE r.Id_Rol = @IdRol
          AND ISNULL(r.E_Eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Rol no encontrado o inactivo.', 16, 1);
        RETURN;
    END

    SELECT m.Id AS Id_Menu,
           m.nombre AS Nombre,
           m.nombre_sidebar AS NombreSidebar,
           m.pagina_asociada AS PaginaAsociada,
           NULLIF(STUFF((
               SELECT ',' + mp.Pagina_Asociada
               FROM dbo.tbl_MenuPaginaAsociada mp
               WHERE mp.Id_Menu = m.Id
                 AND ISNULL(mp.E_Eliminado, 0) = 0
               ORDER BY mp.Pagina_Asociada
               FOR XML PATH(''), TYPE
           ).value('.', 'NVARCHAR(MAX)'), 1, 1, ''), '') AS PaginasAsociadasCsv,
           m.[orden] AS Nivel,
           m.padre AS Padre,
           CASE
               WHEN rm.Id_RolMenu IS NULL THEN CAST(0 AS bit)
               ELSE CAST(1 AS bit)
           END AS Asignado
    FROM dbo.tbl_tablamenu m
    LEFT JOIN dbo.tbl_RolMenu rm
           ON rm.Id_Menu = m.Id
          AND rm.Id_Rol = @IdRol
          AND ISNULL(rm.E_Eliminado, 0) = 0
    WHERE ISNULL(m.e_eliminado, 0) = 0
    ORDER BY m.padre, m.[orden], m.Id;
END
GO

IF OBJECT_ID('dbo.spx_GuardarPrivilegiosRol', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_GuardarPrivilegiosRol AS SELECT 1 AS placeholder;');
END
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROC dbo.spx_GuardarPrivilegiosRol
    @IdRol INT,
    @MenuIdsCsv NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @IdRol IS NULL
    BEGIN
        RAISERROR('IdRol es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Rol r
        WHERE r.Id_Rol = @IdRol
          AND ISNULL(r.E_Eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Rol no encontrado o inactivo.', 16, 1);
        RETURN;
    END

    DECLARE @MenuIds TABLE (
        Id_Menu INT NOT NULL PRIMARY KEY
    );

    SET @MenuIdsCsv = ISNULL(@MenuIdsCsv, '');
    SET @MenuIdsCsv = REPLACE(@MenuIdsCsv, ' ', '');

    IF LEN(LTRIM(RTRIM(@MenuIdsCsv))) > 0
    BEGIN
        DECLARE @xml XML;
        DECLARE @sanitized NVARCHAR(MAX);
        SET @sanitized = @MenuIdsCsv;

        WHILE CHARINDEX(',,', @sanitized) > 0
        BEGIN
            SET @sanitized = REPLACE(@sanitized, ',,', ',');
        END

        IF LEFT(@sanitized, 1) = ','
        BEGIN
            SET @sanitized = SUBSTRING(@sanitized, 2, LEN(@sanitized) - 1);
        END

        IF RIGHT(@sanitized, 1) = ','
        BEGIN
            SET @sanitized = LEFT(@sanitized, LEN(@sanitized) - 1);
        END

        IF LEN(@sanitized) > 0
        BEGIN
            SET @xml = CAST('<x>' + REPLACE(@sanitized, ',', '</x><x>') + '</x>' AS XML);

            INSERT INTO @MenuIds (Id_Menu)
            SELECT DISTINCT CAST(T.c.value('.', 'nvarchar(30)') AS INT)
            FROM @xml.nodes('/x') AS T(c)
            WHERE ISNUMERIC(T.c.value('.', 'nvarchar(30)')) = 1
              AND CAST(T.c.value('.', 'nvarchar(30)') AS INT) > 0;
        END
    END

    IF EXISTS (
        SELECT 1
        FROM @MenuIds i
        LEFT JOIN dbo.tbl_tablamenu m
               ON m.Id = i.Id_Menu
              AND ISNULL(m.e_eliminado, 0) = 0
        WHERE m.Id IS NULL
    )
    BEGIN
        RAISERROR('MenuIds contiene elementos inexistentes o inactivos.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.tbl_RolMenu
        SET E_Eliminado = 1
        WHERE Id_Rol = @IdRol
          AND ISNULL(E_Eliminado, 0) = 0;

        UPDATE rm
        SET rm.E_Eliminado = 0
        FROM dbo.tbl_RolMenu rm
        INNER JOIN @MenuIds i ON i.Id_Menu = rm.Id_Menu
        WHERE rm.Id_Rol = @IdRol;

        INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado)
        SELECT i.Id_Menu, @IdRol, 0
        FROM @MenuIds i
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_RolMenu rm
            WHERE rm.Id_Rol = @IdRol
              AND rm.Id_Menu = i.Id_Menu
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
        END
        DECLARE @ErrMsg NVARCHAR(4000);
        SET @ErrMsg = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
        RETURN;
    END CATCH

EXEC dbo.spx_ObtenerPrivilegiosRolDetalle @IdRol;
END
GO

IF OBJECT_ID('dbo.spx_GuardarPaginasPorMenu', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_GuardarPaginasPorMenu AS SELECT 1 AS placeholder;');
END
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROC dbo.spx_GuardarPaginasPorMenu
    @IdMenu INT,
    @PaginasCsv NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @IdMenu IS NULL OR @IdMenu <= 0
    BEGIN
        RAISERROR('IdMenu es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_tablamenu m
        WHERE m.Id = @IdMenu
          AND ISNULL(m.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Menu no encontrado o inactivo.', 16, 1);
        RETURN;
    END

    DECLARE @Paginas TABLE (
        Pagina_Asociada NVARCHAR(150) NOT NULL PRIMARY KEY
    );

    SET @PaginasCsv = ISNULL(@PaginasCsv, '');
    SET @PaginasCsv = REPLACE(REPLACE(@PaginasCsv, CHAR(13), ''), CHAR(10), '');

    IF LEN(LTRIM(RTRIM(@PaginasCsv))) > 0
    BEGIN
        DECLARE @xml XML;
        DECLARE @sanitized NVARCHAR(MAX);
        SET @sanitized = @PaginasCsv;

        WHILE CHARINDEX(',,', @sanitized) > 0
        BEGIN
            SET @sanitized = REPLACE(@sanitized, ',,', ',');
        END

        IF LEFT(@sanitized, 1) = ','
        BEGIN
            SET @sanitized = SUBSTRING(@sanitized, 2, LEN(@sanitized) - 1);
        END

        IF RIGHT(@sanitized, 1) = ','
        BEGIN
            SET @sanitized = LEFT(@sanitized, LEN(@sanitized) - 1);
        END

        IF LEN(@sanitized) > 0
        BEGIN
            SET @xml = CAST('<x>' + REPLACE(@sanitized, ',', '</x><x>') + '</x>' AS XML);

            INSERT INTO @Paginas (Pagina_Asociada)
            SELECT DISTINCT LEFT(LTRIM(RTRIM(T.c.value('.', 'nvarchar(300)'))), 150)
            FROM @xml.nodes('/x') AS T(c)
            WHERE LEN(LTRIM(RTRIM(T.c.value('.', 'nvarchar(300)')))) > 0;
        END
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.tbl_MenuPaginaAsociada
        SET E_Eliminado = 1
        WHERE Id_Menu = @IdMenu
          AND ISNULL(E_Eliminado, 0) = 0;

        UPDATE mp
        SET mp.E_Eliminado = 0
        FROM dbo.tbl_MenuPaginaAsociada mp
        INNER JOIN @Paginas p
                ON p.Pagina_Asociada = mp.Pagina_Asociada
        WHERE mp.Id_Menu = @IdMenu;

        INSERT INTO dbo.tbl_MenuPaginaAsociada (Id_Menu, Pagina_Asociada, E_Eliminado, FechaRegistro, Id_Usuario)
        SELECT @IdMenu, p.Pagina_Asociada, 0, GETDATE(), 1
        FROM @Paginas p
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_MenuPaginaAsociada mp
            WHERE mp.Id_Menu = @IdMenu
              AND mp.Pagina_Asociada = p.Pagina_Asociada
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
        END
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
        RETURN;
    END CATCH;

    SELECT m.Id AS Id_Menu,
           m.nombre AS Nombre,
           mp.Pagina_Asociada
    FROM dbo.tbl_tablamenu m
    LEFT JOIN dbo.tbl_MenuPaginaAsociada mp
           ON mp.Id_Menu = m.Id
          AND ISNULL(mp.E_Eliminado, 0) = 0
    WHERE m.Id = @IdMenu
      AND ISNULL(m.e_eliminado, 0) = 0
    ORDER BY mp.Pagina_Asociada;
END
GO
