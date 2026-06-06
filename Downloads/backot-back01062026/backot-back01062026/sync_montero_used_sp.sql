IF OBJECT_ID(N'[dbo].[sp_nps_listar_supervisores_sucursal]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[sp_nps_listar_supervisores_sucursal] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.SP_NPS_LISTAR_SUPERVISORES_SUCURSAL
  @IdSucursal INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT DISTINCT
    cc.idUsuarioSupervisor AS idSupervisor,
    ISNULL(u.Nombre, cc.supervisorACargo) AS supervisor
  FROM dbo.tbl_ConformacionCuadrillaDiario cc
  LEFT JOIN dbo.tbl_Usuario u ON u.Id_Usuario = cc.idUsuarioSupervisor
  WHERE ISNULL(cc.e_eliminado, 0) = 0
  ORDER BY supervisor;
END
GO
IF OBJECT_ID(N'[dbo].[sp_nps_listar_tecnicos_por_supervisor]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[sp_nps_listar_tecnicos_por_supervisor] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.SP_NPS_LISTAR_TECNICOS_POR_SUPERVISOR
  @IdSucursal INT,
  @IdSupervisor INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT DISTINCT
    cc.id_tecnico AS idTecnico,
    ISNULL(ut.Nombre, cc.tecnico) AS tecnico
  FROM dbo.tbl_ConformacionCuadrillaDiario cc
  LEFT JOIN dbo.tbl_UsuarioTecnico map ON map.id_Vendedor = cc.id_tecnico AND ISNULL(map.e_eliminado,0)=0
  LEFT JOIN dbo.tbl_Usuario ut ON ut.Id_Usuario = map.id_Usuario
  WHERE ISNULL(cc.e_eliminado, 0) = 0
    AND (@IdSupervisor = 0 OR cc.idUsuarioSupervisor = @IdSupervisor)
  ORDER BY tecnico;
END
GO
IF OBJECT_ID(N'[dbo].[sp_obtenerlistaordenestrabajo]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[sp_obtenerlistaordenestrabajo] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.sp_ObtenerListaOrdenesTrabajo(@Fecha_Registro datetime)
as
Begin
	Select
	R.Nombre as Ruta, V.Id_Venta, dbo.dateonly(V.Fecha_Ejecucion) Fecha_Ejecucion, dbo.dateonly(V.Fecha_Registro) Fecha_Registro, 
	V.OrdenTrabajo, T.Nombre as TipoServicio, V.CodigoCliente, V.Nombre as Cliente, V.Observacion , r.Id_Ruta 
	,	case when  v.TieneObservacion = 0 then 'No' else 'Si' end TieneObservacion,
	 case when (SELECT COUNT(*) FROM tbl_codigoventacargousuario cu where id_venta = v.id_venta and cu.e_eliminado=0)  >0 then 'Si' else 'No' end TieneCargo
	From 
	tbl_venta V 
	inner join tbl_TipoServicio T on V.Id_TipoServicio = T.Id_TipoServicio
	inner join tbl_Ruta R on R.Id_Ruta = V.Id_Ruta 
	Where
	dbo.dateonly(V.Fecha_Ejecucion) = dbo.dateonly(@Fecha_Registro) and V.E_eliminado = 0
	Order by V.Id_Ruta, V.Id_Venta
End
GO
IF OBJECT_ID(N'[dbo].[sp_obtenerlistaordenestrabajo_otweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[sp_obtenerlistaordenestrabajo_otweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[sp_ObtenerListaOrdenesTrabajo_OTWEB](@Fecha_Registro datetime)
as
Begin
	Select
	R.Nombre as Ruta, V.Id_Venta, dbo.dateonly(V.Fecha_Ejecucion) Fecha_Ejecucion, dbo.dateonly(V.Fecha_Registro) Fecha_Registro, 
	V.OrdenTrabajo, T.Nombre as TipoServicio, V.CodigoCliente, V.Nombre as Cliente, V.Observacion , r.Id_Ruta 
	,	case when  v.TieneObservacion = 0 then 'No' else 'Si' end TieneObservacion,
	 case when (SELECT COUNT(*) FROM tbl_codigoventacargousuario cu where id_venta = v.id_venta and cu.e_eliminado=0)  >0 then 'Si' else 'No' end TieneCargo
	From 
	tbl_venta V 
	inner join tbl_TipoServicio T on V.Id_TipoServicio = T.Id_TipoServicio
	inner join tbl_Ruta R on R.Id_Ruta = V.Id_Ruta 
	Where
	dbo.dateonly(V.Fecha_Ejecucion) = dbo.dateonly(@Fecha_Registro) and V.E_eliminado = 0
	 AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
	Order by V.Id_Ruta, V.Id_Venta
End
GO
IF OBJECT_ID(N'[dbo].[sp_obtenerlistaordenestrabajorfechas]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[sp_obtenerlistaordenestrabajorfechas] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.sp_ObtenerListaOrdenesTrabajoRFechas(@Fecha_RegistroInicio datetime,@Fecha_RegistroFin datetime)
as
Begin
	Select
	R.Nombre as Ruta, V.Id_Venta, dbo.dateonly(V.Fecha_Ejecucion) Fecha_Ejecucion, 
	dbo.dateonly(V.Fecha_Registro) Fecha_Registro, 
	V.OrdenTrabajo, T.Nombre as TipoServicio, V.CodigoCliente, V.Nombre as Cliente, 
	V.Observacion
	, case when v.tieneObservacion =0 then 'No' else 'Si' end TieneObservacion,
	case when (SELECT COUNT(*) FROM tbl_codigoventacargousuario cu where id_venta = v.id_venta and cu.e_eliminado=0)  >0 then 'Si' else 'No' end TieneCargo
	From 
	tbl_venta V 
	inner join tbl_TipoServicio T on V.Id_TipoServicio = T.Id_TipoServicio
	inner join tbl_Ruta R on R.Id_Ruta = V.Id_Ruta 
	Where
	dbo.dateonly(V.Fecha_Ejecucion) between dbo.dateonly(@Fecha_RegistroInicio)  and dbo.dateonly(@Fecha_RegistroFin)
	and V.E_eliminado = 0
	Order by V.Id_Ruta,V.Fecha_Ejecucion desc, V.Id_Venta
End
GO
IF OBJECT_ID(N'[dbo].[sp_tecnico_obtenernombreporid]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[sp_tecnico_obtenernombreporid] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.SP_Tecnico_ObtenerNombrePorId
    @IdTecnico INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 Nombre
    FROM (
        SELECT v.Nombre, 1 AS orden
        FROM dbo.tbl_Vendedor v
        WHERE v.Id_Vendedor = @IdTecnico
          AND ISNULL(v.E_Eliminado,0)=0
        UNION ALL
        SELECT u.Nombre, 2 AS orden
        FROM dbo.tbl_UsuarioTecnico ut
        LEFT JOIN dbo.tbl_Usuario u ON u.Id_Usuario = ut.id_Usuario
        WHERE ut.id_Usuario = @IdTecnico
          AND ISNULL(ut.e_eliminado,0)=0
        UNION ALL
        SELECT u2.Nombre, 3 AS orden
        FROM dbo.tbl_Usuario u2
        WHERE u2.Id_Usuario = @IdTecnico
          AND ISNULL(u2.E_Eliminado,0)=0
    ) q
    WHERE q.Nombre IS NOT NULL AND LTRIM(RTRIM(q.Nombre)) <> ''
    ORDER BY q.orden;
END
GO
IF OBJECT_ID(N'[dbo].[sp_usuario_listaractivosbasico]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[sp_usuario_listaractivosbasico] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.SP_Usuario_ListarActivosBasico
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id_Usuario AS idUsuario, Nombre AS nombre
    FROM dbo.tbl_Usuario
    WHERE ISNULL(E_Eliminado,0)=0;
END
GO
IF OBJECT_ID(N'[dbo].[spb_saldorutascantidad_x_ruta]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spb_saldorutascantidad_x_ruta] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spb_SaldoRutasCantidad_X_Ruta](@Id_Ruta int)
as
select r.nombre Ruta,pr.Nombre Producto,s.Cantidad
from tbl_saldotarjetas s inner join tbl_ruta r on r.id_ruta=s.id_ruta
inner join tbl_producto pr on pr.id_producto=s.id_producto
and  pr.e_eliminado=0 
where r.e_eliminado=0 and r.id_ruta >0 and r.id_ruta =@Id_Ruta
order by r.nombre,pr.Nombre
GO
IF OBJECT_ID(N'[dbo].[spr_traervendedores_x_formtecnico]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spr_traervendedores_x_formtecnico] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spr_TraerVendedores_x_FormTecnico]
as
begin
	select v.*, ts.id_Tipo_Solicitante, ts.Nombre TipoSolicitante
	from tbl_Vendedor v inner join tbl_TipoSolicitante ts on ts.id_Tipo_Solicitante = v.id_tiposolicitante
	where v.E_Eliminado = 0 and v.id_vendedor>0
	order by Nombre
end
GO
IF OBJECT_ID(N'[dbo].[spx_actualizarconformacioncuadrillabackoffice]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_actualizarconformacioncuadrillabackoffice] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ActualizarConformacionCuadrillaBackOffice
    @Id BIGINT,
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.tbl_ConformacionCuadrillaDiario
    SET fecha = ISNULL(@Fecha, fecha),
        estado = @Estado,
        actividad = @Actividad,
        id_tecnico = @Id_Tecnico,
        cuenta_sf = @Cuenta_SF,
        salesforce = @Salesforce,
        habilidad = @Habilidad,
        vehiculo = @Vehiculo,
        [grupo] = @Grupo,
        almacen = @Almacen,
        grupoDigitacion = @GrupoDigitacion,
        idUsuarioDigitador = @IdUsuarioDigitador,
        digitador = @Digitador,
        tecnico = @Tecnico,
        id_tecnicoAuxiliar = @Id_TecnicoAuxiliar,
        auxiliar = @Auxiliar,
        idUsuarioSupervisor = @IdUsuarioSupervisor,
        supervisorACargo = @SupervisorACargo,
        sucursal = @Sucursal,
        observacion = @Observacion,
        idUsuarioRegistra = @IdUsuarioRegistra
    WHERE id = @Id
      AND e_eliminado = 0;
END
GO
IF OBJECT_ID(N'[dbo].[spx_actualizarconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_actualizarconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ActualizarConformacionCuadrillaWeb
    @Id BIGINT,
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    UPDATE dbo.tbl_ConformacionCuadrillaDiarioWeb
    SET fecha = ISNULL(@Fecha, fecha),
        estado = @Estado,
        actividad = @Actividad,
        id_tecnico = @Id_Tecnico,
        cuenta_sf = @Cuenta_SF,
        salesforce = @Salesforce,
        habilidad = @Habilidad,
        vehiculo = @Vehiculo,
        [grupo] = @Grupo,
        almacen = @Almacen,
        grupoDigitacion = @GrupoDigitacion,
        idUsuarioDigitador = @IdUsuarioDigitador,
        digitador = @Digitador,
        tecnico = @Tecnico,
        id_tecnicoAuxiliar = @Id_TecnicoAuxiliar,
        auxiliar = @Auxiliar,
        idUsuarioSupervisor = @IdUsuarioSupervisor,
        supervisorACargo = @SupervisorACargo,
        sucursal = @Sucursal,
        observacion = @Observacion,
        idUsuarioRegistra = @IdUsuarioRegistra
    WHERE id = @Id
      AND e_eliminado = 0;
END
GO
IF OBJECT_ID(N'[dbo].[spx_cambiarpasswordusuarioporid]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_cambiarpasswordusuarioporid] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_CambiarPasswordUsuarioPorId
    @Id_Usuario int,
    @PasswordHashActual varchar(100),
    @PasswordHashNueva varchar(100)
AS
BEGIN
    SET NOCOUNT ON;

    IF @Id_Usuario IS NULL OR @Id_Usuario <= 0
    BEGIN
        RAISERROR('Id_Usuario requerido.', 16, 1);
        RETURN;
    END

    IF ISNULL(LTRIM(RTRIM(@PasswordHashNueva)), '') = ''
    BEGIN
        RAISERROR('Password nueva requerida.', 16, 1);
        RETURN;
    END

    IF @PasswordHashActual = @PasswordHashNueva
    BEGIN
        RAISERROR('La nueva password no puede ser igual a la actual.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_usuario u
        WHERE u.E_Eliminado = 0
          AND u.Id_Usuario = @Id_Usuario
          AND u.Password = @PasswordHashActual
    )
    BEGIN
        RAISERROR('Usuario no existe o password actual incorrecta.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_usuario
    SET Password = @PasswordHashNueva,
        NecesitaCambio = 0,
        UltimaModificacion = GETDATE()
    WHERE Id_Usuario = @Id_Usuario;

    SELECT
        CAST(1 AS bit) AS Exito,
        'Password actualizada correctamente.' AS Mensaje,
        @Id_Usuario AS Id_Usuario;
END
GO
IF OBJECT_ID(N'[dbo].[spx_eliminarconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_eliminarconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_EliminarConformacionCuadrillaWeb
    @Id BIGINT
AS
BEGIN
    UPDATE dbo.tbl_ConformacionCuadrillaDiarioWeb
    SET e_eliminado = 1
    WHERE id = @Id
      AND e_eliminado = 0;
END
GO
IF OBJECT_ID(N'[dbo].[spx_existecierrealmacenhoypr_pd]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_existecierrealmacenhoypr_pd] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ExisteCierreAlmacenHoyPR_PD](@FechaRegistro datetime)
as
begin
	declare @cuantostablamov_pendientes int
	declare @tablamov_pendientes table(movimiento nvarchar(150), cantidad int)
	insert into @tablamov_pendientes exec [spx_ValidaMovimientos] @fechaRegistro

		if(CONVERT(varchar(10), @FechaRegistro, 103) >= CONVERT(varchar(10), GETDATE(), 103))	
		begin		
			select COUNT(Id_CierreAlmacenPR_PD) cantidad,@FechaRegistro as FechaVerificacion ,'>= a la fecha del servidor'Observacion
			from tbl_CierreAlmacenPR_PD
			where E_Eliminado = 0 and dbo.dateonly(Fecha) = dbo.dateonly(@FechaRegistro) 	
		end
		else 
		begin		
			set @cuantostablamov_pendientes = (select COUNT(*) from @tablamov_pendientes)
			if(@cuantostablamov_pendientes>0)
				select -1 cantidad,@FechaRegistro as FechaVerificacion ,'< a la fecha del Servidor y hay transacciones pendientes. 'Observacion		
			else 
				select -1 cantidad,@FechaRegistro as FechaVerificacion ,'< a la fecha del Servidor' Observacion		
		end
end
GO
IF OBJECT_ID(N'[dbo].[spx_existeregistroconformacioncuadrilladiario]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_existeregistroconformacioncuadrilladiario] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE spx_ExisteRegistroConformacionCuadrillaDiario(@idTecnico int,@fecha datetime)
as
select * from tbl_ConformacionCuadrillaDiario 
where id_tecnico=@idTecnico and dbo.dateonly(fecha)=dbo.dateonly(@fecha)
and e_eliminado=0
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_asignarsupervisorcentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_asignarsupervisorcentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_AsignarSupervisorCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioSupervisor INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF @IdUsuarioSupervisor IS NULL OR @IdUsuarioSupervisor <= 0
    BEGIN
        RAISERROR('IdUsuarioSupervisor es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o eliminado.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioSupervisor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) LIKE '%supervisor%'
    )
    BEGIN
        RAISERROR('El usuario indicado no es supervisor activo.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_GrupoSup gs
        WHERE gs.id_grupo = @IdGrupo
          AND gs.id_usuario = @IdUsuarioSupervisor
    )
    BEGIN
        SELECT gs.id_grupo_sup, gs.id_usuario, gs.id_grupo, gs.fecha_registro
        FROM dbo.tbl_GrupoSup gs
        WHERE gs.id_grupo = @IdGrupo
          AND gs.id_usuario = @IdUsuarioSupervisor;
        RETURN;
    END

    INSERT INTO dbo.tbl_GrupoSup (id_usuario, id_grupo, fecha_registro)
    VALUES (@IdUsuarioSupervisor, @IdGrupo, GETDATE());

    SELECT TOP 1 gs.id_grupo_sup, gs.id_usuario, gs.id_grupo, gs.fecha_registro
    FROM dbo.tbl_GrupoSup gs
    WHERE gs.id_grupo_sup = SCOPE_IDENTITY();
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_asignartecnicocentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_asignartecnicocentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_AsignarTecnicoCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TablaTecnico SYSNAME = NULL;
    DECLARE @ColumnaTecnico SYSNAME = NULL;
    DECLARE @IdTecnicoResuelto INT = NULL;
    DECLARE @Sql NVARCHAR(MAX);
    DECLARE @IdGrupoExistente INT = NULL;
    DECLARE @NombreGrupoExistente NVARCHAR(120) = NULL;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF @IdUsuarioTecnico IS NULL OR @IdUsuarioTecnico <= 0
    BEGIN
        RAISERROR('IdUsuarioTecnico es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o eliminado.', 16, 1);
        RETURN;
    END

    IF OBJECT_ID('dbo.tbl_usuario_tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_usuario_tecnico';
    ELSE IF OBJECT_ID('dbo.tbl_UsuarioTecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_UsuarioTecnico';
    ELSE IF OBJECT_ID('dbo.tbl_Usuario_Tecnico', 'U') IS NOT NULL SET @TablaTecnico = 'dbo.tbl_Usuario_Tecnico';

    IF @TablaTecnico IS NULL
    BEGIN
        RAISERROR('No existe tabla de usuario tecnico en esta BD.', 16, 1);
        RETURN;
    END

    IF COL_LENGTH(@TablaTecnico, 'id_usuario_tecnico') IS NOT NULL SET @ColumnaTecnico = 'id_usuario_tecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'idUsuarioTecnico') IS NOT NULL SET @ColumnaTecnico = 'idUsuarioTecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'Id_Usuario_Tecnico') IS NOT NULL SET @ColumnaTecnico = 'Id_Usuario_Tecnico';
    ELSE IF COL_LENGTH(@TablaTecnico, 'id') IS NOT NULL SET @ColumnaTecnico = 'id';

    IF @ColumnaTecnico IS NULL
    BEGIN
        RAISERROR('No se encontro la columna PK de usuario tecnico.', 16, 1);
        RETURN;
    END

    SET @Sql = N'
        SELECT TOP 1 @IdResOut = t.' + QUOTENAME(@ColumnaTecnico) + N'
        FROM ' + @TablaTecnico + N' t
        WHERE t.' + QUOTENAME(@ColumnaTecnico) + N' = @IdInput
          AND (COL_LENGTH(''' + @TablaTecnico + ''', ''e_eliminado'') IS NULL OR ISNULL(t.e_eliminado,0)=0);';
    EXEC sp_executesql @Sql, N'@IdInput INT, @IdResOut INT OUTPUT', @IdInput = @IdUsuarioTecnico, @IdResOut = @IdTecnicoResuelto OUTPUT;

    IF @IdTecnicoResuelto IS NULL
       AND (COL_LENGTH(@TablaTecnico, 'id_vendedor') IS NOT NULL OR COL_LENGTH(@TablaTecnico, 'id_Vendedor') IS NOT NULL)
    BEGIN
        SET @Sql = N'
            SELECT TOP 1 @IdResOut = t.' + QUOTENAME(@ColumnaTecnico) + N'
            FROM ' + @TablaTecnico + N' t
            WHERE (
                    (COL_LENGTH(''' + @TablaTecnico + ''', ''id_vendedor'') IS NOT NULL AND t.id_vendedor = @IdInput)
                 OR (COL_LENGTH(''' + @TablaTecnico + ''', ''id_Vendedor'') IS NOT NULL AND t.id_Vendedor = @IdInput)
                  )
              AND (COL_LENGTH(''' + @TablaTecnico + ''', ''e_eliminado'') IS NULL OR ISNULL(t.e_eliminado,0)=0);';
        EXEC sp_executesql @Sql, N'@IdInput INT, @IdResOut INT OUTPUT', @IdInput = @IdUsuarioTecnico, @IdResOut = @IdTecnicoResuelto OUTPUT;
    END

    IF @IdTecnicoResuelto IS NULL
       AND (COL_LENGTH(@TablaTecnico, 'id_vendedor') IS NOT NULL OR COL_LENGTH(@TablaTecnico, 'id_Vendedor') IS NOT NULL)
    BEGIN
        DECLARE @TablaVendedor SYSNAME = NULL;
        DECLARE @ColVendedorPk SYSNAME = NULL;
        DECLARE @ColTecnicoVendedor SYSNAME = NULL;
        DECLARE @ExisteVendedor INT = 0;
        DECLARE @InsertCols NVARCHAR(MAX);
        DECLARE @InsertVals NVARCHAR(MAX);

        IF OBJECT_ID('dbo.tbl_vendedor', 'U') IS NOT NULL SET @TablaVendedor = 'dbo.tbl_vendedor';
        ELSE IF OBJECT_ID('dbo.tbl_Vendedor', 'U') IS NOT NULL SET @TablaVendedor = 'dbo.tbl_Vendedor';

        IF @TablaVendedor IS NOT NULL
        BEGIN
            IF COL_LENGTH(@TablaVendedor, 'id_vendedor') IS NOT NULL SET @ColVendedorPk = 'id_vendedor';
            ELSE IF COL_LENGTH(@TablaVendedor, 'Id_Vendedor') IS NOT NULL SET @ColVendedorPk = 'Id_Vendedor';
        END

        IF COL_LENGTH(@TablaTecnico, 'id_vendedor') IS NOT NULL SET @ColTecnicoVendedor = 'id_vendedor';
        ELSE IF COL_LENGTH(@TablaTecnico, 'id_Vendedor') IS NOT NULL SET @ColTecnicoVendedor = 'id_Vendedor';

        IF @TablaVendedor IS NOT NULL AND @ColVendedorPk IS NOT NULL AND @ColTecnicoVendedor IS NOT NULL
        BEGIN
            SET @Sql = N'
                SELECT TOP 1 @ExisteOut = 1
                FROM ' + @TablaVendedor + N' v
                WHERE v.' + QUOTENAME(@ColVendedorPk) + N' = @IdInput
                  AND (COL_LENGTH(''' + @TablaVendedor + ''', ''e_eliminado'') IS NULL OR ISNULL(v.e_eliminado,0)=0);';
            EXEC sp_executesql @Sql, N'@IdInput INT, @ExisteOut INT OUTPUT', @IdInput = @IdUsuarioTecnico, @ExisteOut = @ExisteVendedor OUTPUT;
        END

        IF @ExisteVendedor = 1
        BEGIN
            SET @InsertCols = QUOTENAME(@ColTecnicoVendedor);
            SET @InsertVals = N'@IdVendedor';

            IF COL_LENGTH(@TablaTecnico, 'id_Usuario') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [id_Usuario]';
                SET @InsertVals = @InsertVals + N', NULL';
            END
            IF COL_LENGTH(@TablaTecnico, 'id_UsuarioRegistra') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [id_UsuarioRegistra]';
                SET @InsertVals = @InsertVals + N', ISNULL(@IdUsuarioRegistra,0)';
            END
            IF COL_LENGTH(@TablaTecnico, 'e_eliminado') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [e_eliminado]';
                SET @InsertVals = @InsertVals + N', 0';
            END
            IF COL_LENGTH(@TablaTecnico, 'fecharegistro') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [fecharegistro]';
                SET @InsertVals = @InsertVals + N', GETDATE()';
            END
            IF COL_LENGTH(@TablaTecnico, 'fecha_registro') IS NOT NULL
            BEGIN
                SET @InsertCols = @InsertCols + N', [fecha_registro]';
                SET @InsertVals = @InsertVals + N', GETDATE()';
            END

            SET @Sql = N'
                INSERT INTO ' + @TablaTecnico + N' (' + @InsertCols + N')
                VALUES (' + @InsertVals + N');

                SELECT TOP 1 @IdResOut = t.' + QUOTENAME(@ColumnaTecnico) + N'
                FROM ' + @TablaTecnico + N' t
                WHERE t.' + QUOTENAME(@ColTecnicoVendedor) + N' = @IdVendedor
                  AND (COL_LENGTH(''' + @TablaTecnico + ''', ''e_eliminado'') IS NULL OR ISNULL(t.e_eliminado,0)=0)
                ORDER BY t.' + QUOTENAME(@ColumnaTecnico) + N' DESC;';
            EXEC sp_executesql
                @Sql,
                N'@IdVendedor INT, @IdUsuarioRegistra INT, @IdResOut INT OUTPUT',
                @IdVendedor = @IdUsuarioTecnico,
                @IdUsuarioRegistra = @IdUsuarioEjecutor,
                @IdResOut = @IdTecnicoResuelto OUTPUT;
        END
    END

    IF @IdTecnicoResuelto IS NULL
    BEGIN
        RAISERROR('El tecnico indicado no existe en tabla usuario_tecnico (ni por id interno ni por id_vendedor).', 16, 1);
        RETURN;
    END

    SELECT TOP 1
        @IdGrupoExistente = g.id_grupo,
        @NombreGrupoExistente = g.nombre
    FROM dbo.tbl_DetalleGrupo dg
    INNER JOIN dbo.tbl_Grupo g ON g.id_grupo = dg.id_grupo
    WHERE dg.id_usuario_tecnico = @IdTecnicoResuelto
      AND ISNULL(g.e_eliminado, 0) = 0
      AND g.id_grupo <> @IdGrupo;

    IF @IdGrupoExistente IS NOT NULL
    BEGIN
        RAISERROR('No se puede, este tecnico esta en otro grupo.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdTecnicoResuelto
    )
    BEGIN
        SELECT dg.id_detalle_grupo, dg.id_grupo, dg.id_usuario_tecnico, dg.fecha_registro
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdTecnicoResuelto;
        RETURN;
    END

    INSERT INTO dbo.tbl_DetalleGrupo (id_grupo, id_usuario_tecnico, fecha_registro)
    VALUES (@IdGrupo, @IdTecnicoResuelto, GETDATE());

    SELECT TOP 1 dg.id_detalle_grupo, dg.id_grupo, dg.id_usuario_tecnico, dg.fecha_registro
    FROM dbo.tbl_DetalleGrupo dg
    WHERE dg.id_detalle_grupo = SCOPE_IDENTITY();
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_cambiarcolaboradorbackupcentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_cambiarcolaboradorbackupcentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_CambiarColaboradorBackupCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END
    IF @IdUsuarioTecnico IS NULL OR @IdUsuarioTecnico <= 0
    BEGIN
        RAISERROR('IdUsuarioTecnico es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
          AND ISNULL(g.supervisor_ausente, 0) = 1
    )
    BEGIN
        RAISERROR('El grupo no esta en estado supervisor ausente.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico
    )
    BEGIN
        RAISERROR('El tecnico temporal debe pertenecer al grupo.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_GrupoBackup gb
        WHERE gb.id_grupo = @IdGrupo
          AND gb.e_activo = 1
    )
    BEGIN
        RAISERROR('No existe backup activo para el grupo.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_GrupoBackup
    SET id_usuario_tecnico_temporal = @IdUsuarioTecnico,
        id_usuario_actualiza = @IdUsuarioEjecutor,
        fecha_actualizacion = GETDATE()
    WHERE id_grupo = @IdGrupo
      AND e_activo = 1;

    SELECT TOP 1
        gb.id_grupo_backup,
        gb.id_grupo,
        gb.id_usuario_tecnico_temporal AS id_tecnico_temporal_backup,
        gb.e_activo
    FROM dbo.tbl_GrupoBackup gb
    WHERE gb.id_grupo = @IdGrupo
      AND gb.e_activo = 1
    ORDER BY gb.id_grupo_backup DESC;
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_crearcentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_crearcentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_CrearCentral
    @IdUsuarioEjecutor INT,
    @Nombre NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NombreNorm NVARCHAR(120) = NULLIF(LTRIM(RTRIM(@Nombre)), '');
    IF @NombreNorm IS NULL
    BEGIN
        RAISERROR('Nombre de grupo es requerido.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE ISNULL(g.e_eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(g.nombre))) = LOWER(@NombreNorm)
    )
    BEGIN
        RAISERROR('Ya existe un grupo activo con ese nombre.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.tbl_Grupo (nombre, e_eliminado, fecha_registro)
    VALUES (@NombreNorm, 0, GETDATE());

    SELECT TOP 1 id_grupo, nombre, e_eliminado, fecha_registro
    FROM dbo.tbl_Grupo
    WHERE id_grupo = SCOPE_IDENTITY();
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_eliminarcentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_eliminarcentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_EliminarCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o ya eliminado.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_Grupo
    SET e_eliminado = 1,
        supervisor_ausente = 0
    WHERE id_grupo = @IdGrupo
      AND ISNULL(e_eliminado, 0) = 0;

    UPDATE dbo.tbl_GrupoBackup
    SET e_activo = 0,
        fecha_fin = ISNULL(fecha_fin, GETDATE()),
        id_usuario_actualiza = @IdUsuarioEjecutor,
        fecha_actualizacion = GETDATE()
    WHERE id_grupo = @IdGrupo
      AND e_activo = 1;

    SELECT TOP 1 g.id_grupo, g.nombre, g.e_eliminado, g.supervisor_ausente, g.fecha_registro
    FROM dbo.tbl_Grupo g
    WHERE g.id_grupo = @IdGrupo;
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_filtrosupervisorescentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_filtrosupervisorescentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_FiltroSupervisoresCentral
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb;
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_filtrotecnicoscentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_filtrotecnicoscentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_FiltroTecnicosCentral
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.spx_ObtenerTecnicosConformacionCuadrillaWeb;
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_listarcentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_listarcentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_ListarCentral
    @IdUsuarioEjecutor INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Usuario u
        INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
        WHERE u.Id_Usuario = @IdUsuarioEjecutor
          AND ISNULL(u.E_Eliminado, 0) = 0
          AND LOWER(LTRIM(RTRIM(r.Nombre))) = 'central'
    )
    BEGIN
        RAISERROR('Solo el rol Central puede listar grupos.', 16, 1);
        RETURN;
    END

    SELECT
        d.id_grupo,
        d.grupo AS nombre,
        MAX(CAST(c.fechaRegistro AS DATETIME)) AS fecha_registro,
        COUNT(DISTINCT d.id_usuario_supervisor) AS cantidad_supervisores,
        COUNT(DISTINCT d.id_tecnico) AS cantidad_tecnicos,
        d.supervisor,
        CAST(NULL AS INT) AS id_tecnico_temporal_backup,
        CAST(NULL AS NVARCHAR(200)) AS tecnico_temporal_backup,
        d.id_tecnico AS id_usuario_tecnico,
        d.tecnico
    FROM dbo.vw_GruposTecnicosDetalle d
    LEFT JOIN dbo.tbl_ConformacionCuadrillaDiario c
        ON c.grupo = d.grupo
       AND c.id_tecnico = d.id_tecnico
       AND ISNULL(c.e_eliminado, 0) = 0
    GROUP BY d.id_grupo, d.grupo, d.supervisor, d.id_tecnico, d.tecnico
    ORDER BY d.grupo, d.tecnico;
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_marcarsupervisorausentecentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_marcarsupervisorausentecentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_MarcarSupervisorAusenteCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END
    IF @IdUsuarioTecnico IS NULL OR @IdUsuarioTecnico <= 0
    BEGIN
        RAISERROR('IdUsuarioTecnico es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o eliminado.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdUsuarioTecnico
    )
    BEGIN
        RAISERROR('El tecnico temporal debe pertenecer al grupo.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_GrupoBackup
    SET e_activo = 0,
        fecha_fin = ISNULL(fecha_fin, GETDATE()),
        id_usuario_actualiza = @IdUsuarioEjecutor,
        fecha_actualizacion = GETDATE()
    WHERE id_grupo = @IdGrupo
      AND e_activo = 1;

    INSERT INTO dbo.tbl_GrupoBackup (
        id_grupo,
        id_usuario_tecnico_temporal,
        e_activo,
        fecha_inicio,
        id_usuario_registra
    )
    VALUES (
        @IdGrupo,
        @IdUsuarioTecnico,
        1,
        GETDATE(),
        @IdUsuarioEjecutor
    );

    UPDATE dbo.tbl_Grupo
    SET supervisor_ausente = 1
    WHERE id_grupo = @IdGrupo;

    SELECT TOP 1
        g.id_grupo,
        g.nombre,
        g.supervisor_ausente,
        gb.id_usuario_tecnico_temporal AS id_tecnico_temporal_backup
    FROM dbo.tbl_Grupo g
    INNER JOIN dbo.tbl_GrupoBackup gb
            ON gb.id_grupo = g.id_grupo
           AND gb.e_activo = 1
    WHERE g.id_grupo = @IdGrupo
    ORDER BY gb.id_grupo_backup DESC;
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_quitartecnicocentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_quitartecnicocentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_QuitarTecnicoCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT,
    @IdUsuarioTecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdTecnicoResuelto INT = NULL;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF @IdUsuarioTecnico IS NULL OR @IdUsuarioTecnico <= 0
    BEGIN
        RAISERROR('IdUsuarioTecnico es requerido.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.tbl_UsuarioTecnico ut WHERE ut.id = @IdUsuarioTecnico)
    BEGIN
        SET @IdTecnicoResuelto = @IdUsuarioTecnico;
    END
    ELSE
    BEGIN
        SELECT TOP 1 @IdTecnicoResuelto = ut.id
        FROM dbo.tbl_UsuarioTecnico ut
        WHERE ut.id_Vendedor = @IdUsuarioTecnico
          AND ISNULL(ut.e_eliminado, 0) = 0;
    END

    IF @IdTecnicoResuelto IS NULL
    BEGIN
        SET @IdTecnicoResuelto = @IdUsuarioTecnico;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.tbl_GrupoBackup gb
        WHERE gb.id_grupo = @IdGrupo
          AND gb.e_activo = 1
          AND gb.id_usuario_tecnico_temporal = @IdTecnicoResuelto
    )
    BEGIN
        RAISERROR('No se puede quitar el tecnico temporal activo. Primero cambie colaborador o restaure supervisor.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_DetalleGrupo dg
        WHERE dg.id_grupo = @IdGrupo
          AND dg.id_usuario_tecnico = @IdTecnicoResuelto
    )
    BEGIN
        RAISERROR('El tecnico no pertenece al grupo seleccionado.', 16, 1);
        RETURN;
    END

    DELETE FROM dbo.tbl_DetalleGrupo
    WHERE id_grupo = @IdGrupo
      AND id_usuario_tecnico = @IdTecnicoResuelto;

    SELECT
        @IdGrupo AS id_grupo,
        @IdTecnicoResuelto AS id_usuario_tecnico,
        CAST(1 AS BIT) AS quitado;
END
GO
IF OBJECT_ID(N'[dbo].[spx_grupo_restaurarsupervisorcentral]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_grupo_restaurarsupervisorcentral] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_Grupo_RestaurarSupervisorCentral
    @IdUsuarioEjecutor INT,
    @IdGrupo INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdGrupo IS NULL OR @IdGrupo <= 0
    BEGIN
        RAISERROR('IdGrupo es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Grupo g
        WHERE g.id_grupo = @IdGrupo
          AND ISNULL(g.e_eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Grupo no encontrado o eliminado.', 16, 1);
        RETURN;
    END

    UPDATE dbo.tbl_GrupoBackup
    SET e_activo = 0,
        fecha_fin = ISNULL(fecha_fin, GETDATE()),
        id_usuario_actualiza = @IdUsuarioEjecutor,
        fecha_actualizacion = GETDATE()
    WHERE id_grupo = @IdGrupo
      AND e_activo = 1;

    UPDATE dbo.tbl_Grupo
    SET supervisor_ausente = 0
    WHERE id_grupo = @IdGrupo;

    SELECT TOP 1 g.id_grupo, g.nombre, g.supervisor_ausente
    FROM dbo.tbl_Grupo g
    WHERE g.id_grupo = @IdGrupo;
END
GO
IF OBJECT_ID(N'[dbo].[spx_guardarprivilegiosrol]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_guardarprivilegiosrol] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_GuardarPrivilegiosRol
    @IdRol INT,
    @MenuIdsCsv NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @IdRol IS NULL
    BEGIN
        RAISERROR('IdRol es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Rol r
        WHERE r.Id_Rol = @IdRol
          AND ISNULL(r.E_Eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Rol no encontrado o inactivo.', 16, 1);
        RETURN;
    END

    DECLARE @MenuIds TABLE (
        Id_Menu INT NOT NULL PRIMARY KEY
    );

    SET @MenuIdsCsv = ISNULL(@MenuIdsCsv, '');
    SET @MenuIdsCsv = REPLACE(@MenuIdsCsv, ' ', '');

    IF LEN(LTRIM(RTRIM(@MenuIdsCsv))) > 0
    BEGIN
        DECLARE @xml XML;
        DECLARE @sanitized NVARCHAR(MAX);
        SET @sanitized = @MenuIdsCsv;
        WHILE CHARINDEX(',,', @sanitized) > 0
        BEGIN
            SET @sanitized = REPLACE(@sanitized, ',,', ',');
        END
        IF LEFT(@sanitized, 1) = ','
        BEGIN
            SET @sanitized = SUBSTRING(@sanitized, 2, LEN(@sanitized) - 1);
        END
        IF RIGHT(@sanitized, 1) = ','
        BEGIN
            SET @sanitized = LEFT(@sanitized, LEN(@sanitized) - 1);
        END

        IF LEN(@sanitized) > 0
        BEGIN
            SET @xml = CAST('<x>' + REPLACE(@sanitized, ',', '</x><x>') + '</x>' AS XML);

            INSERT INTO @MenuIds (Id_Menu)
            SELECT DISTINCT CAST(T.c.value('.', 'nvarchar(30)') AS INT)
            FROM @xml.nodes('/x') AS T(c)
            WHERE ISNUMERIC(T.c.value('.', 'nvarchar(30)')) = 1
              AND CAST(T.c.value('.', 'nvarchar(30)') AS INT) > 0;
        END
    END

    IF EXISTS (
        SELECT 1
        FROM @MenuIds i
        LEFT JOIN dbo.tbl_Tabla_Menu m
               ON m.ID_MENU = i.Id_Menu
              AND ISNULL(m.E_Eliminado, 0) = 0
        WHERE m.ID_MENU IS NULL
    )
    BEGIN
        RAISERROR('MenuIds contiene elementos inexistentes o inactivos.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.tbl_RolMenu
        SET E_Eliminado = 1
        WHERE Id_Rol = @IdRol
          AND ISNULL(E_Eliminado, 0) = 0;

        UPDATE rm
        SET rm.E_Eliminado = 0
        FROM dbo.tbl_RolMenu rm
        INNER JOIN @MenuIds i ON i.Id_Menu = rm.Id_Menu
        WHERE rm.Id_Rol = @IdRol;

        INSERT INTO dbo.tbl_RolMenu (Id_Menu, Id_Rol, E_Eliminado)
        SELECT i.Id_Menu, @IdRol, 0
        FROM @MenuIds i
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.tbl_RolMenu rm
            WHERE rm.Id_Rol = @IdRol
              AND rm.Id_Menu = i.Id_Menu
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
        END
        DECLARE @ErrMsg NVARCHAR(4000);
        SET @ErrMsg = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
        RETURN;
    END CATCH

    EXEC dbo.spx_ObtenerPrivilegiosRolDetalle @IdRol;
END
GO
IF OBJECT_ID(N'[dbo].[spx_la_listartecnicossucursal]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_la_listartecnicossucursal] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_LA_ListarTecnicosSucursal]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CAST(v.Id_Vendedor AS INT) AS idTecnico,
        CAST(v.Id_Vendedor AS INT) AS id_tecnico,
        ISNULL(NULLIF(LTRIM(RTRIM(v.Nombre)), ''), 'Tecnico ' + CAST(v.Id_Vendedor AS VARCHAR(20))) AS tecnico,
        ISNULL(NULLIF(LTRIM(RTRIM(v.CodEmpleado)), ''), NULLIF(LTRIM(RTRIM(u.CodEmpleado)), '')) AS codEmpleado,
        ISNULL(NULLIF(LTRIM(RTRIM(v.CuentaSF)), ''), '-') AS cuentaSf,
        ISNULL(NULLIF(LTRIM(RTRIM(v.habilidad)), ''), '-') AS habilidad,
        ut.id_Usuario AS idUsuario,
        ISNULL(NULLIF(LTRIM(RTRIM(u.Loggin)), ''), '') AS loggin
    FROM dbo.tbl_Vendedor v
    LEFT JOIN dbo.tbl_UsuarioTecnico ut ON ut.Id_Vendedor = v.Id_Vendedor AND ISNULL(ut.e_eliminado, 0) = 0
    LEFT JOIN dbo.tbl_Usuario u ON u.Id_Usuario = ut.id_Usuario AND ISNULL(u.E_Eliminado, 0) = 0
    WHERE ISNULL(v.E_Eliminado, 0) = 0
    AND v.Id_Vendedor > 0
    ORDER BY v.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_listarotfinalizadas]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_listarotfinalizadas] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ListarOtFinalizadas
    @Fecha DATETIME,
    @IdUsuario INT = NULL,
    @IdsVendedorCsv NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @Fecha IS NULL
    BEGIN
        RAISERROR('Fecha es requerida.', 16, 1);
        RETURN;
    END

    DECLARE @Vendedores TABLE (Id_Vendedor INT PRIMARY KEY);

    IF @IdsVendedorCsv IS NOT NULL AND LTRIM(RTRIM(@IdsVendedorCsv)) <> ''
    BEGIN
        DECLARE @xml XML;
        DECLARE @csv NVARCHAR(MAX);
        SET @csv = REPLACE(LTRIM(RTRIM(@IdsVendedorCsv)), ' ', '');
        SET @xml = CAST('<x><i>' + REPLACE(@csv, ',', '</i><i>') + '</i></x>' AS XML);

        INSERT INTO @Vendedores (Id_Vendedor)
        SELECT DISTINCT CAST(T.N.value('.', 'NVARCHAR(50)') AS INT)
        FROM @xml.nodes('/x/i') AS T(N)
        WHERE ISNUMERIC(T.N.value('.', 'NVARCHAR(50)')) = 1
          AND CAST(T.N.value('.', 'NVARCHAR(50)') AS INT) > 0;
    END

    IF @IdUsuario IS NOT NULL AND @IdUsuario > 0
       AND NOT EXISTS (SELECT 1 FROM @Vendedores WHERE Id_Vendedor = @IdUsuario)
    BEGIN
        INSERT INTO @Vendedores (Id_Vendedor) VALUES (@IdUsuario);
    END

    SELECT
        v.Id_Venta AS idVenta,
        v.OrdenTrabajo AS ordenTrabajo,
        v.CodigoCliente AS codigoCliente,
        v.Fecha_Ejecucion AS fechaEjecucion,
        v.Origen AS origen,
        v.Id_Vendedor AS idVendedor,
        v.Id_TipoServicio AS idTipoServicio,
        ts.Nombre AS tipoServicio,
        v.Id_Estado AS idEstado,
        e.Nombre AS estado
    FROM dbo.tbl_Venta v
    LEFT JOIN dbo.tbl_tiposervicio ts ON ts.Id_TipoServicio = v.Id_TipoServicio
    LEFT JOIN dbo.tbl_estado e ON e.Id_Estado = v.Id_Estado
    WHERE ISNULL(v.E_Eliminado, 0) = 0
      AND CONVERT(DATE, v.Fecha_Ejecucion) = @Fecha
      AND EXISTS (
            SELECT 1
            FROM @Vendedores x
            WHERE x.Id_Vendedor = v.Id_Vendedor
      )
    ORDER BY v.Id_Venta DESC;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obteneractividadesconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obteneractividadesconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerActividadesConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 'TITULAR' AS actividad
    UNION ALL
    SELECT 'BACKUP' AS actividad;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerauxiliaresconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerauxiliaresconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerAuxiliaresConformacionCuadrillaWeb]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        v.Id_Vendedor AS id_tecnicoAuxiliar,
        v.Nombre AS auxiliar,
        v.CuentaSF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        v.*
    FROM dbo.tbl_Vendedor v
    WHERE v.E_Eliminado = 0
    and v.Id_Vendedor>0 and v.id_tiposolicitante=1
    and id_vendedor not in (
		select id_vendedor from tbl_ruta where e_eliminado=0 and id_vendedor>0
    )
    ORDER BY v.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenercaberaventapararegistrootwb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenercaberaventapararegistrootwb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE spx_ObtenerCaberaVentaParaRegistroOTwb(@cliente_nro int, @ot int,@tor nvarchar(15),@grupo nvarchar(250),@tecniconombre nvarchar(250))
as

select v.id_vendedor, v.nombre,r.id_ruta IdGrupo,r.nombre NombreGrupo,
(select id_tiposervicio from tbl_tiposervicio where prefijo =@tor) Id_TipoServicio,
@tor TOR,@ot OT,(select id_sucursal from tbl_version)Id_Sucursal,(select sucursal from tbl_version)Sucursal,@cliente_nro Cliente_Nro
from tbl_vendedor v inner join tbl_ruta r on r.id_vendedor=v.id_vendedor
where v.nombre=@tecniconombre and r.nombre=@grupo
GO
IF OBJECT_ID(N'[dbo].[spx_obtenercargousuarionorealizado_id]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenercargousuarionorealizado_id] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerCargoUsuarioNoRealizado_ID](@Codigo int)
as
select Id	,Id_Usuario	,Id_VendedorDigitador	,Nombre	,
case when EsVendedorUsuario=1 then 'Tecnico' else 'Digitador' end EsVendedorUsuario
,CodigoEmpleado	,Id_TipoServicio	,NombreTipoServicio	,Fecha_Ejecucion	,
Fecha_Registro	,OrdenTrabajo	,CodigoCliente	,Observacion	,Total	,Id_UsuarioE	,NombreE	,	
 case when Cobrado = 0 then 'No' else 'Si' end Cobrado
from tbl_CargoUsuarioNoRealizado where id=@Codigo 
select * from tbl_codigoCargoUsuarioNoRealizado where id_cargousuarionorealizado=@Codigo and e_eliminado=0
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerconformacioncuadrillabackoffice]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerconformacioncuadrillabackoffice] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerConformacionCuadrillaBackOffice
    @Fecha DATE = NULL,
    @Sucursal NVARCHAR(100) = NULL,
    @Limite INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (CASE WHEN @Limite IS NULL OR @Limite <= 0 THEN 2147483647 ELSE @Limite END)
        *
    FROM dbo.tbl_ConformacionCuadrillaDiario
    WHERE e_eliminado = 0
      AND (@Fecha IS NULL OR fecha = @Fecha)
      AND (
            @Sucursal IS NULL
            OR LTRIM(RTRIM(@Sucursal)) = ''
            OR sucursal = LTRIM(RTRIM(@Sucursal))
          )
    ORDER BY fechaRegistro DESC, id DESC;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerConformacionCuadrillaWeb
    @Fecha DATE = NULL,
    @Sucursal NVARCHAR(100) = NULL,
    @Limite INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FechaConsulta DATE = ISNULL(@Fecha, CAST(GETDATE() AS DATE));
    DECLARE @SucursalNormalizada NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Sucursal)), '');

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    ),
    BaseCuadrillas AS (
        SELECT
            CAST(r.Id_Ruta AS BIGINT) AS id_ruta,
            @FechaConsulta AS fecha,
            CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
            CAST(
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(r.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                        THEN UPPER(LTRIM(RTRIM(r.Tipo)))
                    ELSE 'TITULAR'
                END
                AS NVARCHAR(20)
            ) AS actividad,
            v.Id_Vendedor AS id_tecnico,
            v.CuentaSF AS cuenta_sf,
            v.SalesForce AS salesforce,
            v.Habilidad AS habilidad,
            v.Vehiculo AS vehiculo,
            r.Nombre AS grupo,
            COALESCE(NULLIF(LTRIM(RTRIM(r.BodegaTigo)), ''), NULLIF(LTRIM(RTRIM(r.almacenTigo)), '')) AS almacen,
            COALESCE(NULLIF(LTRIM(RTRIM(r.almacenTigo)), ''), NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '')) AS grupoDigitacion,
            v.Nombre AS tecnico,
            va.sucursal AS sucursal,
            GETDATE() AS fechaRegistro,
            CONVERT(BIT, ISNULL(r.E_Eliminado, 0)) AS e_eliminado
        FROM dbo.tbl_Ruta r
        INNER JOIN dbo.tbl_Vendedor v
            ON v.Id_Vendedor = r.Id_Vendedor
        CROSS JOIN VersionActual va
        WHERE v.E_Eliminado = 0
    ),
    GuardadasGrupo AS (
        SELECT
            g.*,
            ROW_NUMBER() OVER (
                PARTITION BY
                    g.id_tecnico,
                    UPPER(LTRIM(RTRIM(ISNULL(g.grupo, ''))))
                ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
            ) AS rn
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb g
        WHERE ISNULL(g.e_eliminado, 0) = 0
          AND g.fecha = @FechaConsulta
          AND (
                @SucursalNormalizada IS NULL
                OR UPPER(LTRIM(RTRIM(ISNULL(g.sucursal, '')))) = UPPER(@SucursalNormalizada)
              )
    ),
    GuardadasTecnico AS (
        SELECT
            g.*,
            ROW_NUMBER() OVER (
                PARTITION BY g.id_tecnico
                ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
            ) AS rn
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb g
        WHERE ISNULL(g.e_eliminado, 0) = 0
          AND g.fecha = @FechaConsulta
          AND (
                @SucursalNormalizada IS NULL
                OR UPPER(LTRIM(RTRIM(ISNULL(g.sucursal, '')))) = UPPER(@SucursalNormalizada)
              )
    )
    SELECT TOP (CASE WHEN @Limite IS NULL OR @Limite <= 0 THEN 2147483647 ELSE @Limite END)
        b.id_ruta AS id,
        b.id_ruta AS id_ruta,
        COALESCE(ge.fecha, gt.fecha, b.fecha) AS fecha,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.estado)), ''), NULLIF(LTRIM(RTRIM(gt.estado)), ''), b.estado) AS estado,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.actividad)), ''), NULLIF(LTRIM(RTRIM(gt.actividad)), ''), b.actividad) AS actividad,
        b.id_tecnico,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.cuenta_sf)), ''), NULLIF(LTRIM(RTRIM(gt.cuenta_sf)), ''), b.cuenta_sf) AS cuenta_sf,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.salesforce)), ''), NULLIF(LTRIM(RTRIM(gt.salesforce)), ''), b.salesforce) AS salesforce,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.habilidad)), ''), NULLIF(LTRIM(RTRIM(gt.habilidad)), ''), b.habilidad) AS habilidad,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.vehiculo)), ''), NULLIF(LTRIM(RTRIM(gt.vehiculo)), ''), b.vehiculo) AS vehiculo,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.grupo)), ''), NULLIF(LTRIM(RTRIM(gt.grupo)), ''), b.grupo) AS grupo,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.almacen)), ''), NULLIF(LTRIM(RTRIM(gt.almacen)), ''), b.almacen) AS almacen,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.grupoDigitacion)), ''), NULLIF(LTRIM(RTRIM(gt.grupoDigitacion)), ''), b.grupoDigitacion) AS grupoDigitacion,
        COALESCE(ge.idUsuarioDigitador, gt.idUsuarioDigitador) AS idUsuarioDigitador,
        COALESCE(ge.digitador, gt.digitador) AS digitador,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.tecnico)), ''), NULLIF(LTRIM(RTRIM(gt.tecnico)), ''), b.tecnico) AS tecnico,
        COALESCE(ge.id_tecnicoAuxiliar, gt.id_tecnicoAuxiliar) AS id_tecnicoAuxiliar,
        COALESCE(ge.auxiliar, gt.auxiliar) AS auxiliar,
        COALESCE(ge.idUsuarioSupervisor, gt.idUsuarioSupervisor) AS idUsuarioSupervisor,
        COALESCE(ge.supervisorACargo, gt.supervisorACargo) AS supervisorACargo,
        COALESCE(NULLIF(LTRIM(RTRIM(ge.sucursal)), ''), NULLIF(LTRIM(RTRIM(gt.sucursal)), ''), b.sucursal) AS sucursal,
        COALESCE(ge.observacion, gt.observacion) AS observacion,
        COALESCE(ge.idUsuarioRegistra, gt.idUsuarioRegistra) AS idUsuarioRegistra,
        COALESCE(ge.fechaRegistro, gt.fechaRegistro, b.fechaRegistro) AS fechaRegistro,
        COALESCE(ge.e_eliminado, gt.e_eliminado, b.e_eliminado) AS e_eliminado
    FROM BaseCuadrillas b
    LEFT JOIN GuardadasGrupo ge
        ON ge.id_tecnico = b.id_tecnico
       AND UPPER(LTRIM(RTRIM(ISNULL(ge.grupo, '')))) = UPPER(LTRIM(RTRIM(ISNULL(b.grupo, ''))))
       AND ge.rn = 1
    LEFT JOIN GuardadasTecnico gt
        ON gt.id_tecnico = b.id_tecnico
       AND gt.rn = 1
    WHERE @SucursalNormalizada IS NULL
       OR UPPER(LTRIM(RTRIM(ISNULL(COALESCE(ge.sucursal, gt.sucursal, b.sucursal), '')))) = UPPER(@SucursalNormalizada)
    ORDER BY
        COALESCE(ge.e_eliminado, gt.e_eliminado, b.e_eliminado),
        COALESCE(ge.grupo, gt.grupo, b.grupo),
        COALESCE(ge.tecnico, gt.tecnico, b.tecnico),
        b.id_ruta;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerconformacioncuadrillawebporid]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerconformacioncuadrillawebporid] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerConformacionCuadrillaWebPorId
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    ),
    BaseRow AS (
        SELECT TOP 1
            CAST(r.Id_Ruta AS BIGINT) AS id_ruta,
            CAST(GETDATE() AS DATE) AS fecha,
            CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
            CAST(
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(r.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                        THEN UPPER(LTRIM(RTRIM(r.Tipo)))
                    ELSE 'TITULAR'
                END
                AS NVARCHAR(20)
            ) AS actividad,
            v.Id_Vendedor AS id_tecnico,
            v.CuentaSF AS cuenta_sf,
            v.SalesForce AS salesforce,
            v.Habilidad AS habilidad,
            v.Vehiculo AS vehiculo,
            r.Nombre AS grupo,
            COALESCE(NULLIF(LTRIM(RTRIM(r.BodegaTigo)), ''), NULLIF(LTRIM(RTRIM(r.almacenTigo)), '')) AS almacen,
            COALESCE(NULLIF(LTRIM(RTRIM(r.almacenTigo)), ''), NULLIF(LTRIM(RTRIM(r.BodegaTigo)), '')) AS grupoDigitacion,
            v.Nombre AS tecnico,
            va.sucursal AS sucursal,
            GETDATE() AS fechaRegistro,
            CONVERT(BIT, ISNULL(r.E_Eliminado, 0)) AS e_eliminado
        FROM dbo.tbl_Ruta r
        INNER JOIN dbo.tbl_Vendedor v
            ON v.Id_Vendedor = r.Id_Vendedor
        CROSS JOIN VersionActual va
        WHERE r.Id_Ruta = @Id
          AND v.E_Eliminado = 0
    ),
    GuardadaGrupo AS (
        SELECT TOP 1 g.*
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb g
        INNER JOIN BaseRow b
            ON b.id_tecnico = g.id_tecnico
           AND UPPER(LTRIM(RTRIM(ISNULL(g.grupo, '')))) = UPPER(LTRIM(RTRIM(ISNULL(b.grupo, ''))))
        WHERE ISNULL(g.e_eliminado, 0) = 0
        ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
    ),
    GuardadaTecnico AS (
        SELECT TOP 1 g.*
        FROM dbo.tbl_ConformacionCuadrillaDiarioWeb g
        INNER JOIN BaseRow b
            ON b.id_tecnico = g.id_tecnico
        WHERE ISNULL(g.e_eliminado, 0) = 0
        ORDER BY ISNULL(g.fechaRegistro, '19000101') DESC, g.id DESC
    )
    SELECT TOP 1
        b.id_ruta AS id,
        b.id_ruta,
        COALESCE(gg.fecha, gt.fecha, b.fecha) AS fecha,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.estado)), ''), NULLIF(LTRIM(RTRIM(gt.estado)), ''), b.estado) AS estado,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.actividad)), ''), NULLIF(LTRIM(RTRIM(gt.actividad)), ''), b.actividad) AS actividad,
        b.id_tecnico,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.cuenta_sf)), ''), NULLIF(LTRIM(RTRIM(gt.cuenta_sf)), ''), b.cuenta_sf) AS cuenta_sf,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.salesforce)), ''), NULLIF(LTRIM(RTRIM(gt.salesforce)), ''), b.salesforce) AS salesforce,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.habilidad)), ''), NULLIF(LTRIM(RTRIM(gt.habilidad)), ''), b.habilidad) AS habilidad,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.vehiculo)), ''), NULLIF(LTRIM(RTRIM(gt.vehiculo)), ''), b.vehiculo) AS vehiculo,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.grupo)), ''), NULLIF(LTRIM(RTRIM(gt.grupo)), ''), b.grupo) AS grupo,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.almacen)), ''), NULLIF(LTRIM(RTRIM(gt.almacen)), ''), b.almacen) AS almacen,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.grupoDigitacion)), ''), NULLIF(LTRIM(RTRIM(gt.grupoDigitacion)), ''), b.grupoDigitacion) AS grupoDigitacion,
        COALESCE(gg.idUsuarioDigitador, gt.idUsuarioDigitador) AS idUsuarioDigitador,
        COALESCE(gg.digitador, gt.digitador) AS digitador,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.tecnico)), ''), NULLIF(LTRIM(RTRIM(gt.tecnico)), ''), b.tecnico) AS tecnico,
        COALESCE(gg.id_tecnicoAuxiliar, gt.id_tecnicoAuxiliar) AS id_tecnicoAuxiliar,
        COALESCE(gg.auxiliar, gt.auxiliar) AS auxiliar,
        COALESCE(gg.idUsuarioSupervisor, gt.idUsuarioSupervisor) AS idUsuarioSupervisor,
        COALESCE(gg.supervisorACargo, gt.supervisorACargo) AS supervisorACargo,
        COALESCE(NULLIF(LTRIM(RTRIM(gg.sucursal)), ''), NULLIF(LTRIM(RTRIM(gt.sucursal)), ''), b.sucursal) AS sucursal,
        COALESCE(gg.observacion, gt.observacion) AS observacion,
        COALESCE(gg.idUsuarioRegistra, gt.idUsuarioRegistra) AS idUsuarioRegistra,
        COALESCE(gg.fechaRegistro, gt.fechaRegistro, b.fechaRegistro) AS fechaRegistro,
        COALESCE(gg.e_eliminado, gt.e_eliminado, b.e_eliminado) AS e_eliminado
    FROM BaseRow b
    LEFT JOIN GuardadaGrupo gg
        ON gg.id_tecnico = b.id_tecnico
       AND UPPER(LTRIM(RTRIM(ISNULL(gg.grupo, '')))) = UPPER(LTRIM(RTRIM(ISNULL(b.grupo, ''))))
    LEFT JOIN GuardadaTecnico gt
        ON gt.id_tecnico = b.id_tecnico;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerdatostecnicoconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerdatostecnicoconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerDatosTecnicoConformacionCuadrillaWeb]   --389
    @Id_Tecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH VersionActual AS (
        SELECT TOP 1 LTRIM(RTRIM(v.sucursal)) AS sucursal
        FROM dbo.tbl_version v
        WHERE v.sucursal IS NOT NULL
          AND LTRIM(RTRIM(v.sucursal)) <> ''
    )
    SELECT TOP 1
        v.Id_tecnico AS id_tecnico,
        v.tecnico AS tecnico,
        v.Cuenta_SF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        v.Idgrupo AS id,
        v.Grupo AS id_ruta,
        CAST(GETDATE() AS DATE) AS fecha,
        CAST('PENDIENTE' AS NVARCHAR(20)) AS estado,
        CAST(
            CASE
                WHEN UPPER(LTRIM(RTRIM(ISNULL(ruta.Tipo, '')))) IN ('TITULAR', 'BACKUP')
                    THEN UPPER(LTRIM(RTRIM(ruta.Tipo)))
                ELSE 'TITULAR'
            END
            AS NVARCHAR(20)
        ) AS actividad,
        ruta.Nombre AS grupo,
        COALESCE(NULLIF(LTRIM(RTRIM(ruta.BodegaTigo)), ''), NULLIF(LTRIM(RTRIM(ruta.almacenTigo)), '')) AS almacen,
        COALESCE(NULLIF(LTRIM(RTRIM(ruta.almacenTigo)), ''), NULLIF(LTRIM(RTRIM(ruta.BodegaTigo)), '')) AS grupoDigitacion,
        idUsuarioDigitador AS idUsuarioDigitador,
        digitador AS digitador,
        idtecnicoAuxiliar,
        tecnicoAuxiliar auxiliar,
        idUsuarioSupervisor,
        supervisorACargo,
        va.sucursal AS sucursal,
        CAST(NULL AS NVARCHAR(500)) AS observacion,
        CAST(NULL AS INT) AS idUsuarioRegistra,
        GETDATE() AS fechaRegistro,
        CONVERT(BIT, ISNULL(ruta.E_Eliminado, 0)) AS e_eliminado
    FROM dbo.tbl_conformacioncuadrillabackoffice v
    OUTER APPLY (
        SELECT TOP 1 r.*
        FROM dbo.tbl_Ruta r
        WHERE r.Id_Vendedor = v.Id_tecnico
          AND ISNULL(r.E_Eliminado, 0) = 0
        ORDER BY r.Id_Ruta DESC   -- última ruta
    ) ruta
    CROSS JOIN VersionActual va
    WHERE v.Id_tecnico = @Id_Tecnico
      AND v.E_Eliminado = 0
    ORDER BY v.fechaRegistro DESC; -- último registro del técnico
