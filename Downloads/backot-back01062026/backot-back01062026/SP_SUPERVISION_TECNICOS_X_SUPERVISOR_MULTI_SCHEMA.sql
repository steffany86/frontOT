IF OBJECT_ID(N'dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla', N'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla;
GO
CREATE PROCEDURE dbo.spx_ListarTecnicosSupervisorConformacionCuadrilla
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
    SET @sql = N'';

    IF OBJECT_ID(N'dbo.tbl_ConformacionCuadrillaDiario', N'U') IS NOT NULL
    BEGIN
        IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario','id_encargado') IS NOT NULL
           AND COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario','id_tecnico') IS NOT NULL
        BEGIN
            SET @sql = @sql + N'
            SELECT id_encargado AS idSupervisor, id_tecnico AS idTecnico
            FROM dbo.tbl_ConformacionCuadrillaDiario
            WHERE ISNULL(e_eliminado,0)=0
            ';

            IF COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiario','id_tecnico_auxiliar') IS NOT NULL
            BEGIN
                SET @sql = @sql + N'
                UNION ALL
                SELECT id_encargado AS idSupervisor, id_tecnico_auxiliar AS idTecnico
                FROM dbo.tbl_ConformacionCuadrillaDiario
                WHERE ISNULL(e_eliminado,0)=0
                ';
            END
        END
    END;

    IF OBJECT_ID(N'dbo.tbl_ConformacionCuadrillaDiarioWeb', N'U') IS NOT NULL
    BEGIN
        DECLARE @supWeb SYSNAME;
        DECLARE @auxWeb SYSNAME;

        SET @supWeb = CASE
            WHEN COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiarioWeb','id_encargado') IS NOT NULL THEN 'id_encargado'
            WHEN COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiarioWeb','idEncargado') IS NOT NULL THEN 'idEncargado'
            ELSE NULL END;

        SET @auxWeb = CASE
            WHEN COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiarioWeb','id_tecnico_auxiliar') IS NOT NULL THEN 'id_tecnico_auxiliar'
            WHEN COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiarioWeb','id_tecnicoAuxiliar') IS NOT NULL THEN 'id_tecnicoAuxiliar'
            ELSE NULL END;

        IF @supWeb IS NOT NULL AND COL_LENGTH('dbo.tbl_ConformacionCuadrillaDiarioWeb','id_tecnico') IS NOT NULL
        BEGIN
            SET @sql = @sql + CASE WHEN LEN(@sql) > 0 THEN N' UNION ALL ' ELSE N'' END +
            N'SELECT ' + QUOTENAME(@supWeb) + N' AS idSupervisor, id_tecnico AS idTecnico
              FROM dbo.tbl_ConformacionCuadrillaDiarioWeb
              WHERE ISNULL(e_eliminado,0)=0';

            IF @auxWeb IS NOT NULL
            BEGIN
                SET @sql = @sql + N'
                UNION ALL
                SELECT ' + QUOTENAME(@supWeb) + N' AS idSupervisor, ' + QUOTENAME(@auxWeb) + N' AS idTecnico
                FROM dbo.tbl_ConformacionCuadrillaDiarioWeb
                WHERE ISNULL(e_eliminado,0)=0';
            END
        END
    END;

    IF LEN(@sql) = 0
    BEGIN
        SELECT CAST(NULL AS INT) AS idTecnico, CAST(NULL AS NVARCHAR(200)) AS tecnico
        WHERE 1 = 0;
        RETURN;
    END;

    SET @sql = N'
    ;WITH base AS (
      ' + @sql + N'
    ),
    filtrada AS (
      SELECT DISTINCT idTecnico
      FROM base
      WHERE idSupervisor = @IdSupervisor
        AND idTecnico IS NOT NULL
        AND idTecnico > 0
    )
    SELECT f.idTecnico,
           COALESCE(
               NULLIF(LTRIM(RTRIM(vd.Nombre)), ''''),
               NULLIF(LTRIM(RTRIM(vu.Nombre)), ''''),
               NULLIF(LTRIM(RTRIM(u.Nombre)), ''''),
               ''Tecnico '' + CONVERT(NVARCHAR(20), f.idTecnico)
           ) AS tecnico
    FROM filtrada f
    LEFT JOIN dbo.tbl_Vendedor vd
      ON vd.Id_Vendedor = f.idTecnico
     AND ISNULL(vd.E_Eliminado,0)=0
    LEFT JOIN dbo.tbl_UsuarioTecnico ut
      ON ut.id_Usuario = f.idTecnico
     AND ISNULL(ut.e_eliminado,0)=0
    LEFT JOIN dbo.tbl_Vendedor vu
      ON vu.Id_Vendedor = ut.id_Vendedor
     AND ISNULL(vu.E_Eliminado,0)=0
    LEFT JOIN dbo.tbl_Usuario u
      ON u.Id_Usuario = f.idTecnico
     AND ISNULL(u.E_Eliminado,0)=0
    ORDER BY tecnico, f.idTecnico;';

    EXEC sp_executesql @sql, N'@IdSupervisor INT', @IdSupervisor = @IdSupervisor;
END
GO
