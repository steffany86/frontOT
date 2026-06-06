SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

USE [BD_TigoHogar]
GO

/*
  SPs de Supervision Manual para tabla existente dbo.tbl_Supervision.
  Nota: la tabla actual usa IDs NVARCHAR y columna FotoCanalesPilotos.
*/

CREATE OR ALTER PROC dbo.spx_RegistrarSupervisionManual
    @Id_Supervisor NVARCHAR(50),
    @Id_TecnicoPrincipal NVARCHAR(50),
    @Id_TecnicoAuxiliar NVARCHAR(50),
    @Id_TipoSupervision NVARCHAR(50),
    @Id_TipoTrabajo NVARCHAR(50),
    @Id_TipoPenalizacion NVARCHAR(50),
    @Supervision_Por NVARCHAR(100),
    @Tecnologia NVARCHAR(100),
    @Codigo NVARCHAR(100),
    @OrdenTrabajo NVARCHAR(100),
    @TipoRevision NVARCHAR(50),
    @FotoBoletaSupervision NVARCHAR(MAX) = NULL,
    @FotoCanalesPilos NVARCHAR(MAX) = NULL,
    @FotoNivelesDocsis NVARCHAR(MAX) = NULL,
    @FotoMedicionRuido NVARCHAR(MAX) = NULL,
    @FotoBarridoCanales NVARCHAR(MAX) = NULL,
    @FotoObservacion1 NVARCHAR(MAX) = NULL,
    @FotoObservacion2 NVARCHAR(MAX) = NULL,
    @FotoObservacion3 NVARCHAR(MAX) = NULL,
    @FotoObservacion4 NVARCHAR(MAX) = NULL,
    @Observacion NVARCHAR(1000) = NULL,
    @DescripcionAdicionalObservacion NVARCHAR(1000) = NULL,
    @Ubicacion NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdSupervision NVARCHAR(50) = LEFT(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''), 8);
    DECLARE @HasFecha BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'FechaRegistro') IS NULL THEN 0 ELSE 1 END;
    DECLARE @HasEliminado BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'E_Eliminado') IS NULL THEN 0 ELSE 1 END;
    DECLARE @Sql NVARCHAR(MAX);

    SET @Sql = N'INSERT INTO dbo.tbl_Supervision (' +
               N'Id_Supervision, Id_Supervisor, Id_TecnicoPrincipal, Id_TecnicoAuxiliar, Id_TipoSupervision, ' +
               N'Id_TipoTrabajo, Id_TipoPenalizacion, Supervision_Por, Tecnologia, Codigo, OrdenTrabajo, TipoRevision, ' +
               N'FotoBoletaSupervision, FotoCanalesPilotos, FotoNivelesDocsis, FotoMedicionRuido, FotoBarridoCanales, ' +
               N'FotoObservacion1, FotoObservacion2, FotoObservacion3, FotoObservacion4, Observacion, DescripcionAdicionalObservacion, Ubicacion' +
               CASE WHEN @HasFecha = 1 THEN N', FechaRegistro' ELSE N'' END +
               CASE WHEN @HasEliminado = 1 THEN N', E_Eliminado' ELSE N'' END +
               N') VALUES (' +
               N'@IdSupervision, @Id_Supervisor, @Id_TecnicoPrincipal, @Id_TecnicoAuxiliar, @Id_TipoSupervision, ' +
               N'@Id_TipoTrabajo, @Id_TipoPenalizacion, @Supervision_Por, @Tecnologia, @Codigo, @OrdenTrabajo, @TipoRevision, ' +
               N'@FotoBoletaSupervision, @FotoCanalesPilos, @FotoNivelesDocsis, @FotoMedicionRuido, @FotoBarridoCanales, ' +
               N'@FotoObservacion1, @FotoObservacion2, @FotoObservacion3, @FotoObservacion4, @Observacion, @DescripcionAdicionalObservacion, @Ubicacion' +
               CASE WHEN @HasFecha = 1 THEN N', GETDATE()' ELSE N'' END +
               CASE WHEN @HasEliminado = 1 THEN N', 0' ELSE N'' END +
               N');';

    EXEC sp_executesql
        @Sql,
        N'@IdSupervision NVARCHAR(50),
          @Id_Supervisor NVARCHAR(50),
          @Id_TecnicoPrincipal NVARCHAR(50),
          @Id_TecnicoAuxiliar NVARCHAR(50),
          @Id_TipoSupervision NVARCHAR(50),
          @Id_TipoTrabajo NVARCHAR(50),
          @Id_TipoPenalizacion NVARCHAR(50),
          @Supervision_Por NVARCHAR(100),
          @Tecnologia NVARCHAR(100),
          @Codigo NVARCHAR(100),
          @OrdenTrabajo NVARCHAR(100),
          @TipoRevision NVARCHAR(50),
          @FotoBoletaSupervision NVARCHAR(MAX),
          @FotoCanalesPilos NVARCHAR(MAX),
          @FotoNivelesDocsis NVARCHAR(MAX),
          @FotoMedicionRuido NVARCHAR(MAX),
          @FotoBarridoCanales NVARCHAR(MAX),
          @FotoObservacion1 NVARCHAR(MAX),
          @FotoObservacion2 NVARCHAR(MAX),
          @FotoObservacion3 NVARCHAR(MAX),
          @FotoObservacion4 NVARCHAR(MAX),
          @Observacion NVARCHAR(1000),
          @DescripcionAdicionalObservacion NVARCHAR(1000),
          @Ubicacion NVARCHAR(300)',
        @IdSupervision = @IdSupervision,
        @Id_Supervisor = @Id_Supervisor,
        @Id_TecnicoPrincipal = @Id_TecnicoPrincipal,
        @Id_TecnicoAuxiliar = @Id_TecnicoAuxiliar,
        @Id_TipoSupervision = @Id_TipoSupervision,
        @Id_TipoTrabajo = @Id_TipoTrabajo,
        @Id_TipoPenalizacion = @Id_TipoPenalizacion,
        @Supervision_Por = @Supervision_Por,
        @Tecnologia = @Tecnologia,
        @Codigo = @Codigo,
        @OrdenTrabajo = @OrdenTrabajo,
        @TipoRevision = @TipoRevision,
        @FotoBoletaSupervision = @FotoBoletaSupervision,
        @FotoCanalesPilos = @FotoCanalesPilos,
        @FotoNivelesDocsis = @FotoNivelesDocsis,
        @FotoMedicionRuido = @FotoMedicionRuido,
        @FotoBarridoCanales = @FotoBarridoCanales,
        @FotoObservacion1 = @FotoObservacion1,
        @FotoObservacion2 = @FotoObservacion2,
        @FotoObservacion3 = @FotoObservacion3,
        @FotoObservacion4 = @FotoObservacion4,
        @Observacion = @Observacion,
        @DescripcionAdicionalObservacion = @DescripcionAdicionalObservacion,
        @Ubicacion = @Ubicacion;

    SELECT @IdSupervision AS Id_Supervision;
