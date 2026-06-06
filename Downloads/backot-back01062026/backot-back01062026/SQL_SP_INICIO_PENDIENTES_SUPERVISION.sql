USE BD_TigoHogar
GO

IF OBJECT_ID('dbo.SP_Inicio_ListarPendientesSupervisor', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_ListarPendientesSupervisor AS SELECT 1 AS ok');
GO

ALTER PROCEDURE dbo.SP_Inicio_ListarPendientesSupervisor
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 300
        ij.id_inicio,
        ij.id_tecnico,
        ij.id_auxiliar,
        ij.id_encargado,
        COALESCE(NULLIF(LTRIM(RTRIM(vt.Nombre)), ''), NULLIF(LTRIM(RTRIM(utec.Loggin)), ''), CAST(ij.id_tecnico AS NVARCHAR(50))) AS tecnico,
        COALESCE(NULLIF(LTRIM(RTRIM(vaux.Nombre)), ''), NULLIF(LTRIM(RTRIM(uaux.Loggin)), ''), CASE WHEN ij.id_auxiliar IS NULL THEN NULL ELSE CAST(ij.id_auxiliar AS NVARCHAR(50)) END) AS auxiliar,
        COALESCE(NULLIF(LTRIM(RTRIM(usup.Loggin)), ''), CAST(ij.id_encargado AS NVARCHAR(50))) AS supervisor,
        ij.fecha_registro,
        ij.pendiente,
        ij.capacitado,
        ij.charla,
        ij.botiquin,
        ij.extintor,
        ij.fecha_vencimiento,
        ij.equipo_epp,
        ij.estado_epp,
        ij.apr,
        ij.escalera,
        ij.anclaje,
        ij.imagen
    FROM dbo.tbl_InicioJornadaAlturas ij
    LEFT JOIN dbo.tbl_Usuario utec ON utec.Id_Usuario = ij.id_tecnico
    LEFT JOIN dbo.tbl_UsuarioTecnico utt
           ON (utt.id_usuario = ij.id_tecnico OR utt.id = ij.id_tecnico OR utt.id_vendedor = ij.id_tecnico)
          AND ISNULL(utt.e_eliminado, 0) = 0
    LEFT JOIN dbo.tbl_Vendedor vt ON vt.Id_Vendedor = utt.id_vendedor AND ISNULL(vt.E_Eliminado, 0) = 0
    LEFT JOIN dbo.tbl_Usuario uaux ON uaux.Id_Usuario = ij.id_auxiliar
    LEFT JOIN dbo.tbl_UsuarioTecnico uta
           ON (uta.id_usuario = ij.id_auxiliar OR uta.id = ij.id_auxiliar OR uta.id_vendedor = ij.id_auxiliar)
          AND ISNULL(uta.e_eliminado, 0) = 0
    LEFT JOIN dbo.tbl_Vendedor vaux ON vaux.Id_Vendedor = uta.id_vendedor AND ISNULL(vaux.E_Eliminado, 0) = 0
    LEFT JOIN dbo.tbl_Usuario usup ON usup.Id_Usuario = ij.id_encargado
    WHERE ij.id_encargado = @IdSupervisor
      AND ISNULL(ij.pendiente, 0) = 1
      AND ISNULL(ij.e_eliminado, 0) = 0
    ORDER BY ij.fecha_registro DESC, ij.id_inicio DESC;
END
GO

IF OBJECT_ID('dbo.SP_Inicio_AprobarPendienteSupervisor', 'P') IS NULL
    EXEC('CREATE PROCEDURE dbo.SP_Inicio_AprobarPendienteSupervisor AS SELECT 0 AS updated');
GO

ALTER PROCEDURE dbo.SP_Inicio_AprobarPendienteSupervisor
    @IdInicio INT,
    @IdSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.tbl_InicioJornadaAlturas
    SET pendiente = 0
    WHERE id_inicio = @IdInicio
      AND id_encargado = @IdSupervisor
      AND ISNULL(pendiente, 0) = 1
      AND ISNULL(e_eliminado, 0) = 0;

    SELECT @@ROWCOUNT AS updated;
END
GO
