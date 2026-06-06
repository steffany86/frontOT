# Despliegue Con ngrok (Back + Front)

Este documento resume la forma recomendada de publicar temporalmente el sistema para pruebas desde celular.

## 1) Requisitos

- `ngrok` instalado y autenticado (`ngrok config add-authtoken ...`).
- Backend Spring Boot funcionando en `9060`.
- Frontend (`TigoStarPage`) funcionando en `5173` cuando se use modo local.
- Celular y PC con internet estable.

## 2) Opcion recomendada para pruebas moviles

Usar **front local + proxy a backend local**, y exponer solo el front por ngrok.

### Paso 1: Levantar backend

En `TigoStarSystem`:

```powershell
mvn spring-boot:run
```

Verificar:

```powershell
curl http://localhost:9060/auth/sucursales
```

Debe devolver JSON con `data` (lista de sucursales).

### Paso 2: Configurar front para proxy local

En `TigoStarPage`:

- `.env.development` debe tener:

```env
VITE_API_URL=/api
```

- `vite.config.ts` debe tener:
  - `server.proxy['/api'] -> http://localhost:9060`
  - `server.allowedHosts` incluyendo `.ngrok-free.app`

### Paso 3: Levantar front

```powershell
npm run dev
```

Verificar:

```powershell
curl http://localhost:5173/api/auth/sucursales
```

Debe devolver JSON con sucursales.

### Paso 4: Exponer front por ngrok

```powershell
ngrok http 5173
```

Usar en el celular la URL:

```text
https://xxxx-xxx-xxx-xxx-xx.ngrok-free.app
```

No usar `localhost` en el celular.

## 3) Opcion alternativa (Vercel -> ngrok backend)

Si el front esta en Vercel:

 1. Levantar backend local en `9060`.
2. Crear tunel:

```powershell
ngrok http 9060
```

3. Actualizar `vercel.json` del front:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://TU-NGROK.ngrok-free.app/:path*" },
    { "source": "/:path*", "destination": "/" }
  ]
}
```

4. Redeploy en Vercel.

Nota: en plan free la URL de ngrok cambia al reiniciar.

## 4) CORS backend

En `application.properties`:

```properties
app.cors.allowed-origins=http://localhost:5173,http://127.0.0.1:5173,https://front-prueba-def.vercel.app,https://*.ngrok-free.app
```

Si cambias esto, reinicia backend.

## 5) Errores comunes y solucion

### A) "No se pudieron cargar las sucursales"

Revisar:

1. `GET /auth/sucursales` en backend responde con `data`.
2. En modo local, `VITE_API_URL` sea `/api` (no `http://localhost:8089` para celular).
3. ngrok del front siga activo y sin cambiar URL.
4. Probar en incognito para evitar cache.

### B) "Blocked request. This host is not allowed."

Agregar host permitido en `vite.config.ts`:

```ts
allowedHosts: ['.ngrok-free.app', 'localhost', '127.0.0.1']
```

Reiniciar `npm run dev`.

### C) En iPhone no pide ubicacion

En Safari:

1. `aA` -> Configuracion del sitio web -> `Ubicacion` -> `Permitir`.
2. Ajustes iOS -> Privacidad y seguridad -> Localizacion -> Activado.

## 6) Checklist rapido (antes de probar en celular)

1. Backend arriba en `8089`.
2. Front arriba en `5173`.
3. `http://localhost:5173/api/auth/sucursales` devuelve datos.
4. ngrok apunta a `5173` (si modo recomendado).
5. URL ngrok abierta desde celular.

## 7) Seguridad minima recomendada

- No exponer credenciales en capturas.
- Rotar tokens si fueron compartidos.
- No usar ngrok como despliegue productivo permanente.
