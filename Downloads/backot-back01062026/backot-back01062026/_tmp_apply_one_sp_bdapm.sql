IF OBJECT_ID(N'[dbo].[spx_traervendedores_x_formtecnico]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_traervendedores_x_formtecnico] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_TraerVendedores_x_FormTecnico
AS
BEGIN
    SET NOCOUNT ON;

    SELECT v.*, ts.id_Tipo_Solicitante, ts.Nombre AS TipoSolicitante
    FROM dbo.tbl_Vendedor v
    INNER JOIN dbo.tbl_TipoSolicitante ts ON ts.id_Tipo_Solicitante = v.id_tiposolicitante
    WHERE v.E_Eliminado = 0
    ORDER BY v.Nombre;
END
GO
