import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Table, { type Column } from '../components/common/Table'
import { createOtRealizada } from '../api/otApi'
import { fetchEstados, fetchTipoMaterial, type CatalogItem } from '../api/catalogApi'

type MaterialRow = {
  id: string
  producto: string
  serie: string
  chipId: string
  cantidad: number
  tipoMaterialId: string
  tipoMaterialLabel: string
  entregado: boolean
}

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

const mapOptions = (
  items: CatalogItem[],
  idKeys: string[],
  labelKeys: string[]
): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readCatalogValue(item, idKeys)
      if (id === undefined || id === null || id === '') return null
      const label = readCatalogString(item, labelKeys)
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const defaultTipoMaterialOptions: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Instalado' },
  { value: '2', label: 'Retirado' },
  { value: '3', label: 'Excedente' },
]

const OtRealizadaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = (location.state as { numeroOrden?: string } | null) ?? null

  const [numeroOrden, setNumeroOrden] = useState((navState?.numeroOrden ?? '').trim())
  const [idEstado, setIdEstado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [tipoMaterialId, setTipoMaterialId] = useState('')
  const [producto, setProducto] = useState('')
  const [serie, setSerie] = useState('')
  const [chipId, setChipId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [entregado, setEntregado] = useState(false)
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-ot-detalle'],
    queryFn: fetchEstados,
  })
  const tipoMaterialQuery = useQuery({
    queryKey: ['catalogos-tipo-material-ot-detalle'],
    queryFn: () => fetchTipoMaterial(1),
  })

  const estadoOptions = useMemo(
    () =>
      mapOptions(
        estadosQuery.data ?? [],
        ['idEstado', 'IdEstado', 'Id_Estado', 'id_estado', 'id', 'Id'],
        ['estado', 'Estado', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [estadosQuery.data]
  )
  const tipoMaterialOptions = useMemo(() => {
    const mapped = mapOptions(
      tipoMaterialQuery.data ?? [],
      ['idTipoMaterial', 'IdTipoMaterial', 'Id_TipoMaterial', 'id_tipo_material', 'id', 'Id'],
      ['tipoMaterial', 'TipoMaterial', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
    )
    return mapped.length > 0 ? mapped : defaultTipoMaterialOptions
  }, [tipoMaterialQuery.data])

  const columns = useMemo<Column<MaterialRow>[]>(
    () => [
      { key: 'producto', header: 'Producto', render: (row) => row.producto },
      { key: 'serie', header: 'Serie', render: (row) => row.serie || '-' },
      { key: 'chipId', header: 'ChipID', render: (row) => row.chipId || '-' },
      { key: 'cantidad', header: 'Cantidad', render: (row) => row.cantidad.toFixed(2) },
      { key: 'tipoMaterial', header: 'Tipo Material', render: (row) => row.tipoMaterialLabel },
      { key: 'entregado', header: 'Entregado', render: (row) => (row.entregado ? 'Si' : 'No') },
      {
        key: 'acciones',
        header: 'Accion',
        render: (row) => (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setMaterialRows((prev) => prev.filter((item) => item.id !== row.id))
            }}
          >
            Quitar
          </Button>
        ),
      },
    ],
    []
  )

  const resetMaterialForm = () => {
    setTipoMaterialId('')
    setProducto('')
    setSerie('')
    setChipId('')
    setCantidad('1')
    setEntregado(false)
  }

  const addMaterial = () => {
    setSuccess(null)
    setError(null)

    const cantidadNum = Number(cantidad)
    if (!tipoMaterialId || !producto.trim() || !Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      setError('Para agregar material: Tipo Material, Producto y Cantidad > 0 son obligatorios.')
      return
    }

    const serieTrim = serie.trim()
    const chipTrim = chipId.trim()
    if (!serieTrim && !chipTrim) {
      setError('Debes ingresar Serie o ChipID.')
      return
    }

    const duplicate = materialRows.some(
      (row) =>
        (serieTrim && row.serie.toLowerCase() === serieTrim.toLowerCase()) ||
        (chipTrim && row.chipId.toLowerCase() === chipTrim.toLowerCase())
    )
    if (duplicate) {
      setError('La Serie o el ChipID ya fueron agregados.')
      return
    }

    const tipoMaterialLabel = tipoMaterialOptions.find((option) => option.value === tipoMaterialId)?.label ?? tipoMaterialId
    const next: MaterialRow = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      producto: producto.trim(),
      serie: serieTrim,
      chipId: chipTrim,
      cantidad: cantidadNum,
      tipoMaterialId,
      tipoMaterialLabel,
      entregado,
    }
    setMaterialRows((prev) => [...prev, next])
    resetMaterialForm()
  }

  const mutation = useMutation({
    mutationFn: createOtRealizada,
    onSuccess: () => {
      setError(null)
      setSuccess(
        materialRows.length > 0
          ? 'Cabecera guardada. El detalle de materiales queda en UI hasta conectar API de detalle.'
          : 'Cabecera guardada correctamente.'
      )
    },
    onError: () => {
      setSuccess(null)
      setError('No se pudo guardar. Verifica los datos de la cabecera.')
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(null)
    setError(null)

    const parsedEstado = Number(idEstado)
    if (!numeroOrden.trim() || !Number.isFinite(parsedEstado) || !observacion.trim()) {
      setError('Numero de OT, estado y observacion son requeridos.')
      return
    }

    mutation.mutate({
      numeroOrden: numeroOrden.trim(),
      idEstado: parsedEstado,
      observacion: observacion.trim(),
    })
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">RegistrarOrdenAgenda_Detalle</h2>
        <p className="text-sm text-slate-500">Registro de OT y detalle de materiales usados.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormCard title="Cabecera" description="Datos generales de la orden.">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nro Orden">
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
              <input className="input-base" value={observacion} onChange={(event) => setObservacion(event.target.value)} />
            </Field>
          </div>
        </FormCard>

        <FormCard title="Materiales" description="Carga de productos usados en la OT.">
          <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
            <div className="space-y-3">
              <Field label="Tipo Material">
                <select
                  className="input-base"
                  value={tipoMaterialId}
                  onChange={(event) => setTipoMaterialId(event.target.value)}
                  disabled={tipoMaterialQuery.isLoading}
                >
                  <option value="">{tipoMaterialQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo material'}</option>
                  {tipoMaterialOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Producto">
                <input className="input-base" value={producto} onChange={(event) => setProducto(event.target.value)} />
              </Field>
              <Field label="Serie">
                <input className="input-base" value={serie} onChange={(event) => setSerie(event.target.value)} placeholder="TIG-____-______" />
              </Field>
              <Field label="ChipID">
                <input className="input-base" value={chipId} onChange={(event) => setChipId(event.target.value)} />
              </Field>
              <Field label="Cantidad">
                <input
                  className="input-base text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cantidad}
                  onChange={(event) => setCantidad(event.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" checked={entregado} onChange={() => setEntregado(true)} />
                  Entregado
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" checked={!entregado} onChange={() => setEntregado(false)} />
                  No Entregado
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={addMaterial}>
                  Agregar
                </Button>
                <Button type="button" variant="secondary" onClick={resetMaterialForm}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div>
              <Table columns={columns} data={materialRows} emptyLabel="Sin materiales agregados." />
            </div>
          </div>
        </FormCard>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={mutation.isPending}>
            Volver
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default OtRealizadaPage
