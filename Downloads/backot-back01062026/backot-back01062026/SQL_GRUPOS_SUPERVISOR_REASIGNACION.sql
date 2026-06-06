SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID('dbo.spx_Grupo_ObtenerSupervisorActualDesdeCuadrillas', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE dbo.spx_Grupo_ObtenerSupervisorActualDesdeCuadrillas @IdGrupo INT AS BEGIN SET NOCOUNT ON; SELECT 0 AS idGrupo, 0 AS idUsuarioSupervisor, '''' AS supervisor; END');
END
GO

ALTER PROCEDURE dbo.spx_Grupo_ObtenerSupervisorActualDesdeCuadrillas
    @IdGrupo INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        g.id_grupo AS idGrupo,
        CAST(ISNULL(ccd.id_supervisor, 0) AS INT) AS idUsuarioSupervisor,
        ISNULL(v.nombres, '') AS supervisor
    FROM dbo.tbl_Grupo g
    LEFT JOIN dbo.tbl_ConformacionCuadrillaDiario ccd
        ON ccd.id_grupo = g.id_grupo
       AND ISNULL(ccd.e_eliminado, 0) = 0
    LEFT JOIN dbo.tbl_Vendedor v
        ON v.idvendedor = ccd.id_supervisor
    WHERE g.id_grupo = @IdGrupo
      AND ISNULL(g.e_eliminado, 0) = 0
    ORDER BY ccd.id_conformacion_cuadrilla_diario DESC;
END
GO

IF OBJECT_ID('dbo.spx_Grupo_AsignarSupervisorDesdeCuadrillas', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE dbo.spx_Grupo_AsignarSupervisorDesdeCuadrillas @IdUsuarioEjecutor INT, @IdGrupo INT, @IdUsuarioSupervisor INT, @ConfirmarCambio BIT AS BEGIN SET NOCOUNT ON; SELECT 1 AS ok; END');
END
GO

ALTER PROCEDURE dbo.spx_Grupo_AsignarSupervisorDesdeCuadrillas
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioSupervisor INT,
    @ConfirmarCambio BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdSupervisorActual INT = NULL;
    DECLARE @NombreSupervisorActual NVARCHAR(200) = NULL;

    SELECT TOP 1
        @IdSupervisorActual = CAST(ISNULL(ccd.id_supervisor, 0) AS INT),
        @NombreSupervisorActual = ISNULL(v.nombres, '')
    FROM dbo.tbl_ConformacionCuadrillaDiario ccd
    LEFT JOIN dbo.tbl_Vendedor v ON v.idvendedor = ccd.id_supervisor
    WHERE ccd.id_grupo = @IdGrupo
      AND ISNULL(ccd.e_eliminado, 0) = 0
    ORDER BY ccd.id_conformacion_cuadrilla_diario DESC;

    IF ISNULL(@ConfirmarCambio, 0) = 0
       AND ISNULL(@IdSupervisorActual, 0) > 0
       AND @IdSupervisorActual <> @IdUsuarioSupervisor
    BEGIN
        SELECT
            CAST(0 AS BIT) AS actualizado,
            CAST(1 AS BIT) AS requiereConfirmacion,
            @IdGrupo AS idGrupo,
            @IdSupervisorActual AS idUsuarioSupervisorActual,
            ISNULL(@NombreSupervisorActual, '') AS supervisorActual,
            @IdUsuarioSupervisor AS idUsuarioSupervisorNuevo;
        RETURN;
    END

    UPDATE dbo.tbl_ConformacionCuadrillaDiario
    SET id_supervisor = @IdUsuarioSupervisor
    WHERE id_grupo = @IdGrupo
      AND ISNULL(e_eliminado, 0) = 0;

    SELECT
        CAST(1 AS BIT) AS actualizado,
        CAST(0 AS BIT) AS requiereConfirmacion,
        @IdGrupo AS idGrupo,
        @IdUsuarioSupervisor AS idUsuarioSupervisor;
END
GO
