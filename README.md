# TigoStar Frontend

Frontend React + TypeScript para gestion operativa OT y administracion de privilegios por rol.

## Requisitos

- Node.js 18+
- Backend activo en `http://localhost:9060`

## Variables de entorno

Usa `.env` (o `.env.example`) con:

```bash
VITE_API_URL=http://localhost:9060
```

## Nomenclatura de bases de datos (acordada)

- `tigo.makiro` (central):
  - host: `tigo.makiro.com.bo` (IP alternativa: `181.188.148.58`)
  - base: `BDSistemaAntenaPM`
  - usuario: `sistemas`
  - password: `sametsis`
- `local` (dinamica por sucursal seleccionada en `/login`):
  - host: `tbl_sucursal.ip`
  - base: `tbl_sucursal.BaseDeDatos`
  - usuario: `sistemas`
  - password: `sametsis`
- `BDControl`:
  - host: `172.16.0.13`
  - base: `BDControlOrdenes`
  - usuario: `sistemas`
  - password: `sametsis`

Referencia en front: `src/config/dbNomenclature.ts`.

## Ejecucion

```bash
npm install
npm run dev
```

## Endpoints consumidos

- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/sucursales`
- `GET /auth/permisos`
- `GET /admin/privilegios/roles`
- `GET /admin/privilegios/roles/{idRol}/menu`
- `PUT /admin/privilegios/roles/{idRol}/menu`

## Flujo de permisos

- El token se envia como `X-Session-Token` en llamadas autenticadas.
- Al iniciar app con token guardado, se consulta `GET /auth/permisos`.
- Si el usuario no es admin:
  - no se muestra `Gestion de Privilegios` en navegacion
  - se bloquea `/admin/privilegios` redirigiendo a `/403`
- Si una llamada autenticada devuelve `401` o `403`, se limpia sesion y se redirige a `/login`.

## Ruta de privilegios

- URL: `/admin/privilegios`
- Solo admin (guard `AdminRoute`)
- Permite:
  - seleccionar rol
  - marcar/desmarcar menus en arbol jerarquico
  - seleccionar todo / limpiar todo
  - guardar cambios con `PUT /admin/privilegios/roles/{idRol}/menu`