END

--select * from tbl_conformacioncuadrillabackoffice
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerdatostecnicocuadrilla]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerdatostecnicocuadrilla] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerDatosTecnicoCuadrilla
    @Id_Tecnico INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        v.*,
        r.*,
        (SELECT TOP 1 sucursal FROM dbo.tbl_version) AS sucursal
    FROM dbo.tbl_Vendedor v
    LEFT JOIN dbo.tbl_Ruta r ON r.Id_Vendedor = v.Id_Vendedor AND r.E_Eliminado = 0
    WHERE v.Id_Vendedor = @Id_Tecnico
      AND v.E_Eliminado = 0
    ORDER BY r.Id_Ruta;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerdigitadores]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerdigitadores] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerDigitadores
AS
BEGIN
    SET NOCOUNT ON;

    SELECT u.Id_Usuario,
           u.Nombre,
           u.Loggin,
           u.Id_Rol
    FROM dbo.tbl_Usuario u
    WHERE u.E_Eliminado = 0
      AND u.Id_Rol = 3
    ORDER BY u.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerdigitadoresconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerdigitadoresconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerDigitadoresConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.Id_Usuario AS idUsuarioDigitador,
        u.Nombre AS digitador,
        r.Nombre AS rol,
        u.*
    FROM dbo.tbl_Usuario u
    LEFT JOIN dbo.tbl_Rol r
        ON r.Id_Rol = u.Id_Rol
    WHERE u.E_Eliminado = 0
      AND u.Id_Rol = 3
    ORDER BY u.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerlistadigitadores]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerlistadigitadores] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerListaDigitadores]
