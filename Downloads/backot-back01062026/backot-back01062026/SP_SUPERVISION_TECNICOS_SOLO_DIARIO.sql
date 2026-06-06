IF OBJECT_ID(N'dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla', N'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla;
GO
CREATE PROCEDURE dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdSupervisor IS NULL OR @IdSupervisor <= 0
    BEGIN
        SELECT CAST(NULL AS INT) AS idTecnico, CAST(NULL AS NVARCHAR(200)) AS tecnico
        WHERE 1 = 0;
        RETURN;
    END;

    IF OBJECT_ID(N'dbo.tbl_ConformacionCuadrillaDiario', N'U') IS NULL
    BEGIN
        SELECT CAST(NULL AS INT) AS idTecnico, CAST(NULL AS NVARCHAR(200)) AS tecnico
        WHERE 1 = 0;
        RETURN;
    END;

    ;WITH base AS (
        SELECT idUsuarioSupervisor AS idSupervisor, id_tecnico AS idTecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario
        WHERE ISNULL(e_eliminado,0)=0
          AND CONVERT(date, fecha)=CONVERT(date, GETDATE())

        UNION ALL

        SELECT idUsuarioSupervisor AS idSupervisor, id_tecnicoAuxiliar AS idTecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario
        WHERE ISNULL(e_eliminado,0)=0
          AND CONVERT(date, fecha)=CONVERT(date, GETDATE())
    ),
    filtrada AS (
        SELECT DISTINCT idTecnico
        FROM base
        WHERE idSupervisor = @IdSupervisor
          AND idTecnico IS NOT NULL
          AND idTecnico > 0
    )
    SELECT f.idTecnico,
           COALESCE(
               NULLIF(LTRIM(RTRIM(vd.Nombre)), ''),
               NULLIF(LTRIM(RTRIM(vu.Nombre)), ''),
               NULLIF(LTRIM(RTRIM(u.Nombre)), ''),
               'Tecnico ' + CONVERT(NVARCHAR(20), f.idTecnico)
           ) AS tecnico
    FROM filtrada f
    LEFT JOIN dbo.tbl_Vendedor vd
      ON vd.Id_Vendedor = f.idTecnico
     AND ISNULL(vd.E_Eliminado,0)=0
    LEFT JOIN dbo.tbl_UsuarioTecnico ut
      ON ut.id_Usuario = f.idTecnico
     AND ISNULL(ut.e_eliminado,0)=0
    LEFT JOIN dbo.tbl_Vendedor vu
      ON vu.Id_Vendedor = ut.id_Vendedor
     AND ISNULL(vu.E_Eliminado,0)=0
    LEFT JOIN dbo.tbl_Usuario u
      ON u.Id_Usuario = f.idTecnico
     AND ISNULL(u.E_Eliminado,0)=0
    ORDER BY tecnico, f.idTecnico;
END
GO
