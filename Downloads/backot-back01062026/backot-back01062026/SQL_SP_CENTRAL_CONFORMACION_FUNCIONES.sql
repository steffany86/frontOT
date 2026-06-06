IF OBJECT_ID(N'dbo.spx_Central_ObtenerTecnicosPorSupervisorConformacion', N'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_Central_ObtenerTecnicosPorSupervisorConformacion;
GO
CREATE PROCEDURE dbo.spx_Central_ObtenerTecnicosPorSupervisorConformacion
    @IdSupervisor INT,
    @Sucursal NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Suc NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Sucursal)), '');

    ;WITH base AS (
        SELECT
            idUsuarioSupervisor AS idSupervisor,
            id_tecnico AS idTecnico,
            sucursal,
            fecha,
            e_eliminado
        FROM dbo.tbl_ConformacionCuadrillaDiario

        UNION ALL

        SELECT
            idUsuarioSupervisor AS idSupervisor,
            id_tecnicoAuxiliar AS idTecnico,
            sucursal,
            fecha,
            e_eliminado
        FROM dbo.tbl_ConformacionCuadrillaDiario
    )
    SELECT DISTINCT
        CAST(b.idTecnico AS INT) AS idTecnico
    FROM base b
    WHERE b.idSupervisor = @IdSupervisor
      AND b.idTecnico IS NOT NULL
      AND ISNULL(b.e_eliminado,0) = 0
      AND CONVERT(date, b.fecha) = CONVERT(date, GETDATE())
      AND (
            @Suc IS NULL
            OR LTRIM(RTRIM(ISNULL(b.sucursal, ''))) = @Suc
          )
    ORDER BY CAST(b.idTecnico AS INT);
END
GO

IF OBJECT_ID(N'dbo.spx_Central_BuscarSupervisorPorTecnicoConformacion', N'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_Central_BuscarSupervisorPorTecnicoConformacion;
GO
CREATE PROCEDURE dbo.spx_Central_BuscarSupervisorPorTecnicoConformacion
    @Sucursal NVARCHAR(100),
    @IdTecnico INT = NULL,
    @NombreTecnico NVARCHAR(250) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Suc NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Sucursal)), '');
    DECLARE @Nom NVARCHAR(250) = LOWER(LTRIM(RTRIM(ISNULL(@NombreTecnico, ''))));

    SELECT TOP 1
        CAST(c.idUsuarioSupervisor AS INT) AS idEncargado,
        CAST(c.supervisorACargo AS NVARCHAR(200)) AS encargado,
        CAST(c.id AS INT) AS idConformacion,
        c.fecha,
        c.fechaRegistro
    FROM dbo.tbl_ConformacionCuadrillaDiario c
    WHERE ISNULL(c.e_eliminado,0) = 0
      AND (@Suc IS NULL OR LTRIM(RTRIM(ISNULL(c.sucursal,''))) = @Suc)
      AND (
            (@IdTecnico IS NOT NULL AND (@IdTecnico = c.id_tecnico OR @IdTecnico = c.id_tecnicoAuxiliar))
            OR (@Nom <> '' AND (
                LOWER(LTRIM(RTRIM(ISNULL(c.tecnico,'')))) = @Nom
                OR LOWER(LTRIM(RTRIM(ISNULL(c.auxiliar,'')))) = @Nom
            ))
          )
    ORDER BY
      CASE WHEN CAST(c.fecha AS DATE) = CAST(GETDATE() AS DATE) THEN 0 ELSE 1 END,
      ISNULL(c.fecha, '19000101') DESC,
      ISNULL(c.fechaRegistro, '19000101') DESC,
      c.id DESC;
END
GO

IF OBJECT_ID(N'dbo.spx_Central_ActualizarSupervisorConformacion', N'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_Central_ActualizarSupervisorConformacion;
GO
CREATE PROCEDURE dbo.spx_Central_ActualizarSupervisorConformacion
    @Sucursal NVARCHAR(100),
    @Grupo NVARCHAR(200),
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Suc NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Sucursal)), '');
    DECLARE @Grp NVARCHAR(200) = NULLIF(LTRIM(RTRIM(@Grupo)), '');

    IF @Grp IS NULL
    BEGIN
        SELECT 0 AS actualizados;
        RETURN;
    END

    UPDATE dbo.tbl_ConformacionCuadrillaDiario
    SET idUsuarioSupervisor = @IdUsuarioSupervisor,
        supervisorACargo = @SupervisorACargo
    WHERE ISNULL(e_eliminado,0) = 0
      AND LTRIM(RTRIM(ISNULL(grupo,''))) = @Grp
      AND (@Suc IS NULL OR LTRIM(RTRIM(ISNULL(sucursal,''))) = @Suc);

    SELECT @@ROWCOUNT AS actualizados;
END
GO
