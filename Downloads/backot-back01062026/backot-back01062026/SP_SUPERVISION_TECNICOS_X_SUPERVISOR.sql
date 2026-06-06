SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/*
  SP: spx_ListarTecnicosSupervisorConformacionCuadrilla
  Regla:
    - El supervisor logueado envia su Id_Usuario como @IdSupervisor.
    - Se buscan las filas de hoy en BD Ordenes.dbo.tbl_ConformacionCuadrillaDiario
      donde idUsuarioSupervisor = @IdSupervisor (id encargado en esta BD).
    - Se devuelven tecnico principal y auxiliar de esas filas.
*/
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

    ;WITH base AS (
        SELECT
            id_tecnico AS idTecnico,
            tecnico AS tecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario
        WHERE ISNULL(e_eliminado,0)=0
          AND CONVERT(date, fecha)=CONVERT(date, GETDATE())
          AND idUsuarioSupervisor = @IdSupervisor

        UNION

        SELECT
            id_tecnicoAuxiliar AS idTecnico,
            auxiliar AS tecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario
        WHERE ISNULL(e_eliminado,0)=0
          AND CONVERT(date, fecha)=CONVERT(date, GETDATE())
          AND idUsuarioSupervisor = @IdSupervisor
    )
    SELECT DISTINCT
           b.idTecnico,
           COALESCE(
               NULLIF(LTRIM(RTRIM(v.Nombre)), ''),
               NULLIF(LTRIM(RTRIM(b.tecnico)), ''),
               'Tecnico ' + CONVERT(NVARCHAR(20), b.idTecnico)
           ) AS tecnico
    FROM base b
    LEFT JOIN dbo.tbl_Vendedor v
      ON v.Id_Vendedor = b.idTecnico
     AND ISNULL(v.E_Eliminado,0)=0
    WHERE b.idTecnico IS NOT NULL
      AND b.idTecnico > 0
    ORDER BY tecnico, b.idTecnico;
END
GO
