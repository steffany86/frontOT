-- Consulta NPS de Daniel Carreño Rojas para Mayo 2026
-- Base de datos: BDControlOrdenes (Central)
-- Servidor: 172.16.0.13

USE BDControlOrdenes;
GO

-- Declarar variables para la consulta
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'Daniel Carreño Rojas';
DECLARE @IdSucursal INT = NULL; -- Null para todas las sucursales
DECLARE @IdSupervisor INT = NULL;
DECLARE @IdTecnico INT = NULL;
DECLARE @SupervisorNombre NVARCHAR(200) = NULL;
DECLARE @RolConsulta NVARCHAR(20) = 'ADMIN';
DECLARE @IdUsuarioSesion INT = 1;

-- Ejecutar el SP
EXEC dbo.SP_NPS_DASHBOARD_CONSULTA 
    @FechaInicio = @FechaInicio,
    @FechaFin = @FechaFin,
    @IdSucursal = @IdSucursal,
    @IdSupervisor = @IdSupervisor,
    @IdTecnico = @IdTecnico,
    @SupervisorNombre = @SupervisorNombre,
    @TecnicoNombre = @TecnicoNombre,
    @RolConsulta = @RolConsulta,
    @IdUsuarioSesion = @IdUsuarioSesion;

GO

-- Contar cuántos registros hay
DECLARE @FechaInicio DATE = '2026-05-01';
DECLARE @FechaFin DATE = '2026-05-31';
DECLARE @TecnicoNombre NVARCHAR(200) = 'Daniel Carreño Rojas';

DECLARE @Conteo INT;

;WITH base AS (
    SELECT r.*, ROW_NUMBER() OVER (PARTITION BY r.id_transaccion ORDER BY CONVERT(DATETIME, r.fecha_carga, 103) DESC, r.id_NPS_RESPUESTAS_MAKIRO DESC) rn
    FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO r
    WHERE (CONVERT(DATE, r.fecha_de_respuesta, 103) >= @FechaInicio)
      AND (CONVERT(DATE, r.fecha_de_respuesta, 103) <= @FechaFin)
      AND (UPPER(LTRIM(RTRIM(r.tecnico_nombre))) = UPPER(LTRIM(RTRIM(@TecnicoNombre))))
)
SELECT @Conteo = COUNT(*) FROM base WHERE rn=1;

SELECT 
    @Conteo AS TotalRegistrosNPS,
    @TecnicoNombre AS Tecnico,
    @FechaInicio AS FechaInicio,
    @FechaFin AS FechaFin;

GO

-- Verificar también variaciones del nombre
PRINT '=== Verificando variaciones del nombre ===';
SELECT DISTINCT tecnico_nombre, COUNT(*) AS cantidad
FROM dbo.tbl_NPS_RESPUESTAS_MAKIRO
WHERE UPPER(tecnico_nombre) LIKE '%DANIEL%CARREÑO%' 
   OR UPPER(tecnico_nombre) LIKE '%DANIEL%CARREN%'
   OR UPPER(dealer_tecnico_nombre) LIKE '%DANIEL%CARREÑO%'
GROUP BY tecnico_nombre
ORDER BY cantidad DESC;
