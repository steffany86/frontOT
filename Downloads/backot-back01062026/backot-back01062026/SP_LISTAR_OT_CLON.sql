/*
    SP CLON: listarOTClon
    Objetivo:
    - Clonar la logica de spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO
    - Aplicar filtros de rol/tecnico/estado dentro del SP
    - Evitar tabla temporal fisica compartida y devolver dataset directo
*/

IF OBJECT_ID('dbo.listarOTClon', 'P') IS NOT NULL
    DROP PROCEDURE dbo.listarOTClon;
GO

CREATE PROCEDURE dbo.listarOTClon
    @FechaConsulta DATE,
    @Rol NVARCHAR(100),
    @Tecnico NVARCHAR(300) = NULL,
    @Estados NVARCHAR(MAX) = NULL,      -- CSV: EJECUTADA,PENDIENTE,...
    @BuscarTecnico NVARCHAR(300) = NULL -- Para rol Sistemas/Admin (busqueda tipo contiene)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RolNorm NVARCHAR(100) = LOWER(LTRIM(RTRIM(ISNULL(@Rol, ''))));
    DECLARE @TecnicoNorm NVARCHAR(300) = LTRIM(RTRIM(ISNULL(@Tecnico, '')));
    DECLARE @BuscarTecnicoNorm NVARCHAR(300) = LTRIM(RTRIM(ISNULL(@BuscarTecnico, '')));
    DECLARE @FiltroTecnicoLike NVARCHAR(300) = '';

    DECLARE @EsAdmin BIT = CASE
        WHEN @RolNorm IN ('sistemas', 'admin', 'administrador') THEN 1
        ELSE 0
    END;

    DECLARE @EsTecnico BIT = CASE
        WHEN @RolNorm LIKE '%tecnico%' OR @RolNorm = 'tec' OR @RolNorm LIKE '%tech%' THEN 1
        ELSE 0
    END;

    -- Regla: tecnico solo puede ver sus OT.
    IF @EsTecnico = 1 AND @TecnicoNorm = ''
    BEGIN
        RAISERROR('Para rol tecnico debe enviar @Tecnico.', 16, 1);
        RETURN;
    END;

    -- Para admin, prioriza texto de busqueda; si no llega, usa @Tecnico.
    IF @EsAdmin = 1
        SET @FiltroTecnicoLike = CASE
            WHEN @BuscarTecnicoNorm <> '' THEN @BuscarTecnicoNorm
            ELSE @TecnicoNorm
        END;
    ELSE
        SET @FiltroTecnicoLike = @TecnicoNorm;

    DECLARE @EstadosFiltro TABLE (
        estado NVARCHAR(200) NOT NULL PRIMARY KEY
    );

    -- Parse CSV de estados (compatible con versiones sin STRING_SPLIT).
    IF LTRIM(RTRIM(ISNULL(@Estados, ''))) <> ''
    BEGIN
        DECLARE @EstadosXml XML;
        DECLARE @EstadosClean NVARCHAR(MAX);

        SET @EstadosClean = REPLACE(REPLACE(LTRIM(RTRIM(@Estados)), ';', ','), '|', ',');
        SET @EstadosXml = CAST('<x><i>' + REPLACE((SELECT @EstadosClean FOR XML PATH('')), ',', '</i><i>') + '</i></x>' AS XML);

        INSERT INTO @EstadosFiltro (estado)
        SELECT DISTINCT UPPER(LTRIM(RTRIM(T.C.value('.', 'nvarchar(200)'))))
        FROM @EstadosXml.nodes('/x/i') T(C)
        WHERE LTRIM(RTRIM(T.C.value('.', 'nvarchar(200)'))) <> '';
    END;

    ;WITH Datos AS
    (
        SELECT
            B.cliente_nro,
            B.wo_external_id,
            B.inicio_agendado,
            B.estado,
            CONVERT(DATETIME, B.fecha_carga, 103) AS fecha_carga,
            CASE
                WHEN T.TOR = 'A01' THEN B.descripcion
                ELSE 'NO APLICA'
            END AS M_ORIGEN,
            ISNULL(M.Motivo_Nombre, 'NO APLICA') AS M_CUMPLIMIENTO,
            CASE
                WHEN B.categoria_trabajo LIKE 'Traslado%'
                     AND CHARINDEX('ORDEN:', UPPER(B.comentario)) > 0
                    THEN SUBSTRING(
                            LTRIM(SUBSTRING(B.comentario, CHARINDEX('ORDEN:', UPPER(B.comentario)) + 6, 20)),
                            1,
                            8
                         )
                WHEN CHARINDEX('-', B.wo_external_id) > 0
                    THEN SUBSTRING(B.wo_external_id, CHARINDEX('-', B.wo_external_id) + 1, 8)
                ELSE ''
            END AS OT,
            B.cliente_nro AS CODIGO,
            T.TOR,
            C.Sucursal,
            B.data_agendamiento AS Fecha,
            B.numero_cita AS OT_FISICA,
            B.latitud AS GeoSur,
            B.longitud AS GeoOeste,
            CASE
                WHEN B.estado = 'FINALIZADO' THEN 'EJECUTADA'
                ELSE B.estado
            END AS CIERRE,
            C.TECNICO,
            C.Grupo,
            B.dato_onexion + ' ' + B.tap_nap + ' BOCA ' + B.boca_hilo AS N_T_B,
            B.tecnico_nombre,
            'SALESFORCE' AS SISTEMA,
            C.Digitador,
            C.SUPERVISOR_CARGO,
            ROW_NUMBER() OVER (
                PARTITION BY B.wo_external_id
                ORDER BY CONVERT(DATETIME, B.fecha_carga, 103) DESC, B.id_BO_CITA_MAKIRO DESC
            ) AS rn
        FROM dbo.tbl_BO_CITA_MAKIRO B
        INNER JOIN dbo.tbl_ConformacionCuadrilla C
            ON C.Estado = 'ACTIVO'
           AND C.SalesForce = B.tecnico_nombre
           AND dbo.DateOnly(C.Fecha) = dbo.DateOnly(@FechaConsulta)
        LEFT JOIN dbo.tbl_TOR_SF T
            ON B.descripcion = T.Detalle
        LEFT JOIN dbo.tbl_MO_MC M
            ON B.motivo_solucion = M.salesforce
        WHERE dbo.DateOnly(CONVERT(DATETIME, B.inicio_agendado, 120)) = dbo.DateOnly(@FechaConsulta)
    ),
    UltimoEstado AS
    (
        SELECT
            cliente_nro,
            wo_external_id,
            inicio_agendado,
            estado,
            fecha_carga,
            M_ORIGEN,
            M_CUMPLIMIENTO,
            OT,
            CODIGO,
            TOR,
            Sucursal,
            Fecha,
            OT_FISICA,
            GeoSur,
            GeoOeste,
            CIERRE,
            TECNICO,
            Grupo,
            N_T_B,
            tecnico_nombre,
            SISTEMA,
            Digitador,
            SUPERVISOR_CARGO
        FROM Datos
        WHERE rn = 1
    )
    SELECT *
    FROM UltimoEstado U
    WHERE
        (
            (@EsTecnico = 1 AND (
                UPPER(LTRIM(RTRIM(ISNULL(U.TECNICO, '')))) COLLATE Latin1_General_CI_AI =
                    UPPER(@TecnicoNorm) COLLATE Latin1_General_CI_AI
                OR
                UPPER(LTRIM(RTRIM(ISNULL(U.tecnico_nombre, '')))) COLLATE Latin1_General_CI_AI =
                    UPPER(@TecnicoNorm) COLLATE Latin1_General_CI_AI
            ))
            OR
            (@EsTecnico = 0 AND (
                @FiltroTecnicoLike = ''
                OR UPPER(LTRIM(RTRIM(ISNULL(U.TECNICO, '')))) COLLATE Latin1_General_CI_AI LIKE
                    '%' + UPPER(@FiltroTecnicoLike) COLLATE Latin1_General_CI_AI + '%'
                OR UPPER(LTRIM(RTRIM(ISNULL(U.tecnico_nombre, '')))) COLLATE Latin1_General_CI_AI LIKE
                    '%' + UPPER(@FiltroTecnicoLike) COLLATE Latin1_General_CI_AI + '%'
            ))
        )
        AND
        (
            NOT EXISTS (SELECT 1 FROM @EstadosFiltro)
            OR EXISTS (
                SELECT 1
                FROM @EstadosFiltro E
                WHERE
                    UPPER(LTRIM(RTRIM(ISNULL(U.CIERRE, '')))) COLLATE Latin1_General_CI_AI =
                        E.estado COLLATE Latin1_General_CI_AI
                    OR
                    UPPER(LTRIM(RTRIM(ISNULL(U.estado, '')))) COLLATE Latin1_General_CI_AI =
                        E.estado COLLATE Latin1_General_CI_AI
            )
        )
    ORDER BY CONVERT(DATETIME, U.inicio_agendado, 120), U.TECNICO, U.wo_external_id;
END
GO

/*
-- Ejemplos de uso:
EXEC dbo.listarOTClon
    @FechaConsulta = '2026-03-25',
    @Rol = 'tecnico',
    @Tecnico = 'Daniel Carreño Rojas',
    @Estados = 'EJECUTADA,PENDIENTE';

EXEC dbo.listarOTClon
    @FechaConsulta = '2026-03-25',
    @Rol = 'sistemas',
    @BuscarTecnico = 'daniel',
    @Estados = 'EJECUTADA';
*/

