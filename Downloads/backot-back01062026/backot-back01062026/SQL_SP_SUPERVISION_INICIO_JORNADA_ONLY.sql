USE BD_TigoHogar
GO

IF OBJECT_ID('dbo.SP_Supervision_ListarTiposSupervision', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Supervision_ListarTiposSupervision AS SELECT TOP 0 1 AS idTipoSupervision');
GO
ALTER PROCEDURE dbo.SP_Supervision_ListarTiposSupervision
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id_TipoSupervision AS idTipoSupervision, TipoSupervision AS tipoSupervision
    FROM dbo.tbl_TipoSupervision
    ORDER BY TipoSupervision;
END
GO

IF OBJECT_ID('dbo.SP_Supervision_ListarTiposTrabajo', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Supervision_ListarTiposTrabajo AS SELECT TOP 0 1 AS idTipoTrabajo');
GO
ALTER PROCEDURE dbo.SP_Supervision_ListarTiposTrabajo
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id_TipoTrabajo AS idTipoTrabajo, TipoTrabajo AS tipoTrabajo
    FROM dbo.tbl_TipoTrabajo
    ORDER BY TipoTrabajo;
END
GO

IF OBJECT_ID('dbo.SP_Supervision_ListarTiposPenalizacion', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Supervision_ListarTiposPenalizacion AS SELECT TOP 0 1 AS idTipoPenalizacion');
GO
ALTER PROCEDURE dbo.SP_Supervision_ListarTiposPenalizacion
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id_TipoPenalizacion AS idTipoPenalizacion, TipoPenalizacion AS tipoPenalizacion
    FROM dbo.tbl_TipoPenalizacion
    ORDER BY TipoPenalizacion;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_ListarPendientesSupervisorHoy', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_ListarPendientesSupervisorHoy AS SELECT TOP 0 1 AS idInicio');
GO
ALTER PROCEDURE dbo.SP_Inicio_ListarPendientesSupervisorHoy
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 200
      ij.id_inicio AS idInicio,
      ij.id_tecnico AS idTecnico,
      ij.id_auxiliar AS idAuxiliar,
      ij.id_encargado AS idSupervisor,
      ij.fecha_registro AS fechaRegistro,
      ij.fecha_cierre AS fechaCierre,
      ij.imagen AS imagen,
      'PENDIENTE' AS estado,
      CAST(NULL AS NVARCHAR(200)) AS tecnicoNombre,
      CAST(NULL AS NVARCHAR(200)) AS auxiliarNombre
    FROM dbo.tbl_InicioJornadaAlturas ij
    WHERE ij.id_encargado = @IdSupervisor
      AND ISNULL(ij.pendiente,0)=1
      AND ISNULL(ij.e_eliminado,0)=0
      AND CAST(ij.fecha_registro AS DATE)=CAST(GETDATE() AS DATE)
    ORDER BY ij.id_inicio DESC;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_ListarPendientesHoyTodos', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_ListarPendientesHoyTodos AS SELECT TOP 0 1 AS idInicio');
GO
ALTER PROCEDURE dbo.SP_Inicio_ListarPendientesHoyTodos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 200
      ij.id_inicio AS idInicio,
      ij.id_tecnico AS idTecnico,
      ij.id_auxiliar AS idAuxiliar,
      ij.id_encargado AS idSupervisor,
      ij.fecha_registro AS fechaRegistro,
      ij.fecha_cierre AS fechaCierre,
      ij.imagen AS imagen,
      'PENDIENTE' AS estado,
      CAST(NULL AS NVARCHAR(200)) AS tecnicoNombre,
      CAST(NULL AS NVARCHAR(200)) AS auxiliarNombre
    FROM dbo.tbl_InicioJornadaAlturas ij
    WHERE ISNULL(ij.pendiente,0)=1
      AND ISNULL(ij.e_eliminado,0)=0
      AND CAST(ij.fecha_registro AS DATE)=CAST(GETDATE() AS DATE)
    ORDER BY ij.id_inicio DESC;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_ListarConfirmadosSupervisorHoy', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_ListarConfirmadosSupervisorHoy AS SELECT TOP 0 1 AS idInicio');
GO
ALTER PROCEDURE dbo.SP_Inicio_ListarConfirmadosSupervisorHoy
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 200
      ij.id_inicio AS idInicio,
      ij.id_tecnico AS idTecnico,
      ij.id_auxiliar AS idAuxiliar,
      ij.id_encargado AS idSupervisor,
      ij.fecha_registro AS fechaRegistro,
      ij.fecha_cierre AS fechaCierre,
      ij.imagen AS imagen,
      CASE WHEN ij.fecha_cierre IS NOT NULL THEN 'JORNADA FINALIZADA' ELSE 'JORNADA APROBADA' END AS estado,
      CAST(NULL AS NVARCHAR(200)) AS tecnicoNombre,
      CAST(NULL AS NVARCHAR(200)) AS auxiliarNombre
    FROM dbo.tbl_InicioJornadaAlturas ij
    WHERE ij.id_encargado = @IdSupervisor
      AND ISNULL(ij.pendiente,0)=0
      AND ISNULL(ij.e_eliminado,0)=0
      AND (CAST(ij.fecha_registro AS DATE)=CAST(GETDATE() AS DATE)
           OR CAST(ISNULL(ij.fecha_cierre, ij.fecha_registro) AS DATE)=CAST(GETDATE() AS DATE))
    ORDER BY ij.id_inicio DESC;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_ListarConfirmadosHoyTodos', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_ListarConfirmadosHoyTodos AS SELECT TOP 0 1 AS idInicio');
