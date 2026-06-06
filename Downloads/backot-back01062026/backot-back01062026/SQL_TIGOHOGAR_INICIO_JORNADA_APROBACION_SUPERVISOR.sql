IF COL_LENGTH('dbo.tbl_InicioJornadaAlturas', 'id_usuario_supervisor_grupo') IS NULL
BEGIN
    ALTER TABLE dbo.tbl_InicioJornadaAlturas
    ADD id_usuario_supervisor_grupo INT NULL;
END

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tbl_InicioJornadaAlturas')
      AND name = 'IX_InicioJornadaAlturas_SupGrupoPendiente'
)
BEGIN
    CREATE INDEX IX_InicioJornadaAlturas_SupGrupoPendiente
    ON dbo.tbl_InicioJornadaAlturas(id_usuario_supervisor_grupo, pendiente, e_eliminado, fecha_registro);
END
