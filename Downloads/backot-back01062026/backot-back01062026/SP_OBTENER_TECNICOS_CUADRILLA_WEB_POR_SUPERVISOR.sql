SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/*
  SP: dbo.spx_ObtenerTecnicosConformacionCuadrillaWebPorSupervisor
  Objetivo:
    - Mantener la misma salida base de dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb
    - Filtrar tecnicos a solo los que pertenecen a grupos asignados al supervisor (@IdUsuarioSupervisor)

  Notas:
    - Usa tablas de grupos:
        dbo.tbl_GrupoSup (supervisor -> grupo)
        dbo.tbl_DetalleGrupo (grupo -> tecnico)
    - Resuelve el vinculo tecnico->vendedor via tabla usuario_tecnico disponible en la BD
      (dbo.tbl_usuario_tecnico / dbo.tbl_UsuarioTecnico / dbo.tbl_Usuario_Tecnico).
*/

IF OBJECT_ID('dbo.spx_ObtenerTecnicosConformacionCuadrillaWebPorSupervisor', 'P') IS NULL
BEGIN
    EXEC('CREATE PROC dbo.spx_ObtenerTecnicosConformacionCuadrillaWebPorSupervisor @IdUsuarioSupervisor INT AS BEGIN SET NOCOUNT ON; SELECT 1 AS placeholder; END');
END
GO

ALTER PROC dbo.spx_ObtenerTecnicosConformacionCuadrillaWebPorSupervisor
    @IdUsuarioSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdUsuarioSupervisor IS NULL OR @IdUsuarioSupervisor <= 0
    BEGIN
        RAISERROR('IdUsuarioSupervisor es requerido.', 16, 1);
        RETURN;
    END

    DECLARE @TablaTecnico SYSNAME = NULL;
    DECLARE @ColPkTecnico SYSNAME = NULL;
    DECLARE @ColIdVendedor SYSNAME = NULL;
    DECLARE @Sql NVARCHAR(MAX);

    IF OBJECT_ID('dbo.tbl_usuario_tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_usuario_tecnico';
    ELSE IF OBJECT_ID('dbo.tbl_UsuarioTecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_UsuarioTecnico';
    ELSE IF OBJECT_ID('dbo.tbl_Usuario_Tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_Usuario_Tecnico';

    IF @TablaTecnico IS NULL
    BEGIN
        RAISERROR('No existe tabla de usuario tecnico en esta BD.', 16, 1);
        RETURN;
    END

    IF COL_LENGTH(@TablaTecnico, 'id_usuario_tecnico') IS NOT NULL SET @ColPkTecnico = 'id_usuario_tecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'idUsuarioTecnico') IS NOT NULL SET @ColPkTecnico = 'idUsuarioTecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'Id_Usuario_Tecnico') IS NOT NULL SET @ColPkTecnico = 'Id_Usuario_Tecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'id') IS NOT NULL SET @ColPkTecnico = 'id';

    IF COL_LENGTH(@TablaTecnico, 'id_vendedor') IS NOT NULL SET @ColIdVendedor = 'id_vendedor';
    ELSE IF COL_LENGTH(@TablaTecnico, 'id_Vendedor') IS NOT NULL SET @ColIdVendedor = 'id_Vendedor';

    IF @ColPkTecnico IS NULL OR @ColIdVendedor IS NULL
    BEGIN
        RAISERROR('No se encontraron columnas compatibles en tabla usuario tecnico (PK / id_vendedor).', 16, 1);
        RETURN;
    END

    SET @Sql = N'
        ;WITH TecnicosDelSupervisor AS (
            SELECT DISTINCT dg.id_usuario_tecnico
            FROM dbo.tbl_GrupoSup gs
            INNER JOIN dbo.tbl_DetalleGrupo dg
                ON dg.id_grupo = gs.id_grupo
            INNER JOIN dbo.tbl_Grupo g
                ON g.id_grupo = gs.id_grupo
            WHERE gs.id_usuario = @IdUsuarioSupervisor
              AND ISNULL(g.e_eliminado, 0) = 0
        ),
        TecnicosResueltos AS (
            -- Caso 1: detalle_grupo guarda PK de tabla usuario_tecnico
            SELECT DISTINCT ut.' + QUOTENAME(@ColIdVendedor) + N' AS id_vendedor
            FROM TecnicosDelSupervisor ts
            INNER JOIN ' + @TablaTecnico + N' ut
                ON ut.' + QUOTENAME(@ColPkTecnico) + N' = ts.id_usuario_tecnico
            WHERE (COL_LENGTH(''' + @TablaTecnico + N''', ''e_eliminado'') IS NULL OR ISNULL(ut.e_eliminado, 0) = 0)
              AND ut.' + QUOTENAME(@ColIdVendedor) + N' IS NOT NULL

            UNION

            -- Caso 2: detalle_grupo guarda id_vendedor directamente (legacy)
            SELECT DISTINCT ut.' + QUOTENAME(@ColIdVendedor) + N' AS id_vendedor
            FROM TecnicosDelSupervisor ts
            INNER JOIN ' + @TablaTecnico + N' ut
                ON ut.' + QUOTENAME(@ColIdVendedor) + N' = ts.id_usuario_tecnico
            WHERE (COL_LENGTH(''' + @TablaTecnico + N''', ''e_eliminado'') IS NULL OR ISNULL(ut.e_eliminado, 0) = 0)
              AND ut.' + QUOTENAME(@ColIdVendedor) + N' IS NOT NULL

            UNION

            -- Caso 3: fallback directo a vendedor
            SELECT DISTINCT ts.id_usuario_tecnico AS id_vendedor
            FROM TecnicosDelSupervisor ts
            WHERE ts.id_usuario_tecnico IS NOT NULL
        )
        SELECT
            v.Id_Vendedor AS id_tecnico,
            v.Nombre AS tecnico,
            v.CodEmpleado AS cod_empleado,
            v.CuentaSF AS cuenta_sf,
            v.SalesForce AS salesforce,
            v.Habilidad AS habilidad,
            v.Vehiculo AS vehiculo,
            ruta.Id_Ruta AS id_ruta,
            ruta.Nombre AS grupo,
            ruta.BodegaTigo AS almacen,
            ruta.BodegaTigo AS grupoDigitacion,
            v.*
        FROM TecnicosResueltos tr
        INNER JOIN dbo.tbl_Vendedor v
            ON v.Id_Vendedor = tr.id_vendedor
        OUTER APPLY (
            SELECT TOP 1 r.Id_Ruta, r.Nombre, r.BodegaTigo
            FROM dbo.tbl_Ruta r
            WHERE r.Id_Vendedor = v.Id_Vendedor
              AND ISNULL(r.E_Eliminado, 0) = 0
            ORDER BY r.Id_Ruta
        ) ruta
        WHERE v.E_Eliminado = 0
        ORDER BY v.Nombre;';

    EXEC sp_executesql
        @Sql,
        N'@IdUsuarioSupervisor INT',
        @IdUsuarioSupervisor = @IdUsuarioSupervisor;
END
GO

/*
-- Ejemplo de uso:
EXEC dbo.spx_ObtenerTecnicosConformacionCuadrillaWebPorSupervisor @IdUsuarioSupervisor = 123;
*/
