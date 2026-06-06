SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

USE [BDControlOrdenes]
GO

DECLARE @IdUsuario INT = 1;
DECLARE @MenuRaizId INT;
DECLARE @MenuDetalleId INT;

SELECT TOP 1 @MenuRaizId = Id
FROM dbo.tbl_tablamenu
WHERE LOWER(LTRIM(RTRIM(nombre))) = 'tsm_supervision';

IF @MenuRaizId IS NULL
BEGIN
    INSERT INTO dbo.tbl_tablamenu (
        nombre,
        orden,
        padre,
        e_eliminado,
        fecharegistro,
        id_Usuario,
        pagina_asociada,
        nombre_sidebar,
        Direccion
    )
    VALUES (
        'tsm_supervision',
        3,
        NULL,
        0,
        GETDATE(),
        @IdUsuario,
        'SupervisionPage',
        'Supervision',
        '/supervisor/supervision'
    );

    SET @MenuRaizId = SCOPE_IDENTITY();

    UPDATE dbo.tbl_tablamenu
    SET padre = @MenuRaizId
    WHERE Id = @MenuRaizId;
END
ELSE
BEGIN
    UPDATE dbo.tbl_tablamenu
    SET orden = 3,
        padre = @MenuRaizId,
        e_eliminado = 0,
        pagina_asociada = 'SupervisionPage',
        nombre_sidebar = 'Supervision',
        Direccion = '/supervisor/supervision'
    WHERE Id = @MenuRaizId;
END

SELECT TOP 1 @MenuDetalleId = Id
FROM dbo.tbl_tablamenu
WHERE LOWER(LTRIM(RTRIM(nombre))) = 'tsm_supervision_supervisor';

IF @MenuDetalleId IS NULL
BEGIN
    INSERT INTO dbo.tbl_tablamenu (
        nombre,
        orden,
        padre,
        e_eliminado,
        fecharegistro,
        id_Usuario,
        pagina_asociada,
        nombre_sidebar,
        Direccion
    )
    VALUES (
        'tsm_supervision_supervisor',
        1,
        @MenuRaizId,
        0,
        GETDATE(),
        @IdUsuario,
        'SupervisorSupervisionPage',
        NULL,
        '/supervisor/supervision'
    );

    SET @MenuDetalleId = SCOPE_IDENTITY();
END
ELSE
BEGIN
    UPDATE dbo.tbl_tablamenu
    SET orden = 1,
        padre = @MenuRaizId,
        e_eliminado = 0,
        pagina_asociada = 'SupervisorSupervisionPage',
        Direccion = '/supervisor/supervision'
    WHERE Id = @MenuDetalleId;
END

IF EXISTS (SELECT 1 FROM dbo.tbl_MenuPaginaAsociada WHERE Id_Menu = @MenuDetalleId AND Pagina_Asociada = 'SupervisorSupervisionPage')
BEGIN
    UPDATE dbo.tbl_MenuPaginaAsociada
    SET E_Eliminado = 0,
        FechaRegistro = ISNULL(FechaRegistro, GETDATE()),
        Id_Usuario = ISNULL(Id_Usuario, @IdUsuario)
    WHERE Id_Menu = @MenuDetalleId
      AND Pagina_Asociada = 'SupervisorSupervisionPage';
END
ELSE
BEGIN
    INSERT INTO dbo.tbl_MenuPaginaAsociada (Id_Menu, Pagina_Asociada, E_Eliminado, FechaRegistro, Id_Usuario)
    VALUES (@MenuDetalleId, 'SupervisorSupervisionPage', 0, GETDATE(), @IdUsuario);
END

IF EXISTS (SELECT 1 FROM dbo.tbl_RolMenu WHERE Id_Rol = 9 AND Id_Menu = @MenuRaizId)
BEGIN
    UPDATE dbo.tbl_RolMenu SET E_Eliminado = 0 WHERE Id_Rol = 9 AND Id_Menu = @MenuRaizId;
END
ELSE
BEGIN
    INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado) VALUES (@MenuRaizId, 9, 0);
END

IF EXISTS (SELECT 1 FROM dbo.tbl_RolMenu WHERE Id_Rol = 9 AND Id_Menu = @MenuDetalleId)
BEGIN
    UPDATE dbo.tbl_RolMenu SET E_Eliminado = 0 WHERE Id_Rol = 9 AND Id_Menu = @MenuDetalleId;
END
ELSE
BEGIN
    INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado) VALUES (@MenuDetalleId, 9, 0);
END

SELECT tm.Id, tm.nombre, tm.padre, tm.pagina_asociada, tm.nombre_sidebar, tm.Direccion, tm.e_eliminado
FROM dbo.tbl_tablamenu tm
WHERE tm.Id IN (@MenuRaizId, @MenuDetalleId)
ORDER BY tm.Id;
GO
