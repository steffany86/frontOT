# Sistema de Traducción de Nomenclatura

Este documento explica cómo usar el sistema de traducción de códigos de base de datos a nomenclatura legible en español.

## ¿Qué es?

Es un sistema que convierte códigos técnicos de base de datos (como `id_venta`, `Fecha_Ejecucion`, `nombreCliente`) a etiquetas legibles en español (`ID Venta`, `Fecha Ejecución`, `Nombre Cliente`).

## Archivos

- `src/utils/translator.ts` - Contiene toda la lógica de traducción

## Cómo usar

### Opción 1: Usar la función `translateCode`

```tsx
import { translateCode } from '../utils/translator'

// Traducir automáticamente (busca en todos los mapas)
const label = translateCode('id_venta')  // Retorna: "ID Venta"
const status = translateCode('pendiente') // Retorna: "Pendiente"

// Traducir especificando el tipo
const field = translateCode('nombreCliente', 'field')     // Retorna: "Nombre Cliente"
const estado = translateCode('finalizado', 'status')      // Retorna: "Finalizado"
const modulo = translateCode('OTPrincipal', 'module')     // Retorna: "Módulo OT"
```

### Opción 2: Usar en JSX

```tsx
import { translateCode } from '../utils/translator'

export function MyComponent() {
  return (
    <div>
      <span className="font-semibold">{translateCode('ot', 'field')}:</span>
      <p>OT-12345</p>
      
      <span className="font-semibold">{translateCode('fechaEjecucion', 'field')}:</span>
      <p>05/01/2025 14:30:00</p>
    </div>
  )
}
```

### Opción 3: Para etiquetas de campos en formularios

```tsx
const toDetailLabel = (key: string): string => {
  // Primero intentar traducir el código directo
  const translated = translateCode(key, 'field')
  if (translated !== key) {
    return translated
  }
  
  // Si no hay traducción, hacer el formato humanizado
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

// Uso
const label = toDetailLabel('nombreTecnico')  // Retorna: "Nombre Técnico"
const label2 = toDetailLabel('cualquier_campo')  // Retorna: "Cualquier Campo"
```

## Categorías de traducción

### 1. Campos (field)
Están en `fieldNomenclature`. Incluyen:
- Identificadores: `id`, `idVenta`, `idRuta`, etc.
- Cliente: `cliente`, `clienteNro`, `nombreCliente`, etc.
- Estado: `estado`, `nombreEstado`, `estadoCierre`, etc.
- Fecha: `fecha`, `fechaEjecucion`, `inicioAgendado`, etc.
- Técnico/Usuario: `tecnico`, `nombreTecnico`, `usuario`, etc.
- Ruta/Grupo: `ruta`, `grupo`, `nombreRuta`, etc.
- Servicio: `tipoServicio`, `nombreTipoServicio`, etc.
- Material: `material`, `producto`, `cantidad`, `serie`, etc.
- Validación: `existeVenta`, `tieneDetalle`, `addMaterialOCargoUsuario`, etc.
- Otros: `nombre`, `codigo`, `descripcion`, `activo`, etc.

### 2. Estados (status)
Están en `statusNomenclature`. Incluyen:
- Estados de OT: `pendiente`, `finalizado`, `finalizada`, `fallida`, `anulada`, etc.
- Disponibilidad: `activo`, `inactivo`, `bloqueado`, etc.
- Tipo de origen: `manual`, `automatico`, etc.
- Respuestas booleanas: `si`, `no`, etc.

### 3. Módulos (module)
Están en `moduleNomenclature`. Incluyen:
- `RegistrarOrdenAgenda_Detalle` → "Registrar Detalle OT"
- `OTPrincipal` → "Módulo OT"
- `BoleDigital` → "Boleta Digital"
- etc.

## Cómo agregar nuevas traducciones

### 1. Para un nuevo campo

Edita `src/utils/translator.ts` y agrega a `fieldNomenclature`:

```tsx
export const fieldNomenclature: NomenclatureMap = {
  // ... campos existentes ...
  nuevoCampo: 'Nuevo Campo',
  Nuevo_Campo: 'Nuevo Campo',
  NuevoCampo: 'Nuevo Campo',
}
```

### 2. Para un nuevo estado

Edita `src/utils/translator.ts` y agrega a `statusNomenclature`:

```tsx
export const statusNomenclature: NomenclatureMap = {
  // ... estados existentes ...
  nuevoEstado: 'Nuevo Estado',
  Nuevo_Estado: 'Nuevo Estado',
  NuevoEstado: 'Nuevo Estado',
}
```

### 3. Para un nuevo módulo

Edita `src/utils/translator.ts` y agrega a `moduleNomenclature`:

```tsx
export const moduleNomenclature: NomenclatureMap = {
  // ... módulos existentes ...
  NuevoModulo: 'Nuevo Módulo',
  Nuevo_Nombre: 'Nuevo Nombre',
}
```

## Notas importantes

- Las traducciones son **sensibles a mayúsculas** exactas
- Si no se encuentra traducción, retorna el código original sin cambios
- Se recomienda agregar variaciones (camelCase, snake_case, PascalCase) del mismo código
- El tipo `'auto'` es el predeterminado y busca en los tres mapas automáticamente
- Idealmente, cualquier nuevo campo debería tener su correspondiente entrada de traducción

## Ejemplo completo

```tsx
import { translateCode } from '../utils/translator'

export function OtCard({ data }) {
  return (
    <div className="p-4 border rounded">
      <h3 className="text-xs font-bold uppercase">{translateCode('cliente', 'field')}</h3>
      <p className="text-2xl font-bold">{data.nombreCliente}</p>

      <div className="mt-3 space-y-1 text-sm">
        <p>
          <span className="font-semibold">{translateCode('ot', 'field')}:</span> {data.ot}
        </p>
        <p>
          <span className="font-semibold">{translateCode('estado', 'field')}:</span>{' '}
          <span className="badge">{translateCode(data.estado, 'status')}</span>
        </p>
        <p>
          <span className="font-semibold">{translateCode('fechaEjecucion', 'field')}:</span>{' '}
          {formatDate(data.fechaEjecucion)}
        </p>
        <p>
          <span className="font-semibold">{translateCode('tecnico', 'field')}:</span>{' '}
          {data.nombreTecnico}
        </p>
      </div>
    </div>
  )
}
```

## Solución de problemas

### El código no se traduce

1. Verifica que el código exacto esté en el mapa de traducción
2. Asegúrate de que uses la capitalización correcta
3. Si el código no existe, agrega la entrada al mapa correspondiente

### Las traducciones se ven inconsistentes

1. Revisa que todas las variaciones del mismo código tengan la misma traducción
2. Usa el tipo `'auto'` cuando no estés seguro del tipo de código

