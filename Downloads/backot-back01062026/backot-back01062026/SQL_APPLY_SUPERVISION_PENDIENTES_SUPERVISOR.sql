IF OBJECT_ID(N'dbo.spx_ListarSupervisionPendiente', N'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_ListarSupervisionPendiente;
GO

CREATE PROCEDURE dbo.spx_ListarSupervisionPendiente
    @IdSupervisor NVARCHAR(50),
    @FechaDesde DATE = NULL,
    @FechaHasta DATE = NULL,
    @Limite INT = 200
AS
BEGIN
    SET NOCOUNT ON;

    IF @Limite IS NULL OR @Limite <= 0 SET @Limite = 200;

    SELECT TOP (@Limite)
        s.Id_Supervision AS idSupervision,
        s.FechaRegistro AS fechaRegistro,
        s.Id_Supervisor AS idSupervisor,
        CAST(NULL AS NVARCHAR(200)) AS supervisor,
        s.Id_TecnicoPrincipal AS idTecnicoPrincipal,
        CAST(NULL AS NVARCHAR(200)) AS tecnicoPrincipal,
        s.Id_TecnicoAuxiliar AS idTecnicoAuxiliar,
        CAST(NULL AS NVARCHAR(200)) AS tecnicoAuxiliar,
        s.Id_TipoSupervision AS idTipoSupervision,
        CAST(NULL AS NVARCHAR(200)) AS tipoSupervision,
        s.Id_TipoTrabajo AS idTipoTrabajo,
        CAST(NULL AS NVARCHAR(200)) AS tipoTrabajo,
        s.Id_TipoPenalizacion AS idTipoPenalizacion,
        CAST(NULL AS NVARCHAR(200)) AS tipoPenalizacion,
        s.Supervision_Por AS supervisionPor,
        s.Tecnologia AS tecnologia,
        s.Codigo AS codigo,
        s.OrdenTrabajo AS ordenTrabajo,
        LTRIM(RTRIM(s.TipoRevision)) AS tipoRevision,
        s.Observacion AS observacion,
        s.DescripcionAdicionalObservacion AS descripcionAdicionalObservacion,
        s.Ubicacion AS ubicacion,
        s.estado_sup AS estadoSup
    FROM dbo.tbl_Supervision s
    WHERE ISNULL(s.E_Eliminado, 0) = 0
      AND LOWER(LTRIM(RTRIM(ISNULL(s.estado_sup, '')))) = 'pendiente'
      AND LTRIM(RTRIM(s.Id_Supervisor)) = LTRIM(RTRIM(@IdSupervisor))
      AND (@FechaDesde IS NULL OR CAST(s.FechaRegistro AS DATE) >= @FechaDesde)
      AND (@FechaHasta IS NULL OR CAST(s.FechaRegistro AS DATE) <= @FechaHasta)
    ORDER BY s.FechaRegistro DESC, s.Id_Supervision DESC;
END
GO
