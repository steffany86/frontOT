USE BD_TigoHogar
GO

IF OBJECT_ID('dbo.SP_InicioJornada_ExisteRegistroHoy', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_InicioJornada_ExisteRegistroHoy AS SELECT 0 AS existe');
GO
ALTER PROCEDURE dbo.SP_InicioJornada_ExisteRegistroHoy
    @IdTecnico INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.tbl_InicioJornadaAlturas
        WHERE id_tecnico = @IdTecnico
          AND CAST(fecha_registro AS DATE) = CAST(GETDATE() AS DATE)
          AND ISNULL(e_eliminado,0)=0
    ) THEN 1 ELSE 0 END AS existe;
END
GO

IF OBJECT_ID('dbo.SP_InicioJornada_MarcarNoCierreAtrasado', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_InicioJornada_MarcarNoCierreAtrasado AS SELECT 0 AS updated');
GO
ALTER PROCEDURE dbo.SP_InicioJornada_MarcarNoCierreAtrasado
    @IdTecnico INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.tbl_InicioJornadaAlturas
    SET no_marco_cierre = 1
    WHERE id_tecnico = @IdTecnico
      AND CAST(fecha_registro AS DATE) < CAST(GETDATE() AS DATE)
      AND fecha_cierre IS NULL
      AND ISNULL(e_eliminado,0)=0
      AND ISNULL(no_marco_cierre,0)=0;

    SELECT @@ROWCOUNT AS updated;
END
GO

IF OBJECT_ID('dbo.SP_InicioJornada_EstadoCierreHoy', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_InicioJornada_EstadoCierreHoy AS SELECT TOP 0 1 AS id_inicio');
GO
ALTER PROCEDURE dbo.SP_InicioJornada_EstadoCierreHoy
    @IdTecnico INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 id_inicio, fecha_registro, fecha_cierre, no_marco_cierre
    FROM dbo.tbl_InicioJornadaAlturas
    WHERE id_tecnico = @IdTecnico
      AND CAST(fecha_registro AS DATE) = CAST(GETDATE() AS DATE)
      AND ISNULL(e_eliminado,0)=0
    ORDER BY id_inicio DESC;
END
GO

IF OBJECT_ID('dbo.SP_InicioJornada_CountNoMarco', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_InicioJornada_CountNoMarco AS SELECT 0 AS total');
GO
ALTER PROCEDURE dbo.SP_InicioJornada_CountNoMarco
    @IdTecnico INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(1) AS total
    FROM dbo.tbl_InicioJornadaAlturas
    WHERE id_tecnico = @IdTecnico
      AND ISNULL(no_marco_cierre,0)=1
      AND ISNULL(e_eliminado,0)=0;
END
GO

IF OBJECT_ID('dbo.SP_InicioJornada_Registrar', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_InicioJornada_Registrar AS SELECT TOP 0 * FROM dbo.tbl_InicioJornadaAlturas');
GO
ALTER PROCEDURE dbo.SP_InicioJornada_Registrar
    @IdTecnico INT,
    @IdAuxiliar INT = NULL,
    @IdEncargado INT = NULL,
    @IdUsuarioSupervisorGrupo INT = NULL,
    @IdSucursal INT = NULL,
    @Sucursal NVARCHAR(120) = NULL,
    @NombreTecnico NVARCHAR(200) = NULL,
    @Capacitado NVARCHAR(10) = NULL,
    @Charla NVARCHAR(10) = NULL,
    @Botiquin NVARCHAR(10) = NULL,
    @Extintor NVARCHAR(10) = NULL,
    @FechaVencimiento DATE = NULL,
    @EquipoEpp NVARCHAR(10) = NULL,
    @EstadoEpp NVARCHAR(10) = NULL,
    @Apr NVARCHAR(10) = NULL,
    @Escalera NVARCHAR(10) = NULL,
    @Anclaje NVARCHAR(10) = NULL,
    @Imagen NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.tbl_InicioJornadaAlturas (
        id_tecnico, id_auxiliar, id_encargado, fecha_registro, pendiente,
        capacitado, charla, botiquin, extintor, fecha_vencimiento,
        equipo_epp, estado_epp, apr, escalera, anclaje, imagen, e_eliminado,
        id_usuario_supervisor_grupo, id_sucursal, sucursal, nombre_tecnico
    )
    VALUES (
        @IdTecnico, @IdAuxiliar, @IdEncargado, GETDATE(), 1,
        @Capacitado, @Charla, @Botiquin, @Extintor, @FechaVencimiento,
        @EquipoEpp, @EstadoEpp, @Apr, @Escalera, @Anclaje, @Imagen, 0,
        @IdUsuarioSupervisorGrupo, @IdSucursal, @Sucursal, @NombreTecnico
    );

    SELECT TOP 1 *
    FROM dbo.tbl_InicioJornadaAlturas
    WHERE id_tecnico = @IdTecnico
    ORDER BY id_inicio DESC;
END
GO

IF OBJECT_ID('dbo.SP_InicioJornada_Cerrar', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_InicioJornada_Cerrar AS SELECT TOP 0 * FROM dbo.tbl_InicioJornadaAlturas');
GO
ALTER PROCEDURE dbo.SP_InicioJornada_Cerrar
    @IdTecnico INT,
    @CodigoCliente NVARCHAR(100) = NULL,
    @DanoMaterial BIT = NULL,
    @ObservacionMaterial NVARCHAR(4000) = NULL,
    @DanoPersona BIT = NULL,
    @ObservacionPersona NVARCHAR(4000) = NULL,
    @NovedadesTrabajo BIT = NULL,
    @ObservacionNovedades NVARCHAR(4000) = NULL,
    @UbicacionGeoRef NVARCHAR(4000) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdInicio INT;
    SELECT TOP 1 @IdInicio = id_inicio
    FROM dbo.tbl_InicioJornadaAlturas
    WHERE id_tecnico = @IdTecnico
      AND CAST(fecha_registro AS DATE) = CAST(GETDATE() AS DATE)
      AND fecha_cierre IS NULL
      AND ISNULL(e_eliminado,0)=0
    ORDER BY id_inicio DESC;

    IF @IdInicio IS NULL
    BEGIN
        SELECT TOP 0 * FROM dbo.tbl_InicioJornadaAlturas;
        RETURN;
    END

    UPDATE dbo.tbl_InicioJornadaAlturas
    SET fecha_cierre = GETDATE(),
        codigo_cliente = @CodigoCliente,
        dano_material = @DanoMaterial,
        observacion_material = @ObservacionMaterial,
        dano_persona = @DanoPersona,
        observacion_persona = @ObservacionPersona,
        novedades_trabajo = @NovedadesTrabajo,
        observacion_novedades = @ObservacionNovedades,
        ubicacion_georef = @UbicacionGeoRef,
        no_marco_cierre = 0
    WHERE id_inicio = @IdInicio;

    SELECT TOP 1 *
    FROM dbo.tbl_InicioJornadaAlturas
    WHERE id_inicio = @IdInicio;
END
GO

IF OBJECT_ID('dbo.SP_InicioJornada_ExistePendienteHoy', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_InicioJornada_ExistePendienteHoy AS SELECT 0 AS existe');
GO
ALTER PROCEDURE dbo.SP_InicioJornada_ExistePendienteHoy
    @IdTecnico INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM dbo.tbl_InicioJornadaAlturas
        WHERE id_tecnico = @IdTecnico
          AND CAST(fecha_registro AS DATE) = CAST(GETDATE() AS DATE)
          AND ISNULL(pendiente,0)=1
          AND ISNULL(e_eliminado,0)=0
    ) THEN 1 ELSE 0 END AS existe;
END
GO

