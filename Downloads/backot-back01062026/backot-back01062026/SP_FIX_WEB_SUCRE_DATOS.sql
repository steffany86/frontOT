ALTER PROC dbo.spx_RegistrarConformacionCuadrillaWeb
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.tbl_ConformacionCuadrillaDiario (
        fecha,
        estado,
        actividad,
        id_tecnico,
        cuenta_sf,
        salesforce,
        habilidad,
        vehiculo,
        [grupo],
        almacen,
        grupoDigitacion,
        idUsuarioDigitador,
        digitador,
        tecnico,
        id_tecnicoAuxiliar,
        auxiliar,
        idUsuarioSupervisor,
        supervisorACargo,
        sucursal,
        observacion,
        idUsuarioRegistra,
        fechaRegistro,
        e_eliminado
    )
    VALUES (
        ISNULL(@Fecha, CAST(GETDATE() AS DATE)),
        @Estado,
        @Actividad,
        @Id_Tecnico,
        @Cuenta_SF,
        @Salesforce,
        @Habilidad,
        @Vehiculo,
        @Grupo,
        @Almacen,
        @GrupoDigitacion,
        @IdUsuarioDigitador,
        @Digitador,
        @Tecnico,
        @Id_TecnicoAuxiliar,
        @Auxiliar,
        @IdUsuarioSupervisor,
        @SupervisorACargo,
        @Sucursal,
        @Observacion,
        @IdUsuarioRegistra,
        GETDATE(),
        0
    );

    SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS id;
END
GO

ALTER PROC dbo.spx_ActualizarConformacionCuadrillaWeb
    @Id BIGINT,
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    UPDATE dbo.tbl_ConformacionCuadrillaDiario
    SET fecha = ISNULL(@Fecha, fecha),
        estado = @Estado,
        actividad = @Actividad,
        id_tecnico = @Id_Tecnico,
        cuenta_sf = @Cuenta_SF,
        salesforce = @Salesforce,
        habilidad = @Habilidad,
        vehiculo = @Vehiculo,
        [grupo] = @Grupo,
        almacen = @Almacen,
        grupoDigitacion = @GrupoDigitacion,
        idUsuarioDigitador = @IdUsuarioDigitador,
        digitador = @Digitador,
        tecnico = @Tecnico,
        id_tecnicoAuxiliar = @Id_TecnicoAuxiliar,
        auxiliar = @Auxiliar,
        idUsuarioSupervisor = @IdUsuarioSupervisor,
        supervisorACargo = @SupervisorACargo,
        sucursal = @Sucursal,
        observacion = @Observacion,
        idUsuarioRegistra = @IdUsuarioRegistra
    WHERE id = @Id
      AND e_eliminado = 0;
END
GO

ALTER PROC dbo.spx_EliminarConformacionCuadrillaWeb
    @Id BIGINT
AS
BEGIN
    UPDATE dbo.tbl_ConformacionCuadrillaDiario
    SET e_eliminado = 1
    WHERE id = @Id
      AND e_eliminado = 0;
END
GO

