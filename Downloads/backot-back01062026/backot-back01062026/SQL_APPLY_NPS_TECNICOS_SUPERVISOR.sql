IF OBJECT_ID('dbo.SP_NPS_LISTAR_TECNICOS_POR_SUPERVISOR', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_NPS_LISTAR_TECNICOS_POR_SUPERVISOR AS BEGIN SET NOCOUNT ON; SELECT 1 AS stub; END');
GO

ALTER PROCEDURE dbo.SP_NPS_LISTAR_TECNICOS_POR_SUPERVISOR
    @IdSucursal INT,
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH base AS (
        SELECT
            cc.id_tecnico AS idTecnico,
            cc.tecnico AS tecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario cc
        WHERE ISNULL(cc.e_eliminado, 0) = 0
          AND CONVERT(date, cc.fecha) = CONVERT(date, GETDATE())
          AND (@IdSupervisor = 0 OR cc.idUsuarioSupervisor = @IdSupervisor)

        UNION

        SELECT
            cc.id_tecnicoAuxiliar AS idTecnico,
            cc.auxiliar AS tecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario cc
        WHERE ISNULL(cc.e_eliminado, 0) = 0
          AND CONVERT(date, cc.fecha) = CONVERT(date, GETDATE())
          AND (@IdSupervisor = 0 OR cc.idUsuarioSupervisor = @IdSupervisor)
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
     AND ISNULL(v.E_Eliminado, 0) = 0
    WHERE b.idTecnico IS NOT NULL
      AND b.idTecnico > 0
    ORDER BY tecnico;
END
GO
