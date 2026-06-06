IF OBJECT_ID(N'dbo.SP_TecnicosAgendaSup', N'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_TecnicosAgendaSup;
GO

CREATE PROCEDURE dbo.SP_TecnicosAgendaSup
    @IdUsuarioSupervisor INT,
    @Sucursal NVARCHAR(100) = NULL,
    @SoloHoy BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SucursalNorm NVARCHAR(100) =
        LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(@Sucursal, ''))), '_', ''), '-', ''), ' ', ''));

    IF @IdUsuarioSupervisor IS NULL OR @IdUsuarioSupervisor <= 0
    BEGIN
        SELECT
            CAST(NULL AS INT) AS idTecnico,
            CAST(NULL AS INT) AS id_tecnico,
            CAST(NULL AS NVARCHAR(250)) AS tecnico,
            CAST(NULL AS NVARCHAR(250)) AS nombre,
            CAST(NULL AS INT) AS idSupervisor,
            CAST(NULL AS INT) AS id_encargado,
            CAST(NULL AS NVARCHAR(100)) AS sucursal,
            CAST(NULL AS NVARCHAR(200)) AS grupo
        WHERE 1 = 0;
        RETURN;
    END;

    ;WITH Fuente AS (
        SELECT
            CAST(c.id_tecnico AS INT) AS idTecnico,
            CAST(c.tecnico AS NVARCHAR(250)) AS tecnico,
            CAST(c.idUsuarioSupervisor AS INT) AS idSupervisor,
            CAST(c.sucursal AS NVARCHAR(100)) AS sucursal,
            CAST(c.grupo AS NVARCHAR(200)) AS grupo,
            c.fecha,
            c.fechaRegistro,
            c.id
        FROM dbo.tbl_ConformacionCuadrillaDiario c
        WHERE ISNULL(c.e_eliminado, 0) = 0
          AND c.id_tecnico IS NOT NULL
          AND c.id_tecnico > 0
          AND c.idUsuarioSupervisor = @IdUsuarioSupervisor
          AND LTRIM(RTRIM(ISNULL(c.grupo, ''))) NOT LIKE 'GRUPO SOC[_]%'
          AND LTRIM(RTRIM(ISNULL(c.grupo, ''))) NOT LIKE 'GRUPO TERCERIZADO%'
          AND (@SoloHoy = 0 OR CONVERT(date, c.fecha) = CONVERT(date, GETDATE()))
          AND (
                @SucursalNorm = ''
                OR LOWER(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(ISNULL(c.sucursal, ''))), '_', ''), '-', ''), ' ', '')) = @SucursalNorm
              )
    ),
    TecnicosUnicos AS (
        SELECT
            f.*,
            ROW_NUMBER() OVER (
                PARTITION BY f.idTecnico
                ORDER BY
                    CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(f.tecnico, ''))), '') IS NULL THEN 1 ELSE 0 END,
                    f.fecha DESC,
                    f.fechaRegistro DESC,
                    f.id DESC
            ) AS rn
        FROM Fuente f
    )
    SELECT
        tu.idTecnico,
        tu.idTecnico AS id_tecnico,
        COALESCE(NULLIF(LTRIM(RTRIM(tu.tecnico)), ''), 'Tecnico ' + CONVERT(NVARCHAR(20), tu.idTecnico)) AS tecnico,
        COALESCE(NULLIF(LTRIM(RTRIM(tu.tecnico)), ''), 'Tecnico ' + CONVERT(NVARCHAR(20), tu.idTecnico)) AS nombre,
        tu.idSupervisor,
        tu.idSupervisor AS id_encargado,
        tu.sucursal,
        tu.grupo
    FROM TecnicosUnicos tu
    WHERE tu.rn = 1
    ORDER BY tecnico, tu.idTecnico;
END
GO