as
select u.id_usuario Código, u.Nombre,Loggin,TipoUsuario EsAdmin,tu.Id_Rol , tu.Nombre Rol,CodEmpleado
from tbl_usuario u inner join tbl_Rol tu on tu.id_rol=u.id_rol
where u.E_Eliminado=0 
and u.id_rol=3
order by u.nombre
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerlistadoconformacioncuadrillabackoffice]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerlistadoconformacioncuadrillabackoffice] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerListadoConformacionCuadrillaBackOffice]
as
	select * FROM tbl_ConformacionCuadrillaBackOffice where e_eliminado=0 order by id desc
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerlistausuario]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerlistausuario] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerListaUsuario]
as
select u.id_usuario Código, u.Nombre,Loggin,TipoUsuario EsAdmin,tu.Id_Rol , tu.Nombre Rol,CodEmpleado
from tbl_usuario u inner join tbl_Rol tu on tu.id_rol=u.id_rol
where u.E_Eliminado=0 order by u.nombre
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerplacavehiculos_tecnico]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerplacavehiculos_tecnico] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerPlacavehiculos_Tecnico]--53
as
select id, placa,sucursal,case when  v.Nombre is null then '' else v.Nombre end Tecnico
from tbl_placaVehiculo pv left join tbl_vendedor v on v.vehiculo=pv.placa
where pv.e_eliminado=0 order by pv.placa
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerprivilegiosroldetalle]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerprivilegiosroldetalle] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerPrivilegiosRolDetalle
    @IdRol INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdRol IS NULL
    BEGIN
        RAISERROR('IdRol es requerido.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.tbl_Rol r
        WHERE r.Id_Rol = @IdRol
          AND ISNULL(r.E_Eliminado, 0) = 0
    )
    BEGIN
        RAISERROR('Rol no encontrado o inactivo.', 16, 1);
        RETURN;
    END

    SELECT m.ID_MENU AS Id_Menu,
           m.NOMBRE AS Nombre,
           m.NIVEL AS Nivel,
           m.PADRE AS Padre,
           CASE
               WHEN rm.Id_RolMenu IS NULL THEN CAST(0 AS bit)
               ELSE CAST(1 AS bit)
           END AS Asignado
    FROM dbo.tbl_Tabla_Menu m
    LEFT JOIN dbo.tbl_RolMenu rm
           ON rm.Id_Menu = m.ID_MENU
          AND rm.Id_Rol = @IdRol
          AND ISNULL(rm.E_Eliminado, 0) = 0
    WHERE ISNULL(m.E_Eliminado, 0) = 0
    ORDER BY m.PADRE, m.NIVEL, m.ID_MENU;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerprivilegiosroles]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerprivilegiosroles] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerPrivilegiosRoles
