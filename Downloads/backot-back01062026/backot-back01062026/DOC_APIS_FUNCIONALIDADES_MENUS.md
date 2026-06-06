# Documentacion APIs, Funcionalidades y Menus

## 1. Objetivo
Este documento resume:
- APIs disponibles por modulo.
- Funcionalidades de negocio asociadas.
- Menus/permisos que debe usar frontend para habilitar u ocultar opciones.

## 2. Autenticacion y sesion
- Login: `POST /auth/login`
- El backend devuelve el token en header: `X-Session-Token`.
- Las APIs protegidas deben recibir `X-Session-Token`.

Endpoints:
- `POST /auth/login`
- `GET /auth/sucursales`
- `GET /auth/me`
- `GET /auth/permisos`

## 3. Modelo de menus/permisos
El modelo de permisos es por rol.

API para frontend:
- `GET /auth/permisos`

Campos utiles de respuesta:
- `menuIds`: ids de menu asignados al usuario.
- `menus`: detalle completo de menus (incluye `asignado`).
- `administrador`: bandera de rol admin.

## 4. Menus clave para Cuadrillas
Menus que frontend debe usar para modulo de cuadrillas:
- `62` -> `tsm_ConformacionCuadrillas`
- `60` -> `tsm_GestionarUsuarioTecnico`
- `10` -> `tsm_AsignarGrupoTecnico`
- `9` -> `tsm_Grupo`
- `8` -> `tsm_Tecnico`
- `7` -> `ms_Configuracion` (padre)

Regla sugerida para frontend:
- Si `menuIds` contiene `62`, mostrar menu `Cuadrillas`.
- Si `menuIds` contiene `60`, habilitar accion `Crear usuario tecnico`.
- Si `menuIds` contiene `10` o `9`, habilitar `Asignar tecnico a grupo`.
- Si `menuIds` contiene `8`, habilitar `Ver datos tecnico`.

## 5. Preset admin para Supervisor (Cuadrillas)
Endpoint admin para aplicar permisos minimos del modulo cuadrillas al rol:
- `PUT /admin/privilegios/roles/{idRol}/preset/supervisor-cuadrillas`

Incluye menu IDs:
- `7,8,9,10,60,62`

Nota:
- Este endpoint requiere usuario administrador.

## 6. APIs por modulo

### 6.1 Privilegios (Admin)
- `GET /admin/privilegios/roles`
- `GET /admin/privilegios/roles/{idRol}/menu`
- `PUT /admin/privilegios/roles/{idRol}/menu`
- `PUT /admin/privilegios/roles/{idRol}/preset/supervisor-cuadrillas`

### 6.2 Catalogos generales
- `GET /catalogos/tecnicos`
- `GET /catalogos/rutas?tecnicoId=...`
- `GET /catalogos/tipo-servicio`
- `GET /catalogos/estados`
- `GET /catalogos/tipo-material?tipoServicioId=...`
- `GET /catalogos/productos`
- `GET /catalogos/productos/mascara`
- `GET /catalogos/kits-decodificadores`
- `GET /catalogos/sucursales`

### 6.3 OT
- `POST /ot/realizada`
- `POST /ot`
- `GET /ot`
- `GET /ot/{id}`
- `GET /ot/numero/{numero}`
- `GET /ot/{id}/instalados`
- `GET /ot/{id}/retirados`
- `GET /ot/{id}/excedentes`
- `GET /ot/{id}/cargo-usuario`
- `GET /ot/spx_ObtenerSaldoRuta?idRuta=...&fecha=YYYY-MM-DD`
- `GET /ot/saldo-ruta?idRuta=...&fecha=YYYY-MM-DD`
- `PUT /ot/{id}/datos`
- `PUT /ot/{id}/fecha`
- `DELETE /ot/{id}?modo=con_cu|solo_cu&usuario=...`

### 6.4 Cuadre y CU no realizado
- `POST /cuadre/validar?ruta=...&fecha=YYYY-MM-DD`
- `POST /cu-no-realizado`
- `GET /cu-no-realizado`
- `GET /cu-no-realizado/{id}`

### 6.5 Supervisor - Conformacion de Cuadrilla (BackOffice)
Base:
- `GET /supervisor/conformacion-cuadrilla`
- `GET /supervisor/conformacion-cuadrilla/listado`
- Query params opcionales: `fecha`, `sucursal`, `limite`, `idTecnico`

