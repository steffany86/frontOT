import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import Table, { type Column } from '../components/common/Table'
import { fetchProductosSinFungible } from '../api/catalogApi'
import { crearPedidoTecnico, fetchPedidosTecnico, type PedidoTecnico, type PedidoTecnicoItem } from '../api/pedidoTecnicoApi'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'

const readProductoLabel = (row: Record<string, unknown>): string => {
  const keys = ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

const readProductoId = (row: Record<string, unknown>): number | null => {
  const keys = ['idProducto', 'Id_Producto', 'id_producto', 'IdProducto', 'ID_PRODUCTO']
  for (const key of keys) {
    const value = row[key]
    const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

const formatDate = (value?: string | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
}

const quantity = (value: number): string => value.toLocaleString('es-BO', { maximumFractionDigits: 2 })

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

type MaterialOption = {
  idProducto: number
  material: string
}

const PedidoMaterialPage = () => {
  const { roleName } = useAuth()
  const queryClient = useQueryClient()
  const [material, setMaterial] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOption | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [observacion, setObservacion] = useState('')
  const [items, setItems] = useState<PedidoTecnicoItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [pedidoFiltro, setPedidoFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [detallePedido, setDetallePedido] = useState<PedidoTecnico | null>(null)

  const canCreate = normalize(roleName) === 'tecnico' || ['sistemas', 'admin', 'administrador'].includes(normalize(roleName))

  const productosQuery = useQuery({
    queryKey: ['pedido-material-productos'],
    queryFn: () => fetchProductosSinFungible(),
  })

  const pedidosQuery = useQuery({
    queryKey: ['pedidos-tecnico'],
    queryFn: fetchPedidosTecnico,
  })

  const materialOptions = useMemo(() => {
    const term = normalize(material)
    const seen = new Set<number>()
    const options = ((productosQuery.data ?? []) as Record<string, unknown>[])
      .map((row) => ({ idProducto: readProductoId(row), material: readProductoLabel(row) }))
      .filter((item): item is MaterialOption => Boolean(item.idProducto && item.material))
      .filter((item) => {
        if (seen.has(item.idProducto)) return false
        seen.add(item.idProducto)
        return true
      })
      .sort((a, b) => a.material.localeCompare(b.material, 'es', { sensitivity: 'base' }))
    if (!term) return options.slice(0, 20)
    return options.filter((item) => normalize(item.material).includes(term)).slice(0, 20)
  }, [material, productosQuery.data])

  const exactMaterial = useMemo(() => {
    const term = normalize(material)
    if (!term) return null
    return materialOptions.find((item) => normalize(item.material) === term) ?? null
  }, [material, materialOptions])

  const mutation = useMutation({
    mutationFn: () => crearPedidoTecnico({ observacion: observacion.trim() || undefined, items }),
    onSuccess: () => {
      setSuccess('Pedido registrado correctamente.')
      setError(null)
      setItems([])
      setMaterial('')
      setSelectedMaterial(null)
      setCantidad('1')
      setObservacion('')
      queryClient.invalidateQueries({ queryKey: ['pedidos-tecnico'] })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo registrar el pedido.'))
      setSuccess(null)
    },
  })

  const addItem = () => {
    const name = material.trim()
    const product = selectedMaterial && normalize(selectedMaterial.material) === normalize(name) ? selectedMaterial : exactMaterial
    const qty = Number(cantidad)
    setSuccess(null)
    if (!name) {
      setError('Material es requerido.')
      return
    }
    if (!product) {
      setError('Seleccione un material existente del catalogo.')
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Cantidad debe ser mayor a 0.')
      return
    }
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.idProducto === product.idProducto)
      if (existingIndex >= 0) {
        return prev.map((item, index) => (index === existingIndex ? { ...item, cantidad: item.cantidad + qty } : item))
      }
      return [...prev, { idProducto: product.idProducto, material: product.material, cantidad: qty }]
    })
    setMaterial('')
    setSelectedMaterial(null)
    setCantidad('1')
    setSelectorOpen(false)
    setError(null)
  }

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, current) => current !== index))

  const submitPedido = () => {
    if (!items.length || mutation.isPending) return
    mutation.mutate()
  }

  const pedidosColumns = useMemo<Column<PedidoTecnico>[]>(() => [
    { key: 'idPedido', header: 'Pedido', render: (row) => row.idPedido ?? '-' },
    { key: 'fecha', header: 'Fecha', render: (row) => formatDate(row.fecha) },
    { key: 'tecnico', header: 'Tecnico', render: (row) => row.tecnico || '-' },
    {
      key: 'items',
      header: 'Resumen',
      render: (row) => `${row.items.length} item${row.items.length === 1 ? '' : 's'}`,
    },
    { key: 'estado', header: 'Estado', render: (row) => row.estado || 'PENDIENTE' },
    {
      key: 'acciones',
      header: 'Detalle',
      className: 'text-right',
      render: (row) => (
        <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setDetallePedido(row)}>
          Ver detalle
        </Button>
      ),
    },
  ], [])

  const pedidosFiltrados = useMemo(() => {
    const term = normalize(pedidoFiltro)
    const estado = normalize(estadoFiltro)
    return (pedidosQuery.data ?? []).filter((pedido) => {
      const estadoPedido = normalize(pedido.estado ?? 'PENDIENTE')
      if (estado && estadoPedido !== estado) return false
      if (!term) return true
      const materialMatch = pedido.items.some((item) => normalize(item.material).includes(term))
      return (
        String(pedido.idPedido ?? '').includes(term) ||
        normalize(pedido.tecnico ?? '').includes(term) ||
        materialMatch
      )
    })
  }, [estadoFiltro, pedidoFiltro, pedidosQuery.data])

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 pb-8 sm:px-5 lg:px-6">
      {canCreate ? (
        <FormCard title="Pedido de material" description="Lista de compras por nombre y cantidad." overflowVisible>
          <div className="mx-auto max-w-3xl rounded-sm border-2 border-black bg-[#fffdf4] p-3 font-mono text-slate-950 shadow-sm sm:p-5">
            <div className="mb-4 border-b-2 border-dashed border-black pb-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]">TIGO HOGAR</p>
              <h3 className="mt-1 text-lg font-black uppercase tracking-[0.08em]">Pedido tecnico</h3>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em]">Solicitud de material</p>
              <div className="mt-3 text-left text-[11px] uppercase">
                <p>Estado: BORRADOR</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_auto]">
              <div className="relative min-w-0">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">Material</label>
                <input
                  className="input-base rounded-sm !border-black bg-white py-2 font-mono text-sm"
                  value={material}
                  onChange={(event) => {
                    setMaterial(event.target.value)
                    setSelectedMaterial(null)
                    setSelectorOpen(true)
                  }}
                  onFocus={() => setSelectorOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addItem()
                    }
                    if (event.key === 'Escape') setSelectorOpen(false)
                  }}
                  placeholder="Buscar o escribir material"
                />
                {selectorOpen && materialOptions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[4.25rem] z-30 max-h-64 overflow-y-auto rounded-sm border-2 border-black bg-[#fffdf4] shadow-xl">
                    {materialOptions.map((option) => (
                      <button
                        key={`${option.idProducto}-${option.material}`}
                        type="button"
                        className="block w-full border-b border-dashed border-slate-400 px-3 py-2 text-left font-mono text-sm font-bold text-slate-800 last:border-b-0 hover:bg-slate-100"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setMaterial(option.material)
                          setSelectedMaterial(option)
                          setSelectorOpen(false)
                        }}
                      >
                        {option.material}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">Cantidad</label>
                <input
                  className="input-base rounded-sm !border-black bg-white py-2 text-right font-mono text-sm"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={cantidad}
                  onChange={(event) => setCantidad(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addItem()
                    }
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" type="button" onClick={addItem}>Agregar</Button>
              </div>
            </div>

            <div className="mt-5 overflow-hidden border-2 border-black">
              <div className="grid grid-cols-[minmax(0,1fr)_80px_72px] border-b-2 border-black bg-[#efefe5] px-2 py-2 text-[11px] font-black uppercase tracking-[0.12em] sm:grid-cols-[minmax(0,1fr)_120px_90px]">
                <span>Material</span>
                <span className="text-right">Cantidad</span>
                <span className="text-right">Accion</span>
              </div>
              {items.length ? (
                <div className="divide-y divide-dashed divide-slate-500">
                  {items.map((item, index) => (
                    <div key={`${item.material}-${index}`} className="grid grid-cols-[minmax(0,1fr)_80px_72px] items-center gap-2 px-2 py-2 text-[12px] uppercase sm:grid-cols-[minmax(0,1fr)_120px_90px]">
                      <span className="min-w-0 break-words font-bold tracking-[0.08em] text-slate-900">{item.material}</span>
                      <span className="text-right font-bold text-slate-900">{quantity(item.cantidad)}</span>
                      <span className="text-right">
                        <Button type="button" variant="ghost" className="rounded-sm px-1.5 py-1 font-mono text-[11px]" onClick={() => removeItem(index)}>
                          Quitar
                        </Button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-base font-black uppercase tracking-[0.12em] text-slate-900 sm:text-xl">Agrega materiales al pedido.</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">Observacion</label>
                <input
                  className="input-base rounded-sm !border-black bg-white py-2 font-mono text-sm"
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <Button type="button" onClick={submitPedido} disabled={!items.length || mutation.isPending}>
                {mutation.isPending ? 'Guardando...' : 'Registrar pedido'}
              </Button>
            </div>
            <p className="mt-5 border-t-2 border-dashed border-black pt-3 text-center text-[11px] font-bold uppercase tracking-[0.16em]">
              Somos y seguiremos siendo parte de ti
            </p>
          </div>
        </FormCard>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <FormCard title="Pedidos" description={canCreate ? "Tus pedidos registrados." : "Pedidos de todos los tecnicos."}>
        <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filtro</label>
            <input
              className="input-base rounded-xl py-2 text-sm"
              value={pedidoFiltro}
              onChange={(event) => setPedidoFiltro(event.target.value)}
              placeholder="Buscar por tecnico, pedido o material"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</label>
            <select className="input-base rounded-xl py-2 text-sm" value={estadoFiltro} onChange={(event) => setEstadoFiltro(event.target.value)}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="ANULADO">Anulado</option>
            </select>
          </div>
        </div>
        {pedidosQuery.isLoading ? (
          <p className="text-sm text-slate-500">Cargando pedidos...</p>
        ) : pedidosQuery.isError ? (
          <p className="text-sm text-rose-600">{getApiErrorMessage(pedidosQuery.error, 'No se pudieron cargar los pedidos.')}</p>
        ) : (
          <Table columns={pedidosColumns} data={pedidosFiltrados} emptyLabel="No hay pedidos registrados." pageSize={10} />
        )}
      </FormCard>

      <Modal
        open={Boolean(detallePedido)}
        title={`Detalle pedido ${detallePedido?.idPedido ?? ''}`}
        onClose={() => setDetallePedido(null)}
        actions={<Button type="button" variant="secondary" onClick={() => setDetallePedido(null)}>Cerrar</Button>}
      >
        {detallePedido ? (
          <div className="space-y-3">
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
              <div><span className="block text-xs font-bold uppercase text-slate-500">Fecha</span>{formatDate(detallePedido.fecha)}</div>
              <div><span className="block text-xs font-bold uppercase text-slate-500">Tecnico</span>{detallePedido.tecnico || '-'}</div>
              <div><span className="block text-xs font-bold uppercase text-slate-500">Estado</span>{detallePedido.estado || 'PENDIENTE'}</div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1fr)_110px] bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-600">
                <span>Material</span>
                <span className="text-right">Cantidad</span>
              </div>
              {detallePedido.items.length ? detallePedido.items.map((item, index) => (
                <div key={`${item.material}-${index}`} className="grid grid-cols-[minmax(0,1fr)_110px] gap-2 border-t border-slate-200 px-3 py-2 text-sm">
                  <span className="break-words font-semibold text-slate-800">{item.material || 'Material sin nombre'}</span>
                  <span className="text-right text-slate-700">{quantity(item.cantidad)}</span>
                </div>
              )) : (
                <div className="border-t border-slate-200 px-3 py-6 text-center text-sm text-slate-500">Sin detalle.</div>
              )}
            </div>
            {detallePedido.observacion ? <p className="text-sm text-slate-600"><span className="font-bold">Observacion:</span> {detallePedido.observacion}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default PedidoMaterialPage
