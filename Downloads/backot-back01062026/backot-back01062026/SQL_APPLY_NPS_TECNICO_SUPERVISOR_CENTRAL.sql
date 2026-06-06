IF OBJECT_ID('dbo.SP_NPS_LISTAR_TECNICOS_SUPERVISOR_CENTRAL', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_NPS_LISTAR_TECNICOS_SUPERVISOR_CENTRAL AS BEGIN SET NOCOUNT ON; SELECT 1 AS stub; END');
GO

ALTER PROCEDURE dbo.SP_NPS_LISTAR_TECNICOS_SUPERVISOR_CENTRAL
    @IdTecnico INT,
    @IdSucursal INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        cc.idUsuarioSupervisor AS idSupervisor,
        CASE
            WHEN cc.id_tecnico = @IdTecnico THEN cc.id_tecnico
            ELSE cc.id_tecnicoAuxiliar
        END AS idTecnico
    FROM dbo.tbl_ConformacionCuadrillaDiario cc
    WHERE (cc.id_tecnico = @IdTecnico OR cc.id_tecnicoAuxiliar = @IdTecnico)
      AND ISNULL(cc.e_eliminado, 0) = 0
    ORDER BY
      CASE WHEN CONVERT(date, cc.fecha) = CONVERT(date, GETDATE()) THEN 0 ELSE 1 END,
      cc.fecha DESC,
      cc.id DESC;
END
GO
