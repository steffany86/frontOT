# SP nuevos (login)

Documentacion API + menus/permisos:
- `DOC_APIS_FUNCIONALIDADES_MENUS.md`

## spx_ValidarUsuario
Proposito:
- Valida credenciales del usuario (login + password hash) en la BD de la sucursal.

Entradas:
- `@Login` (nvarchar(50))
- `@PasswordHash` (varchar(50)) -> hash MD5+Base64 del password.

Salida:
- Un registro con datos del usuario si las credenciales son validas.

Tablas usadas:
- `tbl_usuario`

Notas:
- Se ejecuta en la BD de la sucursal seleccionada.
- Si no retorna filas, las credenciales son invalidas.

## spx_ValidarUsuarioSucursal (opcional)
Proposito:
- Valida credenciales y pertenencia del usuario a una sucursal especifica.

Entradas:
- `@Login` (nvarchar(50))
- `@PasswordHash` (varchar(50))
- `@Id_Sucursal` (int)

Salida:
- Un registro con datos del usuario si las credenciales son validas y esta asignado a la sucursal.

Tablas usadas:
- `tbl_usuario`
- `tbl_UsuarioSucursal`

Notas:
- Solo usar si quieres validar sucursal dentro del mismo SP.

# SP nuevos (OT)

## spx_RegistrarOrdenTrabajo
Proposito:
- Registra la cabecera de una OT (tbl_Venta).

Entradas:
- `@Id_Usuario` (int)
- `@Id_Ruta` (int)
- `@Id_TipoServicio` (int)
- `@CodigoCliente` (int, opcional)
- `@Id_Estado` (int, opcional)
- `@Observacion` (nvarchar(255), opcional)
- `@TieneObservacion` (bit, opcional)
- `@Id_Sucursal` (int, opcional)
- `@NombreCliente` (nvarchar(200), opcional)

Salida:
- `Id_Venta` generado.
- `OrdenTrabajo` generado (autoincremental).

Notas:
- Genera el `OrdenTrabajo` con bloqueo pesimista para evitar colisiones.
- Valida que la ruta sea valida y obtiene `Id_Vendedor` desde `tbl_Ruta`.

# SP nuevos (Privilegios)

Se agrego un paquete de SP para privilegios por rol en:
- `SP_NUEVOS_PRIVILEGIOS.sql`

Documentacion funcional:
- `SP_NUEVOS_PRIVILEGIOS.md`

Incluye:
- `spx_ObtenerPrivilegiosRoles`
- `spx_ObtenerPrivilegiosRolDetalle`
- `spx_GuardarPrivilegiosRol`

# SP nuevos (Cuadrillas)

Archivo SQL:
- `SP_CONFORMACION_CUADRILLA.sql`

Incluye:
- `listar-vehiculo` (catalogo de vehiculos para filtros de frontend)