END
GO

CREATE OR ALTER PROC dbo.spx_ListarSupervisionManual
    @IdSupervisor NVARCHAR(50) = NULL,
    @FechaDesde DATE = NULL,
    @FechaHasta DATE = NULL,
    @Limite INT = 200
AS
BEGIN
    SET NOCOUNT ON;
    IF @Limite IS NULL OR @Limite <= 0 SET @Limite = 200;

    DECLARE @HasFecha BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'FechaRegistro') IS NULL THEN 0 ELSE 1 END;
    DECLARE @HasEliminado BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'E_Eliminado') IS NULL THEN 0 ELSE 1 END;
    DECLARE @Sql NVARCHAR(MAX);

    SET @Sql = N'
    SELECT TOP (@Limite)
        s.Id_Supervision AS idSupervision,
        ' + CASE WHEN @HasFecha = 1 THEN N's.FechaRegistro AS fechaRegistro' ELSE N'CAST(NULL AS DATETIME) AS fechaRegistro' END + N',
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
        RTRIM(LTRIM(s.TipoRevision)) AS tipoRevision,
        s.Observacion AS observacion,
        s.DescripcionAdicionalObservacion AS descripcionAdicionalObservacion,
        s.Ubicacion AS ubicacion
    FROM dbo.tbl_Supervision s
    WHERE 1 = 1 ' +
    CASE WHEN @HasEliminado = 1 THEN N' AND ISNULL(s.E_Eliminado,0) = 0 ' ELSE N'' END +
    N' AND (@IdSupervisor IS NULL OR s.Id_Supervisor = @IdSupervisor) ' +
    CASE WHEN @HasFecha = 1 THEN N'
      AND (@FechaDesde IS NULL OR CAST(s.FechaRegistro AS DATE) >= @FechaDesde)
      AND (@FechaHasta IS NULL OR CAST(s.FechaRegistro AS DATE) <= @FechaHasta)
    ' ELSE N'' END +
    N' ORDER BY ' + CASE WHEN @HasFecha = 1 THEN N's.FechaRegistro DESC' ELSE N's.Id_Supervision DESC' END + N';';

    EXEC sp_executesql
        @Sql,
        N'@IdSupervisor NVARCHAR(50), @FechaDesde DATE, @FechaHasta DATE, @Limite INT',
        @IdSupervisor = @IdSupervisor,
        @FechaDesde = @FechaDesde,
        @FechaHasta = @FechaHasta,
        @Limite = @Limite;
