/*
  Base de SP para modulo NPS
  Reglas:
  - El backend solo llama SP con prefijo SP_NPS_
  - Ajustar nombres de columnas/tablas segun esquema real de cada sucursal
*/

-- 1) Supervisores por sucursal (DB de sucursal)
IF OBJECT_ID('dbo.SP_NPS_LISTAR_SUPERVISORES_SUCURSAL', 'P') IS NULL
EXEC('CREATE PROCEDURE dbo.SP_NPS_LISTAR_SUPERVISORES_SUCURSAL AS BEGIN SET NOCOUNT ON; SELECT 1 AS stub; END');
GO
ALTER PROCEDURE dbo.SP_NPS_LISTAR_SUPERVISORES_SUCURSAL
  @IdSucursal INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT DISTINCT
    cc.id_usuario_supervisor AS idSupervisor,
    ISNULL(u.Nombre, cc.supervisor_a_cargo) AS supervisor
  FROM dbo.tbl_ConformacionCuadrillaDiario cc
  LEFT JOIN dbo.tbl_Usuario u ON u.Id_Usuario = cc.id_usuario_supervisor
  WHERE ISNULL(cc.e_eliminado, 0) = 0
    AND (@IdSucursal IS NULL OR cc.id_sucursal = @IdSucursal)
  ORDER BY supervisor;
END
GO

-- 2) Tecnicos por supervisor (DB de sucursal)
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
    COALESCE(NULLIF(LTRIM(RTRIM(ut.Nombre)), ''), NULLIF(LTRIM(RTRIM(b.tecnico)), ''), 'Tecnico ' + CONVERT(NVARCHAR(20), b.idTecnico)) AS tecnico
  FROM base b
  LEFT JOIN dbo.tbl_UsuarioTecnico ut ON ut.Id_Tecnico = b.idTecnico
  WHERE b.idTecnico IS NOT NULL
  ORDER BY tecnico;
END
GO

-- 3) Mapeo tecnico->supervisor (BDControlOrdenes)
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
    idUsuarioSupervisor AS idSupervisor,
    id_tecnico AS idTecnico
  FROM dbo.tbl_ConformacionCuadrillaDiario
  WHERE (id_tecnico = @IdTecnico OR id_tecnicoAuxiliar = @IdTecnico)
    AND ISNULL(e_eliminado,0) = 0
  ORDER BY id DESC;
END
GO

-- 4) Dashboard NPS (BDControlOrdenes)
IF OBJECT_ID('dbo.SP_NPS_DASHBOARD_CONSULTA', 'P') IS NULL
EXEC('CREATE PROCEDURE dbo.SP_NPS_DASHBOARD_CONSULTA AS BEGIN SET NOCOUNT ON; SELECT 1 AS stub; END');
GO
ALTER PROCEDURE dbo.SP_NPS_DASHBOARD_CONSULTA
  @FechaInicio DATE = NULL,
  @FechaFin DATE = NULL,
  @IdSucursal INT = NULL,
  @IdSupervisor INT = NULL,
  @IdTecnico INT = NULL,
  @RolConsulta NVARCHAR(20),
  @IdUsuarioSesion INT
AS
BEGIN
  SET NOCOUNT ON;

  ;WITH base AS (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE (@FechaInicio IS NULL OR CONVERT(DATE, r.fecha_de_respuesta, 103) >= @FechaInicio)
      AND (@FechaFin IS NULL OR CONVERT(DATE, r.fecha_de_respuesta, 103) <= @FechaFin)
      AND (@IdTecnico IS NULL OR CONVERT(INT, r.tecnicoid) = @IdTecnico)
      AND (@IdSupervisor IS NULL OR EXISTS (
            SELECT 1
            FROM dbo.tbl_ConformacionCuadrillaDiario cc
            WHERE (cc.id_tecnico = CONVERT(INT, r.tecnicoid) OR cc.id_tecnicoAuxiliar = CONVERT(INT, r.tecnicoid))
              AND cc.idUsuarioSupervisor = @IdSupervisor
              AND ISNULL(cc.e_eliminado,0)=0
      ))
  )
  SELECT *
  FROM base
  WHERE rn = 1;
END
GO