GO
ALTER PROCEDURE dbo.SP_Inicio_ListarConfirmadosHoyTodos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 200
      ij.id_inicio AS idInicio,
      ij.id_tecnico AS idTecnico,
      ij.id_auxiliar AS idAuxiliar,
      ij.id_encargado AS idSupervisor,
      ij.fecha_registro AS fechaRegistro,
      ij.fecha_cierre AS fechaCierre,
      ij.imagen AS imagen,
      CASE WHEN ij.fecha_cierre IS NOT NULL THEN 'JORNADA FINALIZADA' ELSE 'JORNADA APROBADA' END AS estado,
      CAST(NULL AS NVARCHAR(200)) AS tecnicoNombre,
      CAST(NULL AS NVARCHAR(200)) AS auxiliarNombre
    FROM dbo.tbl_InicioJornadaAlturas ij
    WHERE ISNULL(ij.pendiente,0)=0
      AND ISNULL(ij.e_eliminado,0)=0
      AND CAST(ij.fecha_registro AS DATE)=CAST(GETDATE() AS DATE)
    ORDER BY ij.id_inicio DESC;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_AprobarSupervisor', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_AprobarSupervisor AS SELECT 0 AS updated');
GO
ALTER PROCEDURE dbo.SP_Inicio_AprobarSupervisor
    @IdInicio INT,
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.tbl_InicioJornadaAlturas
    SET pendiente = 0
    WHERE id_inicio = @IdInicio
      AND id_encargado = @IdSupervisor
      AND ISNULL(e_eliminado,0)=0;
    SELECT @@ROWCOUNT AS updated;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_RechazarSupervisor', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_RechazarSupervisor AS SELECT 0 AS updated');
GO
ALTER PROCEDURE dbo.SP_Inicio_RechazarSupervisor
    @IdInicio INT,
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.tbl_InicioJornadaAlturas
    SET e_eliminado = 1
    WHERE id_inicio = @IdInicio
      AND id_encargado = @IdSupervisor
      AND ISNULL(e_eliminado,0)=0;
    SELECT @@ROWCOUNT AS updated;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_AprobarPorIdHoy', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_AprobarPorIdHoy AS SELECT 0 AS updated');
GO
ALTER PROCEDURE dbo.SP_Inicio_AprobarPorIdHoy
    @IdInicio INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.tbl_InicioJornadaAlturas
    SET pendiente = 0
    WHERE id_inicio = @IdInicio
      AND ISNULL(e_eliminado,0)=0
      AND CAST(fecha_registro AS DATE)=CAST(GETDATE() AS DATE);
    SELECT @@ROWCOUNT AS updated;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_RechazarPorIdHoy', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_RechazarPorIdHoy AS SELECT 0 AS updated');
GO
ALTER PROCEDURE dbo.SP_Inicio_RechazarPorIdHoy
    @IdInicio INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.tbl_InicioJornadaAlturas
    SET e_eliminado = 1
    WHERE id_inicio = @IdInicio
      AND ISNULL(e_eliminado,0)=0
      AND CAST(fecha_registro AS DATE)=CAST(GETDATE() AS DATE);
    SELECT @@ROWCOUNT AS updated;
END
GO

IF OBJECT_ID('dbo.SP_Usuario_ListarActivosBasico', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Usuario_ListarActivosBasico AS SELECT TOP 0 1 AS idUsuario');
GO
ALTER PROCEDURE dbo.SP_Usuario_ListarActivosBasico
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id_Usuario AS idUsuario, Nombre AS nombre
    FROM dbo.tbl_Usuario
    WHERE ISNULL(E_Eliminado,0)=0;
END
GO

IF OBJECT_ID('dbo.SP_Tecnico_ObtenerNombrePorId', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Tecnico_ObtenerNombrePorId AS SELECT CAST(NULL AS NVARCHAR(200)) AS Nombre');
GO
ALTER PROCEDURE dbo.SP_Tecnico_ObtenerNombrePorId
    @IdTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 Nombre
    FROM (
        SELECT v.Nombre, 1 AS orden
        FROM dbo.tbl_Vendedor v
        WHERE v.Id_Vendedor = @IdTecnico
          AND ISNULL(v.E_Eliminado,0)=0
        UNION ALL
        SELECT u.Nombre, 2 AS orden
        FROM dbo.tbl_UsuarioTecnico ut
        LEFT JOIN dbo.tbl_Usuario u ON u.Id_Usuario = ut.id_Usuario
        WHERE ut.id_Usuario = @IdTecnico
          AND ISNULL(ut.e_eliminado,0)=0
        UNION ALL
        SELECT u2.Nombre, 3 AS orden
        FROM dbo.tbl_Usuario u2
        WHERE u2.Id_Usuario = @IdTecnico
          AND ISNULL(u2.E_Eliminado,0)=0
    ) q
    WHERE q.Nombre IS NOT NULL AND LTRIM(RTRIM(q.Nombre)) <> ''
    ORDER BY q.orden;
END
GO