ALTER PROC dbo.spx_ObtenerConformacionCuadrillaWeb
    @Fecha DATE = NULL,
    @Sucursal NVARCHAR(100) = NULL,
    @Limite INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FechaConsulta DATE = ISNULL(@Fecha, CAST(GETDATE() AS DATE));
    DECLARE @SucursalNormalizada NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Sucursal)), '');

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    ),
    BaseCuadrillas AS (
        SELECT
            CAST(r.Id_Ruta AS BIGINT) AS id_ruta,
            @FechaConsulta AS fecha,
            CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
            CAST(
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(r.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                        THEN UPPER(LTRIM(RTRIM(r.Tipo)))
                    ELSE 'TITULAR'
                END
                AS NVARCHAR(20)
            ) AS actividad,
            v.Id_Vendedor AS id_tecnico,
            v.CuentaSF AS cuenta_sf,
            v.SalesForce AS salesforce,
            v.Habilidad AS habilidad,
            v.Vehiculo AS vehiculo,
            r.Nombre AS grupo,
            NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS almacen,
            NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS grupoDigitacion,
            v.Nombre AS tecnico,
            va.sucursal AS sucursal,
            GETDATE() AS fechaRegistro,
            CONVERT(BIT, ISNULL(r.E_Eliminado, 0)) AS e_eliminado
        FROM dbo.tbl_Ruta r
        INNER JOIN dbo.tbl_Vendedor v
            ON v.Id_Vendedor = r.Id_Vendedor
        CROSS JOIN VersionActual va
        WHERE v.E_Eliminado = 0
    ),
    GuardadasGrupo AS (
        SELECT
            g.*,
            ROW_NUMBER() OVER (
                PARTITION BY
                    g.id_tecnico,
                    UPPER(LTRIM(RTRIM(ISNULL(g.grupo, ''))))
                ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
            ) AS rn
        FROM dbo.tbl_ConformacionCuadrillaDiario g
        WHERE ISNULL(g.e_eliminado, 0) = 0
          AND g.fecha = @FechaConsulta
          AND (
                @SucursalNormalizada IS NULL
                OR UPPER(LTRIM(RTRIM(ISNULL(g.sucursal, '')))) = UPPER(@SucursalNormalizada)
              )
    ),
    GuardadasTecnico AS (
        SELECT
            g.*,
            ROW_NUMBER() OVER (
                PARTITION BY g.id_tecnico
                ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
            ) AS rn
        FROM dbo.tbl_ConformacionCuadrillaDiario g
        WHERE ISNULL(g.e_eliminado, 0) = 0
          AND g.fecha = @FechaConsulta
          AND (
                @SucursalNormalizada IS NULL
                OR UPPER(LTRIM(RTRIM(ISNULL(g.sucursal, '')))) = UPPER(@SucursalNormalizada)
              )
    )
    SELECT TOP (CASE WHEN @Limite IS NULL OR @Limite <= 0 THEN 2147483647 ELSE @Limite END)
        b.id_ruta AS id,
        b.id_ruta AS id_ruta,
        COALESCE(ge.fecha, gt.fecha, b.fecha) AS fecha,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.estado)), ''), NULLIF(LTRIM(RTRIM(gt.estado)), ''), b.estado) AS estado,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.actividad)), ''), NULLIF(LTRIM(RTRIM(gt.actividad)), ''), b.actividad) AS actividad,
        b.id_tecnico,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.cuenta_sf)), ''), NULLIF(LTRIM(RTRIM(gt.cuenta_sf)), ''), b.cuenta_sf) AS cuenta_sf,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.salesforce)), ''), NULLIF(LTRIM(RTRIM(gt.salesforce)), ''), b.salesforce) AS salesforce,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.habilidad)), ''), NULLIF(LTRIM(RTRIM(gt.habilidad)), ''), b.habilidad) AS habilidad,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.vehiculo)), ''), NULLIF(LTRIM(RTRIM(gt.vehiculo)), ''), b.vehiculo) AS vehiculo,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.grupo)), ''), NULLIF(LTRIM(RTRIM(gt.grupo)), ''), b.grupo) AS grupo,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.almacen)), ''), NULLIF(LTRIM(RTRIM(gt.almacen)), ''), b.almacen) AS almacen,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.grupoDigitacion)), ''), NULLIF(LTRIM(RTRIM(gt.grupoDigitacion)), ''), b.grupoDigitacion) AS grupoDigitacion,
        COALESCE(ge.idUsuarioDigitador, gt.idUsuarioDigitador) AS idUsuarioDigitador,
        COALESCE(ge.digitador, gt.digitador) AS digitador,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.tecnico)), ''), NULLIF(LTRIM(RTRIM(gt.tecnico)), ''), b.tecnico) AS tecnico,
        COALESCE(ge.id_tecnicoAuxiliar, gt.id_tecnicoAuxiliar) AS id_tecnicoAuxiliar,
        COALESCE(ge.auxiliar, gt.auxiliar) AS auxiliar,
        COALESCE(ge.idUsuarioSupervisor, gt.idUsuarioSupervisor) AS idUsuarioSupervisor,
        COALESCE(ge.supervisorACargo, gt.supervisorACargo) AS supervisorACargo,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.sucursal)), ''), NULLIF(LTRIM(RTRIM(gt.sucursal)), ''), b.sucursal) AS sucursal,
        COALESCE(ge.observacion, gt.observacion) AS observacion,
        COALESCE(ge.idUsuarioRegistra, gt.idUsuarioRegistra) AS idUsuarioRegistra,
        COALESCE(ge.fechaRegistro, gt.fechaRegistro, b.fechaRegistro) AS fechaRegistro,
        COALESCE(ge.e_eliminado, gt.e_eliminado, b.e_eliminado) AS e_eliminado
    FROM BaseCuadrillas b
    LEFT JOIN GuardadasGrupo ge
        ON ge.id_tecnico = b.id_tecnico
       AND UPPER(LTRIM(RTRIM(ISNULL(ge.grupo, '')))) = UPPER(LTRIM(RTRIM(ISNULL(b.grupo, ''))))
       AND ge.rn = 1
    LEFT JOIN GuardadasTecnico gt
        ON gt.id_tecnico = b.id_tecnico
       AND gt.rn = 1
    WHERE @SucursalNormalizada IS NULL
       OR UPPER(LTRIM(RTRIM(ISNULL(COALESCE(ge.sucursal, gt.sucursal, b.sucursal), '')))) = UPPER(@SucursalNormalizada)
    ORDER BY
        COALESCE(ge.e_eliminado, gt.e_eliminado, b.e_eliminado),
        COALESCE(ge.grupo, gt.grupo, b.grupo),
        COALESCE(ge.tecnico, gt.tecnico, b.tecnico),
        b.id_ruta;
END
GO

