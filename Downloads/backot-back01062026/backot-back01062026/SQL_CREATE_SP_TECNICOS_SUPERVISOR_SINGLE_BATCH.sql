IF OBJECT_ID(N'dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla', N'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla;

DECLARE @createSql NVARCHAR(MAX);
SET @createSql = N'CREATE PROCEDURE dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdSupervisor IS NULL OR @IdSupervisor <= 0
    BEGIN
        SELECT CAST(NULL AS INT) AS idTecnico, CAST(NULL AS NVARCHAR(200)) AS tecnico
        WHERE 1 = 0;
        RETURN;
    END;

    DECLARE @sql NVARCHAR(MAX);
    SET @sql = N'''';

    IF OBJECT_ID(N''dbo.tbl_ConformacionCuadrillaDiario'', N''U'') IS NOT NULL
    BEGIN
        SET @sql = @sql + N''
        SELECT id_encargado AS idSupervisor, id_tecnico AS idTecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario
        WHERE ISNULL(e_eliminado,0)=0
        UNION ALL
        SELECT id_encargado AS idSupervisor, id_tecnico_auxiliar AS idTecnico
        FROM dbo.tbl_ConformacionCuadrillaDiario
        WHERE ISNULL(e_eliminado,0)=0
        '';
    END;

    IF OBJECT_ID(N''dbo.tbl_ConformacionCuadrillaDiarioWeb'', N''U'') IS NOT NULL
    BEGIN
        SET @sql = @sql + CASE WHEN LEN(@sql) > 0 THEN N'' UNION ALL '' ELSE N'''' END + N''
        SELECT id_encargado AS idSupervisor, id_tecnico AS idTecnico
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb
        WHERE ISNULL(e_eliminado,0)=0
        UNION ALL
        SELECT id_encargado AS idSupervisor, id_tecnico_auxiliar AS idTecnico
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb
        WHERE ISNULL(e_eliminado,0)=0
        '';
    END;

    IF LEN(@sql) = 0
    BEGIN
        SELECT CAST(NULL AS INT) AS idTecnico, CAST(NULL AS NVARCHAR(200)) AS tecnico
        WHERE 1 = 0;
        RETURN;
    END;

    SET @sql = N''
    ;WITH base AS (
      '' + @sql + N''
    ),
    filtrada AS (
      SELECT DISTINCT idTecnico
      FROM base
      WHERE idSupervisor = @IdSupervisor
        AND idTecnico IS NOT NULL
    )
    SELECT f.idTecnico,
           COALESCE(NULLIF(LTRIM(RTRIM(u.Nombre)), ''''''''), ''''Tecnico '''' + CONVERT(NVARCHAR(20), f.idTecnico)) AS tecnico
    FROM filtrada f
    LEFT JOIN dbo.tbl_Usuario u
      ON u.Id_Usuario = f.idTecnico
    ORDER BY tecnico, f.idTecnico;'';

    EXEC sp_executesql @sql, N''@IdSupervisor INT'', @IdSupervisor = @IdSupervisor;
END';

EXEC(@createSql);
