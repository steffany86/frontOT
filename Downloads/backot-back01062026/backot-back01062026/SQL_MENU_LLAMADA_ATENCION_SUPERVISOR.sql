SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

USE [BDControlOrdenes]
GO

DECLARE @IdUsuario INT = 1;
DECLARE @MenuRaizId INT = 6;
DECLARE @MenuDetalleId INT;

IF EXISTS (SELECT 1 FROM dbo.tbl_tablamenu WHERE Id = @MenuRaizId)
BEGIN
    UPDATE dbo.tbl_tablamenu
    SET nombre = 'tsm_LlamadaAtencion',
        orden = 2,
        padre = @MenuRaizId,
        e_eliminado = 0,
        fecharegistro = ISNULL(fecharegistro, GETDATE()),
        id_Usuario = ISNULL(id_Usuario, @IdUsuario),
        pagina_asociada = 'LlamadaAtencionPrincipal',
        nombre_sidebar = 'Llamada de Atencion',
        Direccion = '/supervisor/llamada-atencion'
    WHERE Id = @MenuRaizId;
END
ELSE
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
        'tsm_LlamadaAtencion',
        2,
        NULL,
        0,
        GETDATE(),
        @IdUsuario,
        'LlamadaAtencionPrincipal',
        'Llamada de Atencion',
        '/supervisor/llamada-atencion'
    );

    SET @MenuRaizId = SCOPE_IDENTITY();

    UPDATE dbo.tbl_tablamenu
    SET padre = @MenuRaizId
    WHERE Id = @MenuRaizId;
END

SELECT @MenuDetalleId = Id
FROM dbo.tbl_tablamenu
WHERE nombre = 'tsm_LlamadaAtencion_Supervisor';

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
        'tsm_LlamadaAtencion_Supervisor',
        1,
        @MenuRaizId,
        0,
        GETDATE(),
        @IdUsuario,
        'LlamadaAtencionPage',
        NULL,
        '/supervisor/llamada-atencion'
    );

    SET @MenuDetalleId = SCOPE_IDENTITY();
END
ELSE
BEGIN
    UPDATE dbo.tbl_tablamenu
    SET orden = 1,
        padre = @MenuRaizId,
        e_eliminado = 0,
        pagina_asociada = 'LlamadaAtencionPage',
        Direccion = '/supervisor/llamada-atencion'
    WHERE Id = @MenuDetalleId;
END

IF EXISTS (SELECT 1 FROM dbo.tbl_MenuPaginaAsociada WHERE Id_Menu = @MenuDetalleId AND Pagina_Asociada = 'LlamadaAtencionPage')
BEGIN
    UPDATE dbo.tbl_MenuPaginaAsociada
    SET E_Eliminado = 0,
        FechaRegistro = ISNULL(FechaRegistro, GETDATE()),
        Id_Usuario = ISNULL(Id_Usuario, @IdUsuario)
    WHERE Id_Menu = @MenuDetalleId
      AND Pagina_Asociada = 'LlamadaAtencionPage';
END
ELSE
BEGIN
    INSERT INTO dbo.tbl_MenuPaginaAsociada (Id_Menu, Pagina_Asociada, E_Eliminado, FechaRegistro, Id_Usuario)
    VALUES (@MenuDetalleId, 'LlamadaAtencionPage', 0, GETDATE(), @IdUsuario);
END

IF EXISTS (SELECT 1 FROM dbo.tbl_RolMenu WHERE Id_Rol = 9 AND Id_Menu = @MenuRaizId)
BEGIN
    UPDATE dbo.tbl_RolMenu
    SET E_Eliminado = 0
    WHERE Id_Rol = 9 AND Id_Menu = @MenuRaizId;
END
ELSE
BEGIN
    INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado)
    VALUES (@MenuRaizId, 9, 0);
END

IF EXISTS (SELECT 1 FROM dbo.tbl_RolMenu WHERE Id_Rol = 9 AND Id_Menu = @MenuDetalleId)
BEGIN
    UPDATE dbo.tbl_RolMenu
    SET E_Eliminado = 0
    WHERE Id_Rol = 9 AND Id_Menu = @MenuDetalleId;
END
ELSE
BEGIN
    INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado)
    VALUES (@MenuDetalleId, 9, 0);
END

SELECT
    tm.Id,
    tm.nombre,
    tm.padre,
    tm.pagina_asociada,
    tm.nombre_sidebar,
    tm.Direccion,
    tm.e_eliminado
FROM dbo.tbl_tablamenu tm
WHERE tm.Id IN (@MenuRaizId, @MenuDetalleId)
ORDER BY tm.Id;

SELECT
    rm.Id_RolMenu,
    rm.Id_Rol,
    rm.Id_Menu,
    rm.E_Eliminado
FROM dbo.tbl_RolMenu rm
WHERE rm.Id_Rol = 9
  AND rm.Id_Menu IN (@MenuRaizId, @MenuDetalleId)
ORDER BY rm.Id_Menu;
