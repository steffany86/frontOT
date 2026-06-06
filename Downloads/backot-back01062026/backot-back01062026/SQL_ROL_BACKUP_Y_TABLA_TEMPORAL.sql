USE [BDControlOrdenes];
GO

IF OBJECT_ID('dbo.backup_temporal', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.backup_temporal (
        id_backup_temporal INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        id_usuario INT NOT NULL,
        id_grupo INT NULL,
        id_rol_temporal INT NOT NULL,
        e_activo BIT NOT NULL CONSTRAINT DF_backup_temporal_e_activo DEFAULT (1),
        fecha_inicio DATETIME NOT NULL CONSTRAINT DF_backup_temporal_fecha_inicio DEFAULT (GETDATE()),
        fecha_fin DATETIME NULL,
        fecha_registro DATETIME NOT NULL CONSTRAINT DF_backup_temporal_fecha_registro DEFAULT (GETDATE()),
        fecha_actualizacion DATETIME NULL
    );
END
GO

IF COL_LENGTH('dbo.backup_temporal', 'id_grupo') IS NULL
BEGIN
    ALTER TABLE dbo.backup_temporal ADD id_grupo INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.backup_temporal')
      AND name = 'IX_backup_temporal_usuario_activo'
)
BEGIN
    CREATE INDEX IX_backup_temporal_usuario_activo
        ON dbo.backup_temporal (id_usuario, e_activo, fecha_fin);
END
GO

DECLARE @IdRolBackup INT;
SELECT TOP 1 @IdRolBackup = r.Id_Rol
FROM dbo.tbl_Rol r
WHERE LOWER(LTRIM(RTRIM(r.Nombre))) = 'backup'
  AND ISNULL(r.E_Eliminado, 0) = 0;

IF @IdRolBackup IS NULL
BEGIN
    INSERT INTO dbo.tbl_Rol (Nombre, E_Eliminado)
    VALUES ('Backup', 0);

    SELECT TOP 1 @IdRolBackup = r.Id_Rol
    FROM dbo.tbl_Rol r
    WHERE LOWER(LTRIM(RTRIM(r.Nombre))) = 'backup'
      AND ISNULL(r.E_Eliminado, 0) = 0
    ORDER BY r.Id_Rol DESC;
END
GO

DECLARE @IdRolSupervisor INT;
DECLARE @IdRolBackup INT;
SELECT TOP 1 @IdRolSupervisor = r.Id_Rol
FROM dbo.tbl_Rol r
WHERE LOWER(LTRIM(RTRIM(r.Nombre))) LIKE '%supervisor%'
  AND ISNULL(r.E_Eliminado, 0) = 0
ORDER BY r.Id_Rol;

SELECT TOP 1 @IdRolBackup = r.Id_Rol
FROM dbo.tbl_Rol r
WHERE LOWER(LTRIM(RTRIM(r.Nombre))) = 'backup'
  AND ISNULL(r.E_Eliminado, 0) = 0
ORDER BY r.Id_Rol DESC;

IF @IdRolSupervisor IS NOT NULL AND @IdRolBackup IS NOT NULL
BEGIN
    INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado)
    SELECT rm.Id_Menu, @IdRolBackup, 0
    FROM dbo.tbl_RolMenu rm
    WHERE rm.Id_Rol = @IdRolSupervisor
      AND ISNULL(rm.E_Eliminado, 0) = 0
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.tbl_RolMenu x
          WHERE x.Id_Rol = @IdRolBackup
            AND x.Id_Menu = rm.Id_Menu
      );

    UPDATE rb
    SET rb.E_Eliminado = 0
    FROM dbo.tbl_RolMenu rb
    INNER JOIN dbo.tbl_RolMenu rs
            ON rs.Id_Menu = rb.Id_Menu
           AND rs.Id_Rol = @IdRolSupervisor
           AND ISNULL(rs.E_Eliminado, 0) = 0
    WHERE rb.Id_Rol = @IdRolBackup;
END
GO
