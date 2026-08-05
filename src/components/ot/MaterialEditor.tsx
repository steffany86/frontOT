import Button from '../common/Button'
import type { OtMaterial } from '../../types/ot'

interface MaterialEditorProps {
  value: OtMaterial[]
  onChange: (value: OtMaterial[]) => void
}

const MaterialEditor = ({ value, onChange }: MaterialEditorProps) => {
  const handleChange = (index: number, field: keyof OtMaterial, newValue: string | number) => {
    const next = value.map((item, idx) => (idx === index ? { ...item, [field]: newValue } : item))
    onChange(next)
  }

  const handleAdd = () => {
    const next: OtMaterial = {
      id: Date.now(),
      codigo: '',
      descripcion: '',
      cantidad: 1,
      unidad: '',
    }
    onChange([...value, next])
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, idx) => idx !== index))
  }

  return (
    <div className="flex flex-col gap-4">
      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/85 px-4 py-6 text-center text-sm text-slate-500">
          No hay materiales agregados.
        </div>
      ) : (
        value.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm md:grid-cols-5">
            <input
              className="input-base md:col-span-1"
              placeholder="Código"
              value={item.codigo}
              onChange={(event) => handleChange(index, 'codigo', event.target.value)}
            />
            <input
              className="input-base md:col-span-2"
              placeholder="Descripción"
              value={item.descripcion}
              onChange={(event) => handleChange(index, 'descripcion', event.target.value)}
            />
            <input
              className="input-base"
              type="number"
              min={1}
              value={item.cantidad}
              onChange={(event) => handleChange(index, 'cantidad', Number(event.target.value))}
            />
            <div className="flex gap-2">
              <input
                className="input-base flex-1"
                placeholder="Unidad"
                value={item.unidad}
                onChange={(event) => handleChange(index, 'unidad', event.target.value)}
              />
              <Button variant="ghost" type="button" onClick={() => handleRemove(index)}>
                Quitar
              </Button>
            </div>
          </div>
        ))
      )}
      <Button variant="secondary" type="button" onClick={handleAdd}>
        Agregar material
      </Button>
    </div>
  )
}

export default MaterialEditor

