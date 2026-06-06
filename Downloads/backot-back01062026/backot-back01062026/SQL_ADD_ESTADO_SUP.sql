-- ========================================================================
-- AGREGAR CAMPO estado_sup A LA TABLA DE SUPERVISIONES
-- ========================================================================
-- Valores: 'pendiente' | 'completado'
-- Las supervisiones manuales se crean como 'completado'
-- Las supervisiones desde backoffice se crean como 'pendiente'
-- ========================================================================

USE [BD_TigoHogar]
GO

-- 1. Agregar columna estado_sup si no existe
IF COL_LENGTH('dbo.tbl_Supervision', 'estado_sup') IS NULL
BEGIN
    PRINT 'Agregando columna estado_sup...';
    
    ALTER TABLE dbo.tbl_Supervision
    ADD estado_sup NVARCHAR(20) NULL;
    
    -- Actualizar registros existentes como 'completado'
    UPDATE dbo.tbl_Supervision
    SET estado_sup = 'completado'
    WHERE estado_sup IS NULL;
    
    -- Establecer valor por defecto
    ALTER TABLE dbo.tbl_Supervision
    ALTER COLUMN estado_sup NVARCHAR(20) NOT NULL;
    
    ALTER TABLE dbo.tbl_Supervision
    ADD CONSTRAINT DF_tbl_Supervision_estado_sup DEFAULT 'completado' FOR estado_sup;
    
    PRINT 'Columna estado_sup agregada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La columna estado_sup ya existe.';
END
GO

-- 2. Crear/actualizar constraint para valores válidos
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tbl_Supervision_estado_sup')
BEGIN
    ALTER TABLE dbo.tbl_Supervision DROP CONSTRAINT CK_tbl_Supervision_estado_sup;
END

ALTER TABLE dbo.tbl_Supervision
ADD CONSTRAINT CK_tbl_Supervision_estado_sup
CHECK (estado_sup IN ('pendiente', 'completado'));

PRINT 'Constraint de valores válidos agregado.';
GO

-- 3. Actualizar SP de registro para incluir estado_sup = 'completado'
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
               CASE WHEN @HasEstadoSup = 1 THEN N', ''completado''' ELSE N'' END +
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

-- 4. Actualizar SP de listar para filtrar solo completados por defecto
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
    DECLARE @HasEstadoSup BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'estado_sup') IS NULL THEN 0 ELSE 1 END;
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
        s.Ubicacion AS ubicacion,
        ' + CASE WHEN @HasEstadoSup = 1 THEN N's.estado_sup AS estadoSup' ELSE N'''completado'' AS estadoSup' END + N'
    FROM dbo.tbl_Supervision s
    WHERE 1 = 1 ' +
    CASE WHEN @HasEliminado = 1 THEN N' AND ISNULL(s.E_Eliminado,0) = 0 ' ELSE N'' END +
    CASE WHEN @HasEstadoSup = 1 THEN N' AND s.estado_sup = ''completado'' ' ELSE N'' END +
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

-- 5. Crear SP para listar supervisiones pendientes (agenda)
CREATE OR ALTER PROC dbo.spx_ListarSupervisionPendiente
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
    DECLARE @HasEstadoSup BIT = CASE WHEN COL_LENGTH('dbo.tbl_Supervision', 'estado_sup') IS NULL THEN 0 ELSE 1 END;
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
        s.Ubicacion AS ubicacion,
        ' + CASE WHEN @HasEstadoSup = 1 THEN N's.estado_sup AS estadoSup' ELSE N'''pendiente'' AS estadoSup' END + N'
    FROM dbo.tbl_Supervision s
    WHERE 1 = 1 ' +
    CASE WHEN @HasEliminado = 1 THEN N' AND ISNULL(s.E_Eliminado,0) = 0 ' ELSE N'' END +
    CASE WHEN @HasEstadoSup = 1 THEN N' AND s.estado_sup = ''pendiente'' ' ELSE N' AND 1 = 0 ' END + -- Si no existe la columna, devolver vacío
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

PRINT '========================================';
PRINT 'SCRIPT COMPLETADO EXITOSAMENTE';
PRINT '========================================';
PRINT 'Cambios realizados:';
PRINT '1. Campo estado_sup agregado a tbl_Supervision';
PRINT '2. SP spx_RegistrarSupervisionManual actualizado (crea como completado)';
PRINT '3. SP spx_ListarSupervisionManual actualizado (filtra solo completadas)';
PRINT '4. SP spx_ListarSupervisionPendiente creado (filtra solo pendientes)';
PRINT '========================================';
