SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/*
  Reglas pedidas:
  1) Inicio de jornada se aprueba por supervisor de ConformacionCuadrillaDiario.
  2) Un tecnico no puede quedar en 2 supervisores el mismo dia.
  3) Un tecnico no puede quedar en 2 grupos el mismo dia.
*/

IF OBJECT_ID('dbo.trg_ConformacionCuadrillaDiario_UnicidadTecnico', 'TR') IS NOT NULL
BEGIN
    DROP TRIGGER dbo.trg_ConformacionCuadrillaDiario_UnicidadTecnico;
END
GO

CREATE TRIGGER dbo.trg_ConformacionCuadrillaDiario_UnicidadTecnico
ON dbo.tbl_ConformacionCuadrillaDiario
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @hayViolacion INT = 0;

    ;WITH afectados AS (
        SELECT DISTINCT
            i.id_tecnico,
            CAST(ISNULL(i.fecha, i.fechaRegistro) AS DATE) AS fecha_dia
        FROM inserted i
        WHERE i.id_tecnico IS NOT NULL
    ),
    validacion AS (
        SELECT
            c.id_tecnico,
            CAST(ISNULL(c.fecha, c.fechaRegistro) AS DATE) AS fecha_dia,
            COUNT(DISTINCT ISNULL(LTRIM(RTRIM(CAST(c.grupo AS NVARCHAR(200)))), 'SIN_GRUPO')) AS grupos_distintos,
            COUNT(DISTINCT CAST(ISNULL(c.idUsuarioSupervisor, -1) AS INT)) AS supervisores_distintos
        FROM dbo.tbl_ConformacionCuadrillaDiario c
        INNER JOIN afectados a
            ON a.id_tecnico = c.id_tecnico
           AND a.fecha_dia = CAST(ISNULL(c.fecha, c.fechaRegistro) AS DATE)
        WHERE ISNULL(c.e_eliminado, 0) = 0
        GROUP BY
            c.id_tecnico,
            CAST(ISNULL(c.fecha, c.fechaRegistro) AS DATE)
    )
    SELECT @hayViolacion = COUNT(1)
    FROM validacion
    WHERE grupos_distintos > 1 OR supervisores_distintos > 1;

    IF @hayViolacion > 0
    BEGIN
        RAISERROR('Regla de conformacion: un tecnico no puede pertenecer a mas de un grupo o supervisor en el mismo dia.', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END
END
GO