AS
BEGIN
    SET NOCOUNT ON;

    SELECT r.Id_Rol,
           r.Nombre AS Rol
    FROM dbo.tbl_Rol r
    WHERE ISNULL(r.E_Eliminado, 0) = 0
    ORDER BY r.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerramal]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerramal] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE spx_ObtenerRamal
as
select * from tbl_ramal where e_eliminado=0
GO
IF OBJECT_ID(N'[dbo].[spx_obtenerrutaxidtecnico]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenerrutaxidtecnico] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerRutaXIdTecnico]
    @Id_Tecnico INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF OBJECT_ID('dbo.tbl_Ruta', 'U') IS NULL
    BEGIN
        RAISERROR('No existe la tabla dbo.tbl_Ruta.', 16, 1);
        RETURN;
    END

    DECLARE @sql NVARCHAR(MAX);

    SET @sql = N'
    SELECT
        r.Id_Ruta AS id_ruta,
        r.Nombre AS cuadrilla,
        r.Nombre AS ruta,
        r.Id_Vendedor AS id_tecnico,'
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'Tipo') IS NOT NULL
            THEN N' r.Tipo AS tipo,'
            ELSE N' CAST(NULL AS NVARCHAR(50)) AS tipo,'
          END
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'visible') IS NOT NULL
            THEN N' r.visible AS visible,'
            ELSE N' CAST(NULL AS BIT) AS visible,'
          END
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'BodegaTigo') IS NOT NULL
            THEN N' r.BodegaTigo AS bodega_tigo,'
            ELSE N' CAST(NULL AS NVARCHAR(250)) AS bodega_tigo,'
          END
        + CASE WHEN COL_LENGTH('dbo.tbl_Ruta', 'almacenTigo') IS NOT NULL
            THEN N' r.almacenTigo AS almacen_tigo,'
            ELSE N' CAST(NULL AS NVARCHAR(250)) AS almacen_tigo,'
          END
        + N'
        r.Id_Ruta,
        r.Id_Vendedor,
        v.Nombre AS NombreTecnico,
        v.CuentaSF,
        v.SalesForce
    FROM dbo.tbl_Ruta r
    INNER JOIN dbo.tbl_vendedor v ON r.id_vendedor = v.id_vendedor
    WHERE ISNULL(r.E_Eliminado, 0) = 0
      AND (v.grupodigitacion IS NOT NULL AND v.grupodigitacion <> '''')
      AND (@Id_Tecnico IS NULL OR r.Id_Vendedor = @Id_Tecnico)
    ORDER BY r.Nombre;';

    EXEC sp_executesql @sql, N'@Id_Tecnico INT', @Id_Tecnico = @Id_Tecnico;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenersucursalesconexion]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenersucursalesconexion] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerSucursalesConexion]
as 
select * from tbl_Sucursal where E_Eliminado=0
---and SucursalConexionWeb =1 
 order by Sucursal
GO
IF OBJECT_ID(N'[dbo].[spx_obtenersucursalesconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenersucursalesconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerSucursalesConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        LTRIM(RTRIM(v.sucursal)) AS sucursal
    FROM dbo.tbl_version v
    WHERE v.sucursal IS NOT NULL
      AND LTRIM(RTRIM(v.sucursal)) <> ''
    ORDER BY sucursal;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenersupervisores]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenersupervisores] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerSupervisores
AS
BEGIN
    SET NOCOUNT ON;

    SELECT u.Id_Usuario,
           u.Nombre,
           u.Loggin,
           u.Id_Rol,
           r.Nombre AS Rol
    FROM dbo.tbl_Usuario u
    INNER JOIN dbo.tbl_Rol r ON r.Id_Rol = u.Id_Rol
    WHERE u.E_Eliminado = 0
      AND (r.Nombre = 'Supervisor' OR r.Nombre LIKE '%supervisor%')
    ORDER BY u.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenersupervisoresconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenersupervisoresconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ObtenerSupervisoresConformacionCuadrillaWeb
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        u.Id_Usuario AS idUsuarioSupervisor,
        u.Nombre AS supervisorACargo,
        r.Nombre AS rol,
        u.*
    FROM dbo.tbl_Usuario u
    INNER JOIN dbo.tbl_Rol r
        ON r.Id_Rol = u.Id_Rol
    WHERE u.E_Eliminado = 0
      AND (r.Nombre = 'Supervisor' OR r.Nombre LIKE '%supervisor%')
    ORDER BY u.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenertecnicosconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenertecnicosconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerTecnicosConformacionCuadrillaWeb]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        v.Id_Vendedor AS id_tecnico,
        v.Nombre AS tecnico,
        v.CuentaSF AS cuenta_sf,
        v.SalesForce AS salesforce,
        v.Habilidad AS habilidad,
        v.Vehiculo AS vehiculo,
        r.Id_Ruta AS id_ruta,
        r.Nombre AS grupo,
        r.BodegaTigo AS almacen,
        r.almacenTigo AS grupoDigitacion,
        v.*
    FROM dbo.tbl_Vendedor v inner join tbl_Ruta r on r.id_vendedor=v.id_vendedor 
    
    WHERE v.E_Eliminado = 0 and v.id_vendedor >0 and r.e_eliminado=0 and (v.cuentasf is not null and v.cuentasf <>'')
    and (v.salesforce is not null and v.salesforce <>'')
    ORDER BY v.Nombre;
END
GO
IF OBJECT_ID(N'[dbo].[spx_obtenertecnicosenruta]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenertecnicosenruta] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerTecnicosEnRuta]
as
select * from tbl_vendedor where e_eliminado=0 and id_vendedor in (
	select id_vendedor from tbl_ruta where e_eliminado=0 
)and id_vendedor>0
order by nombre
GO
IF OBJECT_ID(N'[dbo].[spx_obtenertiposervicio]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenertiposervicio] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE spx_ObtenerTipoServicio
as
select * from tbl_tiposervicio where e_eliminado=0 order by prefijo
GO
IF OBJECT_ID(N'[dbo].[spx_obtenertipotecnologia]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenertipotecnologia] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE spx_ObtenerTipoTecnologia(@id_ruta int)
as

select * from tbl_tipotecnologia where e_eliminado=0
and tipoGrupo in (select tipoGrupo from tbl_ruta where id_ruta=@id_ruta)
GO
IF OBJECT_ID(N'[dbo].[spx_obtenervehiculosconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_obtenervehiculosconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ObtenerVehiculosConformacionCuadrillaWeb]
AS



select * from dbo.tbl_placaVehiculo
where e_eliminado=0 
and placa not in (select vehiculo from tbl_vendedor where e_eliminado=0 and vehiculo is not null)
GO
IF OBJECT_ID(N'[dbo].[spx_registrarconformacioncuadrillabackoffice]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_registrarconformacioncuadrillabackoffice] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_RegistrarConformacionCuadrillaBackOffice
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.tbl_ConformacionCuadrillaDiario (
        fecha,
        estado,
        actividad,
        id_tecnico,
        cuenta_sf,
        salesforce,
        habilidad,
        vehiculo,
        [grupo],
        almacen,
        grupoDigitacion,
        idUsuarioDigitador,
        digitador,
        tecnico,
        id_tecnicoAuxiliar,
        auxiliar,
        idUsuarioSupervisor,
        supervisorACargo,
        sucursal,
        observacion,
        idUsuarioRegistra,
        fechaRegistro,
        e_eliminado
    )
    VALUES (
        ISNULL(@Fecha, CAST(GETDATE() AS DATE)),
        @Estado,
        @Actividad,
        @Id_Tecnico,
        @Cuenta_SF,
        @Salesforce,
        @Habilidad,
        @Vehiculo,
        @Grupo,
        @Almacen,
        @GrupoDigitacion,
        @IdUsuarioDigitador,
        @Digitador,
        @Tecnico,
        @Id_TecnicoAuxiliar,
        @Auxiliar,
        @IdUsuarioSupervisor,
        @SupervisorACargo,
        @Sucursal,
        @Observacion,
        @IdUsuarioRegistra,
        GETDATE(),
        0
    );
END
GO
IF OBJECT_ID(N'[dbo].[spx_registrarconformacioncuadrillaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_registrarconformacioncuadrillaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_RegistrarConformacionCuadrillaWeb
    @Fecha DATE = NULL,
    @Estado NVARCHAR(50),
    @Actividad NVARCHAR(50),
    @Id_Tecnico INT,
    @Cuenta_SF NVARCHAR(100) = NULL,
    @Salesforce NVARCHAR(100) = NULL,
    @Habilidad NVARCHAR(100) = NULL,
    @Vehiculo NVARCHAR(100) = NULL,
    @Grupo NVARCHAR(100) = NULL,
    @Almacen NVARCHAR(100) = NULL,
    @GrupoDigitacion NVARCHAR(100) = NULL,
    @IdUsuarioDigitador INT = NULL,
    @Digitador NVARCHAR(150) = NULL,
    @Tecnico NVARCHAR(150) = NULL,
    @Id_TecnicoAuxiliar INT = NULL,
    @Auxiliar NVARCHAR(150) = NULL,
    @IdUsuarioSupervisor INT,
    @SupervisorACargo NVARCHAR(150) = NULL,
    @Sucursal NVARCHAR(100),
    @Observacion NVARCHAR(500) = NULL,
    @IdUsuarioRegistra INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.tbl_ConformacionCuadrillaDiarioWeb (
        fecha,
        estado,
        actividad,
        id_tecnico,
        cuenta_sf,
        salesforce,
        habilidad,
        vehiculo,
        [grupo],
        almacen,
        grupoDigitacion,
        idUsuarioDigitador,
        digitador,
        tecnico,
        id_tecnicoAuxiliar,
        auxiliar,
        idUsuarioSupervisor,
        supervisorACargo,
        sucursal,
        observacion,
        idUsuarioRegistra,
        fechaRegistro,
        e_eliminado
    )
    VALUES (
        ISNULL(@Fecha, CAST(GETDATE() AS DATE)),
        @Estado,
        @Actividad,
        @Id_Tecnico,
        @Cuenta_SF,
        @Salesforce,
        @Habilidad,
        @Vehiculo,
        @Grupo,
        @Almacen,
        @GrupoDigitacion,
        @IdUsuarioDigitador,
        @Digitador,
        @Tecnico,
        @Id_TecnicoAuxiliar,
        @Auxiliar,
        @IdUsuarioSupervisor,
        @SupervisorACargo,
        @Sucursal,
        @Observacion,
        @IdUsuarioRegistra,
        GETDATE(),
        0
    );

    SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS id;
END
GO
IF OBJECT_ID(N'[dbo].[spx_registrarordentrabajo]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_registrarordentrabajo] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_RegistrarOrdenTrabajo
    @Id_Usuario INT,
    @Id_Ruta INT,
    @Id_TipoServicio INT,
    @CodigoCliente INT = NULL,
    @Id_Estado INT = NULL,
    @Observacion NVARCHAR(255) = NULL,
    @TieneObservacion BIT = 0,
    @Id_Sucursal INT = NULL,
    @NombreCliente NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Id_Usuario IS NULL OR @Id_Ruta IS NULL OR @Id_TipoServicio IS NULL
    BEGIN
        RAISERROR('Parametros requeridos faltantes.', 16, 1);
        RETURN;
    END

    IF @TieneObservacion = 1 AND ( @Observacion IS NULL OR LTRIM(RTRIM(@Observacion)) = '' )
    BEGIN
        RAISERROR('Observacion requerida cuando TieneObservacion=1.', 16, 1);
        RETURN;
    END

    DECLARE @Id_Vendedor INT;
    SELECT @Id_Vendedor = Id_Vendedor
    FROM dbo.tbl_Ruta
    WHERE Id_Ruta = @Id_Ruta AND E_Eliminado = 0;

    IF @Id_Vendedor IS NULL
    BEGIN
        RAISERROR('Ruta no valida.', 16, 1);
        RETURN;
    END

    DECLARE @OrdenTrabajo INT;

    BEGIN TRAN;
        -- Bloqueo pesimista: evita que dos sesiones tomen el mismo OrdenTrabajo
        SELECT @OrdenTrabajo = ISNULL(MAX(OrdenTrabajo), 0) + 1
        FROM dbo.tbl_Venta WITH (TABLOCKX, HOLDLOCK);

        INSERT INTO dbo.tbl_Venta (
            Id_Usuario,
            Id_Vendedor,
            Id_Ruta,
            Id_TipoServicio,
            Fecha_Ejecucion,
            Fecha_Registro,
            OrdenTrabajo,
            Observacion,
            Total,
            Id_UsuarioE,
            E_Eliminado,
            Nombre,
            Id_Estado,
            Id_Sucursal,
            CodigoCliente,
            TieneObservacion
        )
        VALUES (
            @Id_Usuario,
            @Id_Vendedor,
            @Id_Ruta,
            @Id_TipoServicio,
            GETDATE(),
            GETDATE(),
            @OrdenTrabajo,
            @Observacion,
            NULL,
            NULL,
            0,
            @NombreCliente,
            @Id_Estado,
            @Id_Sucursal,
            @CodigoCliente,
            @TieneObservacion
        );
    COMMIT TRAN;

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Id_Venta, @OrdenTrabajo AS OrdenTrabajo;
END
GO
IF OBJECT_ID(N'[dbo].[spx_registrarventapararegistrootwb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_registrarventapararegistrootwb] AS BEGIN SET NOCOUNT ON; END');
GO
--select * from tbl_venta
CREATE PROCEDURE dbo.spx_RegistrarVentaParaRegistroOTwb
    @Id_Usuario INT,
    @Id_Vendedor INT,
    @Id_Grupo INT,
    @Id_TipoServicio INT,
    @OrdenTrabajo INT,
    @Observacion NVARCHAR(MAX) = NULL,
    @Total DECIMAL(18,2) = 0,
    @Id_UsuarioE INT = NULL,
    @E_Eliminado BIT = 0,
    @Nombre NVARCHAR(250) = NULL,
    @Origen NVARCHAR(100),            -- NUEVO
    @Id_Estado INT,
    @Id_Sucursal INT,
    @CodigoCliente INT,
    @TieneObservacion BIT = 0,
    @Latitud DECIMAL(9,6) = NULL,
    @Longitud DECIMAL(9,6) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @Origen IS NULL OR LTRIM(RTRIM(@Origen)) = ''
        BEGIN
            RAISERROR('Origen es requerido.',16,1);
            RETURN;
        END

        IF COL_LENGTH('dbo.tbl_venta', 'Origen') IS NULL
        BEGIN
            RAISERROR('La columna Origen no existe en dbo.tbl_venta.',16,1);
            RETURN;
        END

        BEGIN TRANSACTION;

        INSERT INTO dbo.tbl_venta (
            Id_Usuario,
            Id_Vendedor,
            Id_Ruta,
            Id_TipoServicio,
            Fecha_Ejecucion,
            Fecha_Registro,
            OrdenTrabajo,
            Observacion,
            Total,
            Id_UsuarioE,
            E_Eliminado,
            Nombre,
            Origen,                     -- NUEVO
            Id_Estado,
            Id_Sucursal,
            CodigoCliente,
            TieneObservacion,
            Latitud,
            Longitud
        )
        VALUES (
            @Id_Usuario,
            @Id_Vendedor,
            @Id_Grupo,
            @Id_TipoServicio,
            GETDATE(),
            GETDATE(),
            @OrdenTrabajo,
            @Observacion,
            ISNULL(@Total,0),
            @Id_UsuarioE,
            ISNULL(@E_Eliminado,0),
            @Nombre,
            @Origen,                    -- NUEVO
            @Id_Estado,
            @Id_Sucursal,
            @CodigoCliente,
            ISNULL(@TieneObservacion,0),
            @Latitud,
            @Longitud
        );

        DECLARE @Id_Venta INT;
        SET @Id_Venta = CAST(SCOPE_IDENTITY() AS INT);

        COMMIT TRANSACTION;

        SELECT
            @Id_Venta AS Id_Venta,
            @OrdenTrabajo AS OrdenTrabajo,
            @CodigoCliente AS CodigoCliente,
            @Id_Sucursal AS Id_Sucursal,
            @Origen AS Origen,
            @Latitud AS Latitud,
            @Longitud AS Longitud;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        DECLARE @ErrMsg NVARCHAR(4000);
        SET @ErrMsg = ERROR_MESSAGE();
        RAISERROR(@ErrMsg,16,1);
    END CATCH
END;
GO
IF OBJECT_ID(N'[dbo].[spx_sepuedemodificarordentrabajo]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_sepuedemodificarordentrabajo] AS BEGIN SET NOCOUNT ON; END');
GO
--spx_SePuedeModificarOrdenTrabajo '31/05/2021','01/06/2021',1
--select top 55* from tbl_venta order by id_venta desc
CREATE proc [dbo].[spx_SePuedeModificarOrdenTrabajo](@fechaVieja datetime, @fechaNueva datetime, @id_ruta int)
as
declare @tablarespuesta table(sepuede nvarchar(50),observacion nvarchar(250))
declare @SePuede nvarchar(50), @Observacion nvarchar(250)
set @Observacion =''

declare @hayCierreAlmacen int, @hayCierreAlmacenPR_PD int
set @hayCierreAlmacen = (select count(id_cierrealmacen) from tbl_cierrealmacen where dbo.dateonly(fecha) between dbo.dateonly(@fechaVieja) and dbo.dateonly(@fechaNueva) and e_eliminado=0)
--select @hayCierreAlmacen 
set @hayCierreAlmacenPR_PD = (select count(id_cierrealmacenpr_pd) from tbl_cierrealmacenPR_PD where dbo.dateonly(fecha) between dbo.dateonly(@fechaVieja) and dbo.dateonly(@fechaNueva) and e_eliminado=0)
--select @hayCierreAlmacenPR_PD 

if(@hayCierreAlmacen<= 0 AND @hayCierreAlmacenPR_PD<=0)
begin
		declare @hayCuadre int
		set @hayCuadre = (select count(id_cuadre) from tbl_cuadre 
					where dbo.dateonly(fecha) > dbo.dateonly(@fechaVieja) and dbo.dateonly(fecha)<= dbo.dateonly(@fechaNueva) and e_eliminado=0
					and id_ruta =@id_ruta)
		

		declare @hayPedido int
		set @hayPedido = (select count(id_pedidovendedor) from tbl_pedidovendedor 
					where dbo.dateonly(fecha) > dbo.dateonly(@fechaVieja) and dbo.dateonly(fecha)<= dbo.dateonly(@fechaNueva) and e_eliminado=0
					and id_ruta =@id_ruta)
		

		declare @hayDevolucion int
		set @hayDevolucion = (select count(id_devolucion) from tbl_devolucion 
					where dbo.dateonly(fecha) > dbo.dateonly(@fechaVieja) and dbo.dateonly(fecha)<= dbo.dateonly(@fechaNueva) and e_eliminado=0
					and id_ruta =@id_ruta)
		

		declare @hayBaja int
		set @hayBaja = (select count(id_bajaproductos) from tbl_Bajaproductos 
					where dbo.dateonly(fecha) > dbo.dateonly(@fechaVieja) and dbo.dateonly(fecha)<= dbo.dateonly(@fechaNueva) and e_eliminado=0
					and id_ruta =@id_ruta)
		if(@hayCuadre<= 0 and @hayPedido<=0 and @hayDevolucion<=0 and @hayBaja<=0)
		begin 
			set @SePuede='SePuede'
		end
		else
		begin
			set @SePuede='NoSePuede'
			set @observacion='Hay transacciones realizadas'	
		end 
end
else 
begin
	set @SePuede='NoSePuede'
	set @observacion='Hay cierres registrados'	
end
insert into @tablarespuesta values (@sepuede,@observacion)
select * from @tablarespuesta
GO
IF OBJECT_ID(N'[dbo].[spx_traerdatoseriechipidcu_cunr2]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_traerdatoseriechipidcu_cunr2] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_TraerDatoSerieChipIdCU_CUNR2](@serial nvarchar(70),@chipid nvarchar(70))
as
begin
declare @EstadosPermitidos table(id_Estado int)
insert into @EstadosPermitidos select id_estadoproducto from tbl_estadoproducto where id_estadoproducto in (17)

declare @Existe nvarchar(150), @SePuede nvarchar(150),@Observacion nvarchar(150)
declare @contador int ,@contador2 int
declare @tablaDatos table(Id_Productos int, serial nvarchar(150),chipid nvarchar(150),id_EstadoProducto int,EstadoProducto nvarchar(150),id_Ruta int, id_producto int ,nombre nvarchar(250),Tipo nvarchar(100),Ruta nvarchar(100))
declare @Resultado table(Id_Producto int, serial nvarchar(150),chipid nvarchar(150),EstadoProducto nvarchar(250),nombre nvarchar(250))
declare @ResultadoCorto table(Existe nvarchar(150),SePuede nvarchar(150), Observacion nvarchar(150))

	insert into @tablaDatos 
		select ps.Id_Productos,ps.Serial,ps.ChipId,ps.Id_EstadoProducto,ep.Nombre,ps.Id_Ruta,ps.Id_Producto,
		p.nombre,'EsSerial'Tipo,(select nombre from tbl_ruta where id_ruta=ps.Id_Ruta) Ruta
		from tbl_productos ps inner join tbl_producto p on p.id_producto = ps.id_producto inner join tbl_estadoproducto ep on ep.id_estadoproducto = ps.id_estadoproducto
		where serial=@serial and chipid=@chipid and ps.e_eliminado=0
		--union all
		--select ps.Id_Productos,ps.Serial,ps.ChipId,ps.Id_EstadoProducto,ep.Nombre,ps.Id_Ruta,ps.Id_Producto,
		--p.nombre,'EsChipId'Tipo ,(select nombre from tbl_ruta where id_ruta=ps.Id_Ruta) Ruta
		--from tbl_productos ps inner join tbl_producto p on p.id_producto = ps.id_producto inner join tbl_estadoproducto ep on ep.id_estadoproducto = ps.id_estadoproducto
		--where chipid=@serial and ps.e_eliminado=0
	

	set @contador = (select count(*) from @tablaDatos)
	
	if(@contador =1)
	begin	
	
		set @contador2 = (select count(*) from @tablaDatos where id_estadoproducto in (select id_estado from @EstadosPermitidos) ) --(3,12,7,15,16) )
		
		if(@contador2=1)
		begin
			set @Existe = 'Existe'
			set @SePuede ='SePuede'			
			insert into @Resultado		
			select id_producto,serial,chipid,EstadoProducto,t.nombre from @tablaDatos t 			
			where id_estadoproducto in (select id_estado from @EstadosPermitidos ) 			
		end
		else
		begin
			set @Existe = 'Existe'
			set @SePuede ='NoSePuede'
			set @Observacion ='ESTADO : ' + (select top 1 estadoproducto  from @tablaDatos)+ CHAR(13) + CHAR(10) +
							' - Grupo : ' +(select top 1 ruta  from @tablaDatos)+CHAR(13) + CHAR(10) +
							' - Producto : ' +(select top 1 nombre  from @tablaDatos)
		end
	end	
	if(@contador >1)
	begin
		set @Existe = 'Existe'
		set @SePuede ='NoSePuede'
		set @Observacion ='Serial/ChipId repetido' 
	end
	
	
	
	if(len(@Existe)>0 )
	begin
		insert into @ResultadoCorto
		select @Existe,@SePuede,@Observacion
		
		select * from @ResultadoCorto
		select * from @tablaDatos
	end
end
GO
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
IF OBJECT_ID(N'[dbo].[spx_validarusuario]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_validarusuario] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ValidarUsuario]
    @Login nvarchar(50),
    @PasswordHash varchar(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        u.Id_Usuario,
        u.Nombre,
        u.Loggin,
        u.Id_Rol,
        u.NecesitaCambio,
        u.UltimaModificacion,
        u.TipoUsuario,
        u.Id_Empleado,
        u.CodEmpleado,
        u.correo,
        r.nombre NombreRol
    FROM dbo.tbl_usuario u inner join tbl_rol r on r.id_rol=u.id_rol
    WHERE u.E_Eliminado = 0
      AND u.Loggin = @Login
      AND u.Password = @PasswordHash;
END
--select * from tbl_rol
GO
IF OBJECT_ID(N'[dbo].[spx_validarusuariosucursal]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_validarusuariosucursal] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE dbo.spx_ValidarUsuarioSucursal
    @Login nvarchar(50),
    @PasswordHash varchar(50),
    @Id_Sucursal int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        u.Id_Usuario,
        u.Nombre,
        u.Loggin,
        u.Id_Rol,
        u.NecesitaCambio,
        u.UltimaModificacion,
        u.TipoUsuario,
        u.Id_Empleado,
        u.CodEmpleado,
        u.correo,
        us.Id_Sucursal
    FROM dbo.tbl_usuario u
    INNER JOIN dbo.tbl_UsuarioSucursal us
        ON us.Id_Usuario = u.Id_Usuario
       AND us.E_Eliminado = 0
       AND us.Id_Sucursal = @Id_Sucursal
    WHERE u.E_Eliminado = 0
      AND u.Loggin = @Login
      AND u.Password = @PasswordHash;
END
GO
IF OBJECT_ID(N'[dbo].[spx_validarventaydetallewb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[spx_validarventaydetallewb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[spx_ValidarVentaYDetallewb]
    @Fecha DATETIME,
    @NroOT INT,
    @NumeroCliente INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CantidadVentas INT = 0;
    DECLARE @CantidadDetallesVenta INT = 0;
    DECLARE @CantidadDetallesCargoUsuario INT = 0;
    DECLARE @CantidadDetalles INT = 0;
    DECLARE @IdEstado INT = NULL;
    DECLARE @AddMaterial_o_CargoUsuario INT = 0;
    DECLARE @HabilitarCargarMaterial INT = 0;
	DECLARE @TieneDetalle INT = 0;

    SELECT @CantidadVentas = COUNT(1)
    FROM dbo.tbl_Venta v
    WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
      AND v.OrdenTrabajo = @NroOT
      AND v.CodigoCliente = @NumeroCliente
--      AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
      AND ISNULL(v.E_Eliminado, 0) = 0;

    IF (@CantidadVentas > 0)
    BEGIN
        SELECT TOP (1)
            @IdEstado = v.Id_Estado,
            @TieneDetalle = v.TieneDetalle
        FROM dbo.tbl_Venta v
        WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
          AND v.OrdenTrabajo = @NroOT
          AND v.CodigoCliente = @NumeroCliente
          --AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
          AND ISNULL(v.E_Eliminado, 0) = 0;

        SELECT @CantidadDetallesVenta = COUNT(1)
        FROM dbo.tbl_CodigoVenta cv
        INNER JOIN dbo.tbl_Venta v
            ON v.Id_Venta = cv.Id_Venta
        WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
          AND v.OrdenTrabajo = @NroOT
          AND v.CodigoCliente = @NumeroCliente
          AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
          AND ISNULL(v.E_Eliminado, 0) = 0
          AND ISNULL(cv.E_Eliminado, 0) = 0;

        SELECT @CantidadDetallesCargoUsuario = COUNT(1)
        FROM dbo.tbl_CodigoVentaCargoUsuario cvu
        INNER JOIN dbo.tbl_Venta v
            ON v.Id_Venta = cvu.Id_Venta
        WHERE CONVERT(DATE, v.Fecha_Ejecucion) = CONVERT(DATE, @Fecha)
          AND v.OrdenTrabajo = @NroOT
          AND v.CodigoCliente = @NumeroCliente
          AND UPPER(LTRIM(RTRIM(ISNULL(v.Origen, '')))) = 'OT_WEB'
          AND ISNULL(v.E_Eliminado, 0) = 0
          AND ISNULL(cvu.E_Eliminado, 0) = 0;
    END

    IF (@IdEstado IS NOT NULL)
    BEGIN
        SELECT TOP (1)
            @AddMaterial_o_CargoUsuario = CASE WHEN ISNULL(e.AddMaterial_o_CargoUsuario, 0) = 1 THEN 1 ELSE 0 END
        FROM dbo.tbl_estado e
        WHERE e.Id_Estado = @IdEstado
          AND ISNULL(e.E_Eliminado, 0) = 0;
    END

    SET @CantidadDetalles = ISNULL(@CantidadDetallesVenta, 0) + ISNULL(@CantidadDetallesCargoUsuario, 0);
    SET @HabilitarCargarMaterial = CASE
        WHEN @AddMaterial_o_CargoUsuario = 1
             AND @CantidadVentas > 0
             AND @CantidadDetalles = 0
        THEN 1
        ELSE 0
    END;

    SELECT
        CONVERT(DATE, @Fecha) AS Fecha,
        @NroOT AS NroOT,
        @NumeroCliente AS NumeroCliente,
        CASE WHEN @CantidadVentas > 0 THEN 1 ELSE 0 END AS ExisteVenta,
        @CantidadVentas AS CantidadVentas,
        CASE WHEN @CantidadDetalles > 0 THEN 1 ELSE 0 END AS TieneDetalleEnCodigoVenta,
        @CantidadDetalles AS CantidadDetalles,
        case when @IdEstado is null then 0 else @IdEstado end AS IdEstado,
  --      @tienedetalle TieneDetalle,
        @AddMaterial_o_CargoUsuario AS AddMaterial_o_CargoUsuario,
        case when @IdEstado=1 and @AddMaterial_o_CargoUsuario=1  then @tienedetalle else 0 end  AS TieneDetalle;
END
GO
IF OBJECT_ID(N'[dbo].[traertodoslosproductos_sinfungibleweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[traertodoslosproductos_sinfungibleweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[TraerTodosLosProductos_SinFungibleWeb]
as
select * from tbl_producto  where E_Eliminado=0 and tipomaterial='MATERIAL'
order by nombre
GO
IF OBJECT_ID(N'[dbo].[traertodoslosproductos_x_idrutaweb]', N'P') IS NULL EXEC(N'CREATE PROCEDURE [dbo].[traertodoslosproductos_x_idrutaweb] AS BEGIN SET NOCOUNT ON; END');
GO
ALTER PROCEDURE [dbo].[TraerTodosLosProductos_x_IdRutaWeb](@Id_Ruta int)
as
select pr.* 
from tbl_saldotarjetas s inner join tbl_producto pr on pr.id_producto=s.id_producto
where s.id_ruta=@Id_Ruta and s.e_eliminado=0 and s.cantidad>0 
order by Nombre Asc
GO
