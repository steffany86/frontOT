IF DB_ID('BDControlOrdenes') IS NULL
BEGIN
    RAISERROR('BDControlOrdenes no existe en este servidor.', 16, 1);
    RETURN;
END
GO
USE BDControlOrdenes
GO

DECLARE @now DATETIME = GETDATE();
DECLARE @idPadre INT;
DECLARE @idHijo INT;

SELECT TOP 1 @idPadre = Id
FROM dbo.tbl_tablamenu
WHERE ISNULL(e_eliminado,0)=0
  AND LOWER(LTRIM(RTRIM(nombre))) IN ('tsm_supervision','supervision','tsm_supervisor_supervision')
ORDER BY Id;

IF @idPadre IS NULL
BEGIN
    INSERT INTO dbo.tbl_tablamenu (nombre, nombre_sidebar, pagina_asociada, [orden], padre, e_eliminado, fecharegistro, id_usuario)
    VALUES (N'tsm_supervision', N'Supervision', N'SupervisorSupervisionPage', 80, 1, 0, @now, 1);
    SET @idPadre = SCOPE_IDENTITY();
END

SELECT TOP 1 @idHijo = Id
FROM dbo.tbl_tablamenu
WHERE ISNULL(e_eliminado,0)=0
  AND LOWER(LTRIM(RTRIM(nombre))) = 'tsm_supervision_lista_inicio'
ORDER BY Id;

IF @idHijo IS NULL
BEGIN
    INSERT INTO dbo.tbl_tablamenu (nombre, nombre_sidebar, pagina_asociada, [orden], padre, e_eliminado, fecharegistro, id_usuario)
    VALUES (N'tsm_supervision_lista_inicio', N'Lista inicio', N'SupervisorInicioJornadaPendientesPage', 1, @idPadre, 0, @now, 1);
    SET @idHijo = SCOPE_IDENTITY();
END
ELSE
BEGIN
    UPDATE dbo.tbl_tablamenu
    SET padre = @idPadre,
        nombre_sidebar = ISNULL(NULLIF(nombre_sidebar,''), N'Lista inicio'),
        pagina_asociada = ISNULL(NULLIF(pagina_asociada,''), N'SupervisorInicioJornadaPendientesPage'),
        e_eliminado = 0
    WHERE Id = @idHijo;
END

IF OBJECT_ID('dbo.tbl_MenuPaginaAsociada', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM dbo.tbl_MenuPaginaAsociada
        WHERE Id_Menu = @idHijo
          AND LOWER(LTRIM(RTRIM(Pagina_Asociada))) = LOWER(N'SupervisorInicioJornadaPendientesPage')
          AND ISNULL(E_Eliminado,0)=0
    )
    BEGIN
        INSERT INTO dbo.tbl_MenuPaginaAsociada (Id_Menu, Pagina_Asociada, E_Eliminado, FechaRegistro, Id_Usuario)
        VALUES (@idHijo, N'SupervisorInicioJornadaPendientesPage', 0, @now, 1);
    END
END

-- Asignar por defecto a Supervisor (9) y Central (10) si existen
IF OBJECT_ID('dbo.tbl_RolMenu', 'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_Rol WHERE Id_Rol = 9 AND ISNULL(E_Eliminado,0)=0)
       AND NOT EXISTS (SELECT 1 FROM dbo.tbl_RolMenu WHERE Id_Rol=9 AND Id_Menu=@idHijo AND ISNULL(E_Eliminado,0)=0)
    BEGIN
        INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado) VALUES (@idHijo, 9, 0);
    END

    IF EXISTS (SELECT 1 FROM dbo.tbl_Rol WHERE Id_Rol = 10 AND ISNULL(E_Eliminado,0)=0)
       AND NOT EXISTS (SELECT 1 FROM dbo.tbl_RolMenu WHERE Id_Rol=10 AND Id_Menu=@idHijo AND ISNULL(E_Eliminado,0)=0)
    BEGIN
        INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado) VALUES (@idHijo, 10, 0);
    END
END

SELECT @idPadre AS id_menu_supervision, @idHijo AS id_menu_supervision_lista_inicio;
GO
