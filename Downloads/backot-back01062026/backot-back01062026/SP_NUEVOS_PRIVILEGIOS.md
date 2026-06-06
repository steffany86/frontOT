# SP nuevos (privilegios por rol)

Archivo SQL: `SP_NUEVOS_PRIVILEGIOS.sql`

## 1) `spx_ObtenerPrivilegiosRoles`
Proposito:
- Lista los roles activos para el selector de roles en frontend.

Entradas:
- Sin parametros.

Salida:
- `Id_Rol`
- `Rol`

Tablas usadas:
- `tbl_Rol`

---

## 2) `spx_ObtenerPrivilegiosRolDetalle`
Proposito:
- Devuelve todos los menus activos y marca si estan asignados al rol.

Entradas:
- `@IdRol` (int)

Salida:
- `Id_Menu`
- `Nombre`
- `Nivel`
- `Padre`
- `Asignado` (bit)

Tablas usadas:
- `tbl_tablamenu`
- `tbl_RolMenu`
- `tbl_Rol`

Notas:
- Valida que el rol exista y este activo.

---

## 3) `spx_GuardarPrivilegiosRol`
Proposito:
- Guarda la asignacion de checks de menu para un rol.
- Recibe lista CSV y aplica un "reemplazo completo" de privilegios:
  1. Desactiva privilegios actuales (`E_Eliminado = 1`)
  2. Reactiva los seleccionados (`E_Eliminado = 0`)
  3. Inserta faltantes en `tbl_RolMenu`

Entradas:
- `@IdRol` (int)
- `@MenuIdsCsv` (nvarchar(max)) ejemplo: `1,2,5,8`

Salida:
- Reutiliza `spx_ObtenerPrivilegiosRolDetalle` al final para retornar estado actual.

Tablas usadas:
- `tbl_Rol`
- `tbl_tablamenu`
- `tbl_RolMenu`

Notas:
- Usa transaccion (`BEGIN TRAN/COMMIT/ROLLBACK`).
- Valida que el rol exista y que los menus enviados sean activos.

---

## Como usar desde backend
- Obtener roles: `EXEC dbo.spx_ObtenerPrivilegiosRoles`
- Obtener detalle de rol: `EXEC dbo.spx_ObtenerPrivilegiosRolDetalle @IdRol = 4`
- Guardar privilegios: `EXEC dbo.spx_GuardarPrivilegiosRol @IdRol = 4, @MenuIdsCsv = '1,2,3,4'`

## Importante
- Este repo **solo agrega el script**.
- No se ejecuto ningun cambio en la DB desde aqui.
