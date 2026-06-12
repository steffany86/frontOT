import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { fetchOtDetail, updateOtDatos } from '../api/otApi'
import { fetchEstados, type CatalogItem } from '../api/catalogApi'

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()

const readCatalogValue = (row: CatalogItem, keys: string[]): unknown => {
  const normalizedKeys = keys.map(normalizeKey)
  const rowEntries = Object.entries(row)
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [entryKey, entryValue] of rowEntries) {
    if (!normalizedKeys.includes(normalizeKey(entryKey))) continue
    if (entryValue !== undefined && entryValue !== null && entryValue !== '') return entryValue
  }
  return undefined
}

const readCatalogString = (row: CatalogItem, keys: string[]): string => {
  const value = readCatalogValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const mapOptions = (items: CatalogItem[]): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readCatalogValue(item, ['idEstado', 'IdEstado', 'Id_Estado', 'id_estado', 'id', 'Id'])
      if (id === undefined || id === null || id === '') return null
      const label = readCatalogString(item, ['estado', 'Estado', 'nombre', 'Nombre', 'descripcion', 'Descripcion'])
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const OtModificarPage = () => {
  const [idInput, setIdInput] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [numeroOrden, setNumeroOrden] = useState('')
  const [idEstado, setIdEstado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['ot-edit', selectedId],
    queryFn: () => fetchOtDetail(selectedId as number),
    enabled: selectedId !== null,
  })

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-ot-modificar'],
    queryFn: fetchEstados,
  })

  const estadoOptions = useMemo(() => mapOptions(estadosQuery.data ?? []), [estadosQuery.data])

  useEffect(() => {
    if (!detailQuery.data?.header) return
    const header = detailQuery.data.header
    setNumeroOrden(header.codigo ?? '')
    setObservacion(header.observaciones ?? '')
  }, [detailQuery.data])

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { observacion: string; idEstado: number; numeroOrden?: string } }) =>
      updateOtDatos(id, payload),
    onSuccess: () => {
      setError(null)
    },
    onError: () => {
      setError('No se pudo actualizar los datos de la OT.')
    },
  })

  const handleBuscar = () => {
    const id = Number(idInput)
    if (Number.isFinite(id)) {
      setSelectedId(id)
      setError(null)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedId) return
    const parsedEstado = Number(idEstado)
    if (!Number.isFinite(parsedEstado) || !observacion.trim()) {
      setError('Estado y observacion son requeridos.')
      return
    }
    mutation.mutate({
      id: selectedId,
      payload: {
        observacion: observacion.trim(),
        idEstado: parsedEstado,
        numeroOrden: numeroOrden.trim() || undefined,
      },
    })
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Modificar datos OT</h2>
        <p className="text-sm text-slate-500">Actualiza observacion y estado.</p>
      </div>

      <FormCard title="Buscar OT" description="Ingresa el ID de la OT a editar.">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Field label="ID OT">
            <input className="input-base" value={idInput} onChange={(event) => setIdInput(event.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="button" onClick={handleBuscar} className="w-full">
              Buscar
            </Button>
          </div>
        </div>
      </FormCard>

      {selectedId ? (
        <form onSubmit={handleSubmit}>
          <FormCard title={`Editar OT #${selectedId}`} description="Campos requeridos por PUT /ot/{id}/datos">
            {detailQuery.isLoading ? (
              <p className="text-sm text-slate-500">Cargando datos...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Numero OT (opcional)">
                  <input className="input-base" value={numeroOrden} onChange={(event) => setNumeroOrden(event.target.value)} />
                </Field>
                <Field label="Estado">
                  <select
                    className="input-base"
                    value={idEstado}
                    onChange={(event) => setIdEstado(event.target.value)}
                    disabled={estadosQuery.isLoading}
                  >
                    <option value="">{estadosQuery.isLoading ? 'Cargando estados...' : 'Selecciona estado'}</option>
                    {estadoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Observacion">
                  <textarea
                    className="input-base h-24 resize-none"
                    value={observacion}
                    onChange={(event) => setObservacion(event.target.value)}
                  />
                </Field>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
            ) : null}
            {mutation.isSuccess ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                Datos actualizados correctamente.
              </div>
            ) : null}
          </FormCard>
        </form>
      ) : null}
    </div>
  )
}

export default OtModificarPage
