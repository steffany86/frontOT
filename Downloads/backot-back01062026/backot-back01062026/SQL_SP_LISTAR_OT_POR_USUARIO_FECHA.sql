IF OBJECT_ID('dbo.spx_ListarOtPorUsuarioFecha', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spx_ListarOtPorUsuarioFecha;
GO

CREATE PROCEDURE dbo.spx_ListarOtPorUsuarioFecha
    @id_usuario INT,
    @fecha      VARCHAR(10) -- dd/MM/yyyy
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id_vendedor INT;
    DECLARE @salesforce  VARCHAR(200);

    -- 1) Usuario logeado -> id_vendedor
    SELECT TOP 1
        @id_vendedor = ut.id_vendedor
    FROM dbo.tbl_usuariotecnico ut
    WHERE ut.id_usuario = @id_usuario
      AND ISNULL(ut.e_eliminado, 0) = 0
    ORDER BY ut.id DESC;

    IF @id_vendedor IS NULL
    BEGIN
        RAISERROR('No se encontro id_vendedor para el id_usuario enviado.', 16, 1);
        RETURN;
    END

    -- 2) id_vendedor -> salesForce
    SELECT TOP 1
        @salesforce = LTRIM(RTRIM(v.salesForce))
    FROM dbo.tbl_vendedor v
    WHERE v.id_vendedor = @id_vendedor
      AND ISNULL(v.e_eliminado, 0) = 0;

    IF @salesforce IS NULL OR @salesforce = ''
    BEGIN
        RAISERROR('No se encontro salesForce para el id_vendedor resuelto.', 16, 1);
        RETURN;
    END

    -- 3) Llamada al SP de OT por fecha + salesforce
    EXEC dbo.spy_Ultimo_Estado_Dia_BO_CITA_MAKIRO @fecha, @salesforce;
END
GO