Catalogos para selects (usar primero en frontend):
- `GET /supervisor/conformacion-cuadrilla/catalogos/tecnicos`
- `GET /supervisor/conformacion-cuadrilla/catalogos/tecnicos/{id}`
- `GET /supervisor/conformacion-cuadrilla/catalogos/digitadores`
- `GET /supervisor/conformacion-cuadrilla/catalogos/supervisores`
- `GET /supervisor/conformacion-cuadrilla/catalogos/vehiculos?filtro=...`
- `GET /supervisor/conformacion-cuadrilla/catalogos/sucursal`

Acciones:
- `POST /supervisor/conformacion-cuadrilla/guardar`
- `PUT /supervisor/conformacion-cuadrilla/{id}`

### 6.6 Supervisor - Conformacion Cuadrilla Web
- `GET /supervisor/conformacion-cuadrilla-web`
- `GET /supervisor/conformacion-cuadrilla-web/{id}`
- `POST /supervisor/conformacion-cuadrilla-web`
- `PUT /supervisor/conformacion-cuadrilla-web/{id}`
- `DELETE /supervisor/conformacion-cuadrilla-web/{id}`

Catalogos/selectores:
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/tecnicos`
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/tecnicos/{id}`
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/auxiliares`
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/digitadores`
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/supervisores`
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/actividades`
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/vehiculos?filtro=...`
- `GET /supervisor/conformacion-cuadrilla-web/catalogos/sucursales`

## 7. Flujo recomendado frontend para Cuadrillas
1. Login y guardar `X-Session-Token`.
2. Consultar `GET /auth/permisos`.
3. Construir menu dinamico con `menuIds`.
4. Si existe `62`, renderizar modulo `Cuadrillas` con submenus:
- Ver cuadrillas existentes
- Guardar cuadrilla confirmada
- Editar cuadrilla
5. Antes de pintar formularios, cargar APIs de catalogo para selectors.
6. Habilitar o bloquear botones de acciones finas por menu ID (`60`, `10`, `9`, `8`).

## 8. SP usados por backend en Cuadrillas

### 8.1 Conformacion Cuadrilla (BackOffice)
SP usados:
- `spx_ObtenerListadoConformacionCuadrillaBackOffice`
- `spx_RegistrarConformacionCuadrillaBackOffice`
- `spx_ActualizarConformacionCuadrillaBackOffice`
- `spx_TraerVendedores_x_FormTecnico`
- `spx_ObtenerDatosTecnicoCuadrilla`
- `spx_ObtenerDigitadores`
- `spx_ObtenerSupervisores`
- `listar-vehiculo`
- `spx_ObtenerSucursalActual`

Flujo de datos:
- Listado base de cuadrillas: se obtiene desde U Tecnicos (BDSistemaAntenaUTecnico) via `spx_ObtenerConformacionCuadrillaBackOffice`.
- Guardado/actualizacion confirmada: se persiste en BDControlOrdenes.

### 8.2 Conformacion Cuadrilla Web
SP esperados por backend:
- `spx_ObtenerConformacionCuadrillaWeb`
- `spx_ObtenerConformacionCuadrillaWebPorId`
- `spx_RegistrarConformacionCuadrillaWeb`
- `spx_ActualizarConformacionCuadrillaWeb`
- `spx_EliminarConformacionCuadrillaWeb`
- `spx_ObtenerTecnicosConformacionCuadrillaWeb`
- `spx_ObtenerDatosTecnicoConformacionCuadrillaWeb`
- `spx_ObtenerAuxiliaresConformacionCuadrillaWeb`
- `spx_ObtenerDigitadoresConformacionCuadrillaWeb`
- `spx_ObtenerSupervisoresConformacionCuadrillaWeb`
- `spx_ObtenerActividadesConformacionCuadrillaWeb`
- `spx_ObtenerVehiculosConformacionCuadrillaWeb`
- `spx_ObtenerSucursalesConformacionCuadrillaWeb`

Nota:
- El backend de cuadrilla web fue preparado para consumir estos SP via `EXEC`.

## 9. Checklist rapido para frontend
- Consumir `GET /auth/permisos` al iniciar sesion.
- No hardcodear menus por rol, usar `menuIds`.
- Cargar catalogos antes del formulario de cuadrillas.
- Enviar siempre `X-Session-Token`.
- Ocultar acciones cuando no exista menu correspondiente.
- En pantallas de cuadrillas, no mostrar la columna/campo tecnico `id` al usuario final (solo usarlo internamente para enviar al backend).
- Al seleccionar un tecnico (`idTecnico`), consumir `GET /supervisor/conformacion-cuadrilla-web/catalogos/tecnicos/{id}` y autocompletar los datos del formulario (ej: `tecnico`, `cuentaSf`, `salesforce`, `habilidad`, `vehiculo`, `grupo`, `almacen`, `grupoDigitacion`, `sucursal` cuando aplique).
