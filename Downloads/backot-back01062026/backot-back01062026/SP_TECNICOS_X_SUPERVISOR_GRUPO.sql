USE [BDSistemaAntenaUTecnico];
GO

IF OBJECT_ID('dbo.tecnicos_x_supervisor_grupo', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE dbo.tecnicos_x_supervisor_grupo AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE dbo.tecnicos_x_supervisor_grupo
    @id_usuario_supervisor INT,
    @id_grupo INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @id_usuario_supervisor IS NULL OR @id_usuario_supervisor <= 0
    BEGIN
        RAISERROR('id_usuario_supervisor es requerido.', 16, 1);
        RETURN;
    END

    IF OBJECT_ID('dbo.tbl_Vendedor', 'U') IS NULL
       OR OBJECT_ID('dbo.tbl_UsuarioTecnico', 'U') IS NULL
    BEGIN
        RAISERROR('No se encontraron tablas requeridas (tbl_Vendedor/tbl_UsuarioTecnico).', 16, 1);
        RETURN;
    END

    SELECT
        g.id_grupo,
        g.nombre AS grupo,
        gs.id_usuario AS id_usuario_supervisor,
        dg.id_usuario_tecnico,
        v.Id_Vendedor AS id_tecnico,
        LTRIM(RTRIM(v.Nombre)) AS tecnico,
        dg.fecha_registro
    FROM dbo.tbl_GrupoSup gs
    INNER JOIN dbo.tbl_Grupo g
        ON g.id_grupo = gs.id_grupo
    INNER JOIN dbo.tbl_DetalleGrupo dg
        ON dg.id_grupo = gs.id_grupo
    INNER JOIN dbo.tbl_UsuarioTecnico ut
        ON ut.id = dg.id_usuario_tecnico
    INNER JOIN dbo.tbl_Vendedor v
        ON v.Id_Vendedor = ut.id_Vendedor
    WHERE gs.id_usuario = @id_usuario_supervisor
      AND ISNULL(g.e_eliminado, 0) = 0
      AND ISNULL(ut.e_eliminado, 0) = 0
      AND ISNULL(v.E_Eliminado, 0) = 0
      AND (@id_grupo IS NULL OR g.id_grupo = @id_grupo)
    ORDER BY g.nombre, v.Nombre;
END
GO
