USE [BDControlOrdenes]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF OBJECT_ID(N'dbo.SP_TecnicosAgendaSup', N'P') IS NULL
BEGIN
    EXEC(N'CREATE PROCEDURE dbo.SP_TecnicosAgendaSup @IdUsuarioSupervisor INT AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE dbo.SP_TecnicosAgendaSup
    @IdUsuarioSupervisor INT,
    @Sucursal NVARCHAR(100) = NULL,
    @SoloHoy BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SucursalNorm NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Sucursal)), '');

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
            CAST(NULL AS NVARCHAR(200)) AS grupo,
            CAST(NULL AS NVARCHAR(100)) AS codigo,
            CAST(NULL AS NVARCHAR(100)) AS codEmpleado
        WHERE 1 = 0;
        RETURN;
    END;

    IF OBJECT_ID(N'dbo.tbl_ConformacionCuadrillaDiario', N'U') IS NULL
    BEGIN
        RAISERROR('No existe dbo.tbl_ConformacionCuadrillaDiario en BDControlOrdenes.', 16, 1);
        RETURN;
    END;

    DECLARE @ColSupervisor SYSNAME = NULL;
    DECLARE @ColTecnico SYSNAME = NULL;
    DECLARE @ColNombreTecnico SYSNAME = NULL;
    DECLARE @ColSucursal SYSNAME = NULL;
    DECLARE @ColGrupo SYSNAME = NULL;
    DECLARE @ColFecha SYSNAME = NULL;
    DECLARE @ColFechaRegistro SYSNAME = NULL;
    DECLARE @FiltroEliminado NVARCHAR(100) = N'1 = 1';
    DECLARE @FiltroSucursal NVARCHAR(300) = N'1 = 1';
    DECLARE @FiltroFecha NVARCHAR(300) = N'1 = 1';
    DECLARE @Sql NVARCHAR(MAX);

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'id_encargado') IS NOT NULL SET @ColSupervisor = N'id_encargado';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'idEncargado') IS NOT NULL SET @ColSupervisor = N'idEncargado';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'idUsuarioSupervisor') IS NOT NULL SET @ColSupervisor = N'idUsuarioSupervisor';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'id_usuarioSupervisor') IS NOT NULL SET @ColSupervisor = N'id_usuarioSupervisor';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'id_usuario_supervisor') IS NOT NULL SET @ColSupervisor = N'id_usuario_supervisor';

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'id_tecnico') IS NOT NULL SET @ColTecnico = N'id_tecnico';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'idTecnico') IS NOT NULL SET @ColTecnico = N'idTecnico';

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'tecnico') IS NOT NULL SET @ColNombreTecnico = N'tecnico';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'Tecnico') IS NOT NULL SET @ColNombreTecnico = N'Tecnico';

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'sucursal') IS NOT NULL SET @ColSucursal = N'sucursal';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'Sucursal') IS NOT NULL SET @ColSucursal = N'Sucursal';

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'grupo') IS NOT NULL SET @ColGrupo = N'grupo';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'Grupo') IS NOT NULL SET @ColGrupo = N'Grupo';

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'fecha') IS NOT NULL SET @ColFecha = N'fecha';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'Fecha') IS NOT NULL SET @ColFecha = N'Fecha';

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'fechaRegistro') IS NOT NULL SET @ColFechaRegistro = N'fechaRegistro';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'FechaRegistro') IS NOT NULL SET @ColFechaRegistro = N'FechaRegistro';

    IF @ColSupervisor IS NULL
    BEGIN
        RAISERROR('No existe columna de supervisor/encargado en tbl_ConformacionCuadrillaDiario.', 16, 1);
        RETURN;
    END;

    IF @ColTecnico IS NULL
    BEGIN
        RAISERROR('No existe columna de tecnico principal en tbl_ConformacionCuadrillaDiario.', 16, 1);
        RETURN;
    END;

    IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'e_eliminado') IS NOT NULL
        SET @FiltroEliminado = N'ISNULL(c.e_eliminado, 0) = 0';
    ELSE IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario', 'E_Eliminado') IS NOT NULL
        SET @FiltroEliminado = N'ISNULL(c.E_Eliminado, 0) = 0';

    IF @ColSucursal IS NOT NULL
        SET @FiltroSucursal = N'(@SucursalNorm IS NULL OR LTRIM(RTRIM(ISNULL(c.' + QUOTENAME(@ColSucursal) + N', ''''))) = @SucursalNorm)';

    IF @ColFecha IS NOT NULL
        SET @FiltroFecha = N'(@SoloHoy = 0 OR CONVERT(date, c.' + QUOTENAME(@ColFecha) + N') = CONVERT(date, GETDATE()))';

    SET @Sql = N'
        ;WITH Fuente AS (
            SELECT
                CAST(c.' + QUOTENAME(@ColTecnico) + N' AS INT) AS idTecnico,' +
                CASE WHEN @ColNombreTecnico IS NULL THEN N'
                CAST(NULL AS NVARCHAR(250)) AS tecnico,'
                ELSE N'
                CAST(c.' + QUOTENAME(@ColNombreTecnico) + N' AS NVARCHAR(250)) AS tecnico,' END + N'
                CAST(c.' + QUOTENAME(@ColSupervisor) + N' AS INT) AS id_encargado,' +
                CASE WHEN @ColSucursal IS NULL THEN N'
                CAST(NULL AS NVARCHAR(100)) AS sucursal,'
                ELSE N'
                CAST(c.' + QUOTENAME(@ColSucursal) + N' AS NVARCHAR(100)) AS sucursal,' END +
                CASE WHEN @ColGrupo IS NULL THEN N'
                CAST(NULL AS NVARCHAR(200)) AS grupo,'
                ELSE N'
                CAST(c.' + QUOTENAME(@ColGrupo) + N' AS NVARCHAR(200)) AS grupo,' END +
                N'
                CAST(v.CodEmpleado AS NVARCHAR(100)) AS codigo,' +
                CASE WHEN @ColFecha IS NULL THEN N'
                CAST(NULL AS DATETIME) AS fechaOrden,'
                ELSE N'
                CAST(c.' + QUOTENAME(@ColFecha) + N' AS DATETIME) AS fechaOrden,' END +
                CASE WHEN @ColFechaRegistro IS NULL THEN N'
                CAST(NULL AS DATETIME) AS fechaRegistroOrden'
                ELSE N'
                CAST(c.' + QUOTENAME(@ColFechaRegistro) + N' AS DATETIME) AS fechaRegistroOrden' END + N'
            FROM dbo.tbl_ConformacionCuadrillaDiario c
            LEFT JOIN dbo.tbl_Vendedor v
                ON v.Id_Vendedor = c.' + QUOTENAME(@ColTecnico) + N'
               AND ISNULL(v.E_Eliminado, 0) = 0
            WHERE ' + @FiltroEliminado + N'
              AND CAST(c.' + QUOTENAME(@ColSupervisor) + N' AS INT) = @IdUsuarioSupervisor
              AND c.' + QUOTENAME(@ColTecnico) + N' IS NOT NULL
              AND CAST(c.' + QUOTENAME(@ColTecnico) + N' AS INT) > 0
              AND ' + @FiltroFecha + N'
              AND ' + @FiltroSucursal + N'
        ),
        UltimoPorGrupo AS (
            SELECT
                f.*,
                ROW_NUMBER() OVER (
                    PARTITION BY COALESCE(NULLIF(LTRIM(RTRIM(f.grupo)), ''''), ''TEC_'' + CAST(f.idTecnico AS NVARCHAR(20)))
                    ORDER BY
                        ISNULL(f.fechaOrden, CAST(''19000101'' AS DATETIME)) DESC,
                        ISNULL(f.fechaRegistroOrden, CAST(''19000101'' AS DATETIME)) DESC,
                        f.idTecnico DESC
                ) AS rnGrupo
            FROM Fuente f
        ),
        TecnicosUnicos AS (
            SELECT
                u.*,
                ROW_NUMBER() OVER (
                    PARTITION BY u.idTecnico
                    ORDER BY
                        CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(u.tecnico, ''''))), '''') IS NULL THEN 1 ELSE 0 END,
                        ISNULL(u.fechaOrden, CAST(''19000101'' AS DATETIME)) DESC,
                        ISNULL(u.fechaRegistroOrden, CAST(''19000101'' AS DATETIME)) DESC,
                        u.grupo
                ) AS rnTecnico
            FROM UltimoPorGrupo u
            WHERE @SoloHoy = 1 OR u.rnGrupo = 1
        )
        SELECT
            tu.idTecnico,
            tu.idTecnico AS id_tecnico,
            COALESCE(NULLIF(LTRIM(RTRIM(tu.tecnico)), ''''), ''Tecnico '' + CAST(tu.idTecnico AS NVARCHAR(20))) AS tecnico,
            COALESCE(NULLIF(LTRIM(RTRIM(tu.tecnico)), ''''), ''Tecnico '' + CAST(tu.idTecnico AS NVARCHAR(20))) AS nombre,
            tu.id_encargado AS idSupervisor,
            tu.id_encargado,
            tu.sucursal,
            tu.grupo,
            tu.codigo,
            tu.codigo AS codEmpleado
        FROM TecnicosUnicos tu
        WHERE tu.rnTecnico = 1
        ORDER BY tecnico, tu.idTecnico;';

    EXEC sp_executesql
        @Sql,
        N'@IdUsuarioSupervisor INT, @SucursalNorm NVARCHAR(100), @SoloHoy BIT',
        @IdUsuarioSupervisor = @IdUsuarioSupervisor,
        @SucursalNorm = @SucursalNorm,
        @SoloHoy = @SoloHoy;
END
GO

-- Ejemplo:
-- EXEC dbo.SP_TecnicosAgendaSup @IdUsuarioSupervisor = 86, @Sucursal = 'Santa_Cruz', @SoloHoy = 1;