ALTER PROC dbo.spx_ObtenerConformacionCuadrillaWebPorId
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    ),
    BaseRow AS (
        SELECT TOP 1
            CAST(r.Id_Ruta AS BIGINT) AS id_ruta,
            CAST(GETDATE() AS DATE) AS fecha,
            CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
            CAST(
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(r.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                        THEN UPPER(LTRIM(RTRIM(r.Tipo)))
                    ELSE 'TITULAR'
                END
                AS NVARCHAR(20)
            ) AS actividad,
            v.Id_Vendedor AS id_tecnico,
            v.CuentaSF AS cuenta_sf,
            v.SalesForce AS salesforce,
            v.Habilidad AS habilidad,
            v.Vehiculo AS vehiculo,
            r.Nombre AS grupo,
            NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS almacen,
            NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '') AS grupoDigitacion,
            v.Nombre AS tecnico,
            va.sucursal AS sucursal,
            GETDATE() AS fechaRegistro,
            CONVERT(BIT, ISNULL(r.E_Eliminado, 0)) AS e_eliminado
        FROM dbo.tbl_Ruta r
        INNER JOIN dbo.tbl_Vendedor v
            ON v.Id_Vendedor = r.Id_Vendedor
        CROSS JOIN VersionActual va
        WHERE r.Id_Ruta = @Id
          AND v.E_Eliminado = 0
    ),
    GuardadaGrupo AS (
        SELECT TOP 1 g.*
        FROM dbo.tbl_ConformacionCuadrillaDiario g
        INNER JOIN BaseRow b
            ON b.id_tecnico = g.id_tecnico
           AND UPPER(LTRIM(RTRIM(ISNULL(g.grupo, '')))) = UPPER(LTRIM(RTRIM(ISNULL(b.grupo, ''))))
        WHERE ISNULL(g.e_eliminado, 0) = 0
        ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
    ),
    GuardadaTecnico AS (
        SELECT TOP 1 g.*
        FROM dbo.tbl_ConformacionCuadrillaDiario g
        INNER JOIN BaseRow b
            ON b.id_tecnico = g.id_tecnico
        WHERE ISNULL(g.e_eliminado, 0) = 0
        ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
    )
    SELECT TOP 1
        b.id_ruta AS id,
        b.id_ruta,
        COALESCE(gg.fecha, gt.fecha, b.fecha) AS fecha,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.estado)), ''), NULLIF(LTRIM(RTRIM(gt.estado)), ''), b.estado) AS estado,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.actividad)), ''), NULLIF(LTRIM(RTRIM(gt.actividad)), ''), b.actividad) AS actividad,
        b.id_tecnico,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.cuenta_sf)), ''), NULLIF(LTRIM(RTRIM(gt.cuenta_sf)), ''), b.cuenta_sf) AS cuenta_sf,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.salesforce)), ''), NULLIF(LTRIM(RTRIM(gt.salesforce)), ''), b.salesforce) AS salesforce,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.habilidad)), ''), NULLIF(LTRIM(RTRIM(gt.habilidad)), ''), b.habilidad) AS habilidad,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.vehiculo)), ''), NULLIF(LTRIM(RTRIM(gt.vehiculo)), ''), b.vehiculo) AS vehiculo,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.grupo)), ''), NULLIF(LTRIM(RTRIM(gt.grupo)), ''), b.grupo) AS grupo,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.almacen)), ''), NULLIF(LTRIM(RTRIM(gt.almacen)), ''), b.almacen) AS almacen,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.grupoDigitacion)), ''), NULLIF(LTRIM(RTRIM(gt.grupoDigitacion)), ''), b.grupoDigitacion) AS grupoDigitacion,
        COALESCE(gg.idUsuarioDigitador, gt.idUsuarioDigitador) AS idUsuarioDigitador,
        COALESCE(gg.digitador, gt.digitador) AS digitador,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.tecnico)), ''), NULLIF(LTRIM(RTRIM(gt.tecnico)), ''), b.tecnico) AS tecnico,
        COALESCE(gg.id_tecnicoAuxiliar, gt.id_tecnicoAuxiliar) AS id_tecnicoAuxiliar,
        COALESCE(gg.auxiliar, gt.auxiliar) AS auxiliar,
        COALESCE(gg.idUsuarioSupervisor, gt.idUsuarioSupervisor) AS idUsuarioSupervisor,
        COALESCE(gg.supervisorACargo, gt.supervisorACargo) AS supervisorACargo,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.sucursal)), ''), NULLIF(LTRIM(RTRIM(gt.sucursal)), ''), b.sucursal) AS sucursal,
        COALESCE(gg.observacion, gt.observacion) AS observacion,
        COALESCE(gg.idUsuarioRegistra, gt.idUsuarioRegistra) AS idUsuarioRegistra,
        COALESCE(gg.fechaRegistro, gt.fechaRegistro, b.fechaRegistro) AS fechaRegistro,
        COALESCE(gg.e_eliminado, gt.e_eliminado, b.e_eliminado) AS e_eliminado
    FROM BaseRow b
    LEFT JOIN GuardadaGrupo gg
        ON gg.id_tecnico = b.id_tecnico
       AND UPPER(LTRIM(RTRIM(ISNULL(gg.grupo, '')))) = UPPER(LTRIM(RTRIM(ISNULL(b.grupo, ''))))
    LEFT JOIN GuardadaTecnico gt
        ON gt.id_tecnico = b.id_tecnico;
END
GO
