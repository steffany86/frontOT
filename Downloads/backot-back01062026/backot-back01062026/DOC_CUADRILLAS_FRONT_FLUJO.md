# Flujo Front Cuadrillas (Contrato Operativo)

Este documento define el orden de llamadas y la fuente de datos para estabilizar Front/Back en Cuadrillas.

## 1) Regla de base por sucursal logueada

- Si `sucursal` logueada es Santa Cruz (por ejemplo `Santa_Cruz` o `SCZ`), leer confirmadas/eliminadas desde la base operativa de **uTecnicos**.
- Si `sucursal` logueada es Sucre, leer confirmadas/eliminadas desde **SucrePrueba**.
- Backend deja Central como fallback final, no como fuente primaria.
- En `conformacion-cuadrilla-web`, los `GET` ahora leen primero desde la BD operativa de la sucursal logueada usando `X-Session-Token`; `POST/PUT/DELETE` siguen guardando en **BDControlOrdenes**.

## 2) Orden recomendado de llamadas en Front

1. `GET /supervisor/conformacion-cuadrilla/catalogos/sucursal`
2. Definir `sucursalActiva` desde login.
3. Para tabla principal por tabs:
   - Pendientes: `GET /supervisor/conformacion-cuadrilla/pendientes?fecha=YYYY-MM-DD&sucursal=<sucursalActiva>&limit=...`
   - Confirmadas: `GET /supervisor/conformacion-cuadrilla/confirmadas?fecha=YYYY-MM-DD&sucursal=<sucursalActiva>&limit=...`
   - Eliminadas: `GET /supervisor/conformacion-cuadrilla/eliminadas?fecha=YYYY-MM-DD&sucursal=<sucursalActiva>&limit=...`
4. Detalle remoto solo si hay ID real:
   - `idReal = row.idRegistro ?? row.id ?? row.Id`
   - Si `idReal` existe:
     `GET /supervisor/conformacion-cuadrilla/{idReal}?sucursal=<sucursalActiva>`
   - Si no existe: abrir "Ver local" con datos del row (sin llamada de detalle).
5. Para `conformacion-cuadrilla-web`, enviar `X-Session-Token` en todos los `GET` si no se manda `sucursal` explícita:
   - `GET /supervisor/conformacion-cuadrilla-web`
   - `GET /supervisor/conformacion-cuadrilla-web/{id}`
   - `GET /supervisor/conformacion-cuadrilla-web/catalogos/...`

## 3) Contrato de salida (envelope)

- Exito:
```json
{
  "data": {},
  "message": "string",
  "timestamp": "2026-03-09T16:00:00-04:00"
}
```

- Error:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "string",
  "details": {},
  "timestamp": "2026-03-09T16:00:00-04:00",
  "path": "/supervisor/conformacion-cuadrilla/..."
}
```

## 4) Guardar / actualizar

- Guardar:
  `POST /supervisor/conformacion-cuadrilla`
```json
{
  "filas": [
    {
      "fecha": "2026-03-09",
      "estado": "ACTIVO",
      "actividad": "TITULAR",
      "idTecnico": 397,
      "cuentaSf": "rodriguezc",
      "salesforce": "Rodriguez Clider Rodas",
      "habilidad": "RECLAMOS",
      "vehiculo": "4040DAF",
      "grupo": "MAKIRO",
      "almacen": "MAKIRO",
      "grupoDigitacion": "B",
      "idUsuarioDigitador": 81,
      "digitador": "ALEJANDRO ...",
      "tecnico": "CLIDER ...",
      "idTecnicoAuxiliar": 314,
      "auxiliar": "CRISTHIAN ...",
      "idUsuarioSupervisor": 87,
      "supervisorACargo": "josuAdmin",
      "sucursal": "Santa_Cruz",
      "observacion": null,
      "idUsuarioRegistra": 87
    }
  ]
}
```

- Actualizar:
  `PUT /supervisor/conformacion-cuadrilla/{id}`
  Body: mismo objeto de fila (sin wrapper `filas`).

## 5) Reglas de negocio para Front

- No llamar detalle con URL incompleta (`/.../conformacion-cuadrilla/`).
- En pendientes puede venir `id=null` e `idRegistro=null` (registro no confirmado).
- En pendientes, algunos campos pueden venir null por origen catalogo (`digitador`, `supervisor`, `idUsuarioRegistra`, etc.).
- Mostrar placeholders (`Sin ...`) solo para UI, pero conservar `null` real para validaciones.

## 6) Normalizacion minima de claves

- `idTecnico`: `idTecnico | id_tecnico | idtecnico | Id_Tecnico | id_vendedor | Id_Vendedor`
- `tecnico`: `tecnico | nombrevendedor | vendedor | Nombre`
- `supervisor`: `supervisorACargo | supervisor_a_cargo | supervisor | Nombre`
- `vehiculo`: `vehiculo | Vehiculo | placa | placaVehiculo`
- `grupo`: `grupo | cuadrilla | ruta | Nombre`

## 7) Contrato esperado por Front en Web

- El backend envía el detalle completo de la cuadrilla en cada item: `tecnico`, `auxiliar`, `digitador`, `supervisorACargo`, `vehiculo`, `grupo`, `almacen`, `grupoDigitacion`, `observacion`, `sucursal`, `eEliminado`.
- La tabla principal puede mostrar solo un resumen.
- El botón `Detalle` debe reutilizar los mismos campos completos ya devueltos por backend, o complementar con `GET /supervisor/conformacion-cuadrilla-web/{id}` si necesita refrescar.
