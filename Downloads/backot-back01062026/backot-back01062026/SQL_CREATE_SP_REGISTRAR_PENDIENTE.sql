USE [BD_TigoHogar]
GO

-- ========================================================================
-- CREAR SP PARA REGISTRAR SUPERVISIÓN PENDIENTE (DESDE BACKOFFICE)
-- ========================================================================
-- Este SP se usa para crear supervisiones pendientes asignadas a un supervisor
-- Estado: 'pendiente' (para que aparezcan en la Agenda del supervisor)
-- ========================================================================

CREATE OR ALTER PROC dbo.spx_RegistrarSupervisionPendiente
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
    DECLARE @HasEstadoSup BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'estado_sup') IS NULL THEN 0 ELSE 1 END;
    DECLARE @Sql NVARCHAR(MAX);

    SET @Sql = N'INSERT INTO dbo.tbl_Supervision (' +
               N'Id_Supervision, Id_Supervisor, Id_TecnicoPrincipal, Id_TecnicoAuxiliar, Id_TipoSupervision, ' +
               N'Id_TipoTrabajo, Id_TipoPenalizacion, Supervision_Por, Tecnologia, Codigo, OrdenTrabajo, TipoRevision, ' +
               N'FotoBoletaSupervision, FotoCanalesPilotos, FotoNivelesDocsis, FotoMedicionRuido, FotoBarridoCanales, ' +
               N'FotoObservacion1, FotoObservacion2, FotoObservacion3, FotoObservacion4, Observacion, DescripcionAdicionalObservacion, Ubicacion' +
               CASE WHEN @HasFecha = 1 THEN N', FechaRegistro' ELSE N'' END +
               CASE WHEN @HasEliminado = 1 THEN N', E_Eliminado' ELSE N'' END +
               CASE WHEN @HasEstadoSup = 1 THEN N', estado_sup' ELSE N'' END +
               N') VALUES (' +
               N'@IdSupervision, @Id_Supervisor, @Id_TecnicoPrincipal, @Id_TecnicoAuxiliar, @Id_TipoSupervision, ' +
               N'@Id_TipoTrabajo, @Id_TipoPenalizacion, @Supervision_Por, @Tecnologia, @Codigo, @OrdenTrabajo, @TipoRevision, ' +
               N'@FotoBoletaSupervision, @FotoCanalesPilos, @FotoNivelesDocsis, @FotoMedicionRuido, @FotoBarridoCanales, ' +
               N'@FotoObservacion1, @FotoObservacion2, @FotoObservacion3, @FotoObservacion4, @Observacion, @DescripcionAdicionalObservacion, @Ubicacion' +
               CASE WHEN @HasFecha = 1 THEN N', GETDATE()' ELSE N'' END +
               CASE WHEN @HasEliminado = 1 THEN N', 0' ELSE N'' END +
               CASE WHEN @HasEstadoSup = 1 THEN N', ''pendiente''' ELSE N'' END +
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

PRINT 'Stored procedure spx_RegistrarSupervisionPendiente creado exitosamente.';
