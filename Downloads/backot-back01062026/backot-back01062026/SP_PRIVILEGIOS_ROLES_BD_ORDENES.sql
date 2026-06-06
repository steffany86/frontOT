-- Asignacion de privilegios minima por rol en BDControlOrdenes
-- Supervisor: tsm_ConformacionCuadrillas + tsm_ListaAgenda
-- Sistemas:  tsm_ConformacionCuadrillas + tsm_ListaAgenda + tsm_privilegios

SET NOCOUNT ON;
USE BDControlOrdenes;
GO

DECLARE @IdRolSupervisor INT;
DECLARE @IdRolSistemas INT;
DECLARE @IdMenuConformacion INT;
DECLARE @IdMenuAgenda INT;
DECLARE @IdMenuPrivilegios INT;

SELECT TOP 1 @IdRolSupervisor = r.Id_Rol
FROM dbo.tbl_Rol r
WHERE ISNULL(r.E_Eliminado, 0) = 0
  AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'supervisor';

SELECT TOP 1 @IdRolSistemas = r.Id_Rol
FROM dbo.tbl_Rol r
WHERE ISNULL(r.E_Eliminado, 0) = 0
  AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'sistemas';

IF @IdRolSupervisor IS NULL
BEGIN
    RAISERROR('No se encontro el rol Supervisor en tbl_Rol.', 16, 1);
    RETURN;
END

IF @IdRolSistemas IS NULL
BEGIN
    RAISERROR('No se encontro el rol Sistemas en tbl_Rol.', 16, 1);
    RETURN;
END

SELECT TOP 1 @IdMenuConformacion = m.Id
FROM dbo.tbl_tablamenu m
WHERE ISNULL(m.e_eliminado, 0) = 0
  AND LOWER(LTRIM(RTRIM(m.nombre))) = 'tsm_conformacioncuadrillas';

SELECT TOP 1 @IdMenuAgenda = m.Id
FROM dbo.tbl_tablamenu m
WHERE ISNULL(m.e_eliminado, 0) = 0
  AND LOWER(LTRIM(RTRIM(m.nombre))) = 'tsm_listaagenda';

SELECT TOP 1 @IdMenuPrivilegios = m.Id
FROM dbo.tbl_tablamenu m
WHERE ISNULL(m.e_eliminado, 0) = 0
  AND LOWER(LTRIM(RTRIM(m.nombre))) = 'tsm_privilegios';

IF @IdMenuConformacion IS NULL OR @IdMenuAgenda IS NULL OR @IdMenuPrivilegios IS NULL
BEGIN
    RAISERROR('Falta uno o mas menus requeridos: tsm_ConformacionCuadrillas, tsm_ListaAgenda, tsm_privilegios.', 16, 1);
    RETURN;
END

DECLARE @Permisos TABLE (
    Id_Rol INT NOT NULL,
    Id_Menu INT NOT NULL,
    PRIMARY KEY (Id_Rol, Id_Menu)
);

-- Supervisor: 2 menus
INSERT INTO @Permisos (Id_Rol, Id_Menu)
VALUES
    (@IdRolSupervisor, @IdMenuConformacion),
    (@IdRolSupervisor, @IdMenuAgenda);

-- Sistemas: los 2 menus + privilegios
INSERT INTO @Permisos (Id_Rol, Id_Menu)
VALUES
    (@IdRolSistemas, @IdMenuConformacion),
    (@IdRolSistemas, @IdMenuAgenda),
    (@IdRolSistemas, @IdMenuPrivilegios);

DECLARE @RolesAfectados TABLE (
    Id_Rol INT NOT NULL PRIMARY KEY
);

INSERT INTO @RolesAfectados (Id_Rol)
SELECT DISTINCT p.Id_Rol
FROM @Permisos p;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE rm
    SET rm.E_Eliminado = 1
    FROM dbo.tbl_RolMenu rm
    INNER JOIN @RolesAfectados ra ON ra.Id_Rol = rm.Id_Rol
    WHERE ISNULL(rm.E_Eliminado, 0) = 0;

    UPDATE rm
    SET rm.E_Eliminado = 0
    FROM dbo.tbl_RolMenu rm
    INNER JOIN @Permisos p
            ON p.Id_Rol = rm.Id_Rol
           AND p.Id_Menu = rm.Id_Menu;

    INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado)
    SELECT p.Id_Menu, p.Id_Rol, 0
    FROM @Permisos p
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_RolMenu rm
        WHERE rm.Id_Rol = p.Id_Rol
          AND rm.Id_Menu = p.Id_Menu
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

SELECT r.Id_Rol,
       r.Nombre AS Rol,
       m.Id AS Id_Menu,
       m.nombre AS Menu,
       ISNULL(rm.E_Eliminado, 0) AS E_Eliminado
FROM dbo.tbl_RolMenu rm
INNER JOIN dbo.tbl_Rol r
        ON r.Id_Rol = rm.Id_Rol
INNER JOIN dbo.tbl_tablamenu m
        ON m.Id = rm.Id_Menu
WHERE rm.Id_Rol IN (@IdRolSupervisor, @IdRolSistemas)
ORDER BY r.Nombre, m.Id;