END
GO

CREATE OR ALTER PROC dbo.spx_ObtenerSupervisionManualPorId
    @IdSupervision NVARCHAR(50),
    @IdSupervisor NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @HasFecha BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'FechaRegistro') IS NULL THEN 0 ELSE 1 END;
    DECLARE @HasEliminado BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'E_Eliminado') IS NULL THEN 0 ELSE 1 END;
    DECLARE @Sql NVARCHAR(MAX);

    SET @Sql = N'
    SELECT TOP 1
        s.Id_Supervision AS idSupervision,
        ' + CASE WHEN @HasFecha = 1 THEN N's.FechaRegistro AS fechaRegistro' ELSE N'CAST(NULL AS DATETIME) AS fechaRegistro' END + N',
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
        RTRIM(LTRIM(s.TipoRevision)) AS tipoRevision,
        s.FotoBoletaSupervision AS fotoBoletaSupervision,
        s.FotoCanalesPilotos AS fotoCanalesPilos,
        s.FotoNivelesDocsis AS fotoNivelesDocsis,
        s.FotoMedicionRuido AS fotoMedicionRuido,
        s.FotoBarridoCanales AS fotoBarridoCanales,
        s.FotoObservacion1 AS fotoObservacion1,
        s.FotoObservacion2 AS fotoObservacion2,
        s.FotoObservacion3 AS fotoObservacion3,
        s.FotoObservacion4 AS fotoObservacion4,
        s.Observacion AS observacion,
        s.DescripcionAdicionalObservacion AS descripcionAdicionalObservacion,
        s.Ubicacion AS ubicacion
    FROM dbo.tbl_Supervision s
    WHERE s.Id_Supervision = @IdSupervision ' +
    CASE WHEN @HasEliminado = 1 THEN N' AND ISNULL(s.E_Eliminado,0) = 0 ' ELSE N'' END +
    N' AND (@IdSupervisor IS NULL OR s.Id_Supervisor = @IdSupervisor);';

    EXEC sp_executesql
        @Sql,
        N'@IdSupervision NVARCHAR(50), @IdSupervisor NVARCHAR(50)',
        @IdSupervision = @IdSupervision,
        @IdSupervisor = @IdSupervisor;
END
GO
