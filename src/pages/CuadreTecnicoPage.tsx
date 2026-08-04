import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { fetchCuadreTecnicoActual, registrarCuadreTecnico, type CuadreDetalle, type CuadreRetiro } from '../api/cuadreTecnicoApi'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'

const today = () => new Date().toISOString().slice(0, 10)

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

const quantity = (value: unknown) =>
  toNumber(value).toLocaleString('es-BO', { maximumFractionDigits: 2 })

const byProductName = <T extends { producto: string }>(a: T, b: T) =>
  a.producto.localeCompare(b.producto, 'es', { sensitivity: 'base' })

const sumBy = <T,>(items: T[], selector: (item: T) => unknown) =>
  items.reduce((total, item) => total + toNumber(selector(item)), 0)

const CuadreTecnicoPage = () => {
  const { roleId, roleName } = useAuth()
  const queryClient = useQueryClient()
  const isTecnico = roleId === 8 || roleName.trim().toLowerCase() === 'tecnico'
  const [fecha, setFecha] = useState(today)
  const [rutaSeleccionada, setRutaSeleccionada] = useState<number | null>(null)
  const [observacion, setObservacion] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['cuadre-tecnico', fecha],
    queryFn: () => fetchCuadreTecnicoActual(fecha),
    enabled: isTecnico && Boolean(fecha),
  })

  const rutas = query.data?.rutas ?? []
  const ruta = useMemo(
    () => rutas.find((item) => item.idRuta === rutaSeleccionada) ?? rutas[0],
    [rutas, rutaSeleccionada],
  )

  const detalleOrdenado = useMemo<CuadreDetalle[]>(
    () => [...(ruta?.detalle ?? [])].sort(byProductName),
    [ruta],
  )

  const retirosOrdenados = useMemo<CuadreRetiro[]>(
    () => [...(ruta?.retiros ?? [])].sort(byProductName),
    [ruta],
  )

  const summaryCards = useMemo(
    () => {
      if (!ruta) return []
      return [
        { label: 'OT registradas', value: quantity(ruta.cantidadOt), tone: 'border-blue-200 bg-blue-50 text-blue-700' },
        { label: 'Items sobrantes', value: quantity(sumBy(detalleOrdenado, (item) => item.sobrante)), tone: 'border-slate-200 bg-slate-50 text-slate-700' },
        { label: 'Items usados', value: quantity(sumBy(detalleOrdenado, (item) => item.vendido)), tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
        { label: 'Items retirados', value: quantity(sumBy(detalleOrdenado, (item) => item.retirado) + sumBy(retirosOrdenados, (item) => item.cantidad)), tone: 'border-amber-200 bg-amber-50 text-amber-700' },
      ]
    },
    [detalleOrdenado, retirosOrdenados, ruta],
  )

  const mutation = useMutation({
    mutationFn: () => registrarCuadreTecnico({
      idRuta: ruta!.idRuta,
      cantidadOt: toNumber(ruta!.cantidadOt),
      fecha,
      observacion: observacion.trim() || undefined,
    }),
    onSuccess: () => {
      setFeedback('Cuadre registrado correctamente.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista'] })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-bloqueo-registro'] })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-venta'] })
      queryClient.invalidateQueries({ queryKey: ['cuadre-tecnico', fecha] })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo registrar el cuadre.'))
      setFeedback(null)
    },
  })

  const handleRegistrar = () => {
    if (!ruta || mutation.isPending) return
    const confirmado = window.confirm(
      `¿Está seguro de registrar el cuadre?\n\nGrupo: ${ruta.ruta}\nFecha: ${fecha}\nOT registradas: ${ruta.cantidadOt}`,
    )
    if (confirmado) mutation.mutate()
  }

  if (!isTecnico) {
    return <FormCard title="Cuadre de tecnicos" description="Esta opcion esta disponible unicamente para tecnicos."><div /></FormCard>
  }

  return (
    <div className="space-y-5 pb-8">
      <FormCard title="Cuadre de tecnicos" description="">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
          <Field label="Fecha">
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm disabled:cursor-not-allowed"
              type="date"
              value={fecha}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setFecha(event.target.value)
                setRutaSeleccionada(null)
                setFeedback(null)
              }}
              disabled
            />
          </Field>
          <label className="block text-sm font-semibold text-slate-700">
            Grupo
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm disabled:cursor-not-allowed"
              value={ruta?.idRuta ?? ''}
              onChange={(event) => setRutaSeleccionada(Number(event.target.value))}
              disabled
            >
              {rutas.map((item) => <option key={item.idRuta} value={item.idRuta}>{item.ruta}</option>)}
            </select>
          </label>
        </div>
      </FormCard>

      {query.isLoading && <FormCard title="Cargando" description="Consultando saldo y movimientos del grupo..."><div /></FormCard>}
      {query.isError && <FormCard title="No se pudo cargar" description={getApiErrorMessage(query.error, 'Revisa la conexion con el backend.')}><div /></FormCard>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>}

      {ruta && (
        <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${ruta.bloqueoRegistro ? 'border-amber-300' : 'border-slate-200'}`}>
          <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Detalle del cuadre</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{fecha}</span>
                </div>
                <p className="mt-1 break-words text-sm font-semibold text-blue-700">{ruta.ruta}</p>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                ruta.cuadreRegistrado
                  ? 'bg-emerald-100 text-emerald-700'
                  : ruta.registroDisponible
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {ruta.cuadreRegistrado ? 'Cuadre registrado' : ruta.registroDisponible ? 'Disponible para registrar' : 'Pendiente'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className={`rounded-xl border px-3 py-3 ${card.tone}`}>
                  <p className="text-xs font-semibold uppercase text-current/70">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>
          </header>

          <div className="grid gap-4 bg-white p-4 sm:p-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
                <h3 className="text-base font-bold text-slate-900">Detalle de OT's</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{detalleOrdenado.length} productos</span>
              </div>
              <div className="max-h-[52vh] overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">Producto</th>
                      <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-right font-bold">Sobrantes</th>
                      <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-right font-bold">Usados</th>
                      <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-right font-bold">Retirados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleOrdenado.length ? detalleOrdenado.map((item, index) => (
                      <tr key={`${item.idProducto ?? 'saldo'}-${index}`} className="odd:bg-white even:bg-slate-50 transition hover:bg-blue-50/70">
                        <td className="min-w-[220px] border-b border-slate-100 px-3 py-3 font-semibold text-slate-800">
                          <span className="line-clamp-2" title={item.producto}>{item.producto}</span>
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 text-right font-semibold text-slate-700">{quantity(item.sobrante)}</td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 text-right font-semibold text-emerald-700">{quantity(item.vendido)}</td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 text-right font-semibold text-amber-700">{quantity(item.retirado)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-3 py-8 text-center text-slate-500" colSpan={4}>Sin detalle de productos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
                <h3 className="text-base font-bold text-slate-900">Detalle de retiro</h3>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{retirosOrdenados.length} productos</span>
              </div>
              <div className="max-h-[52vh] overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">Producto</th>
                      <th className="whitespace-nowrap border-b border-slate-200 px-3 py-3 text-right font-bold">Retiro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retirosOrdenados.length ? retirosOrdenados.map((item, index) => (
                      <tr key={`${item.idProducto ?? 'retiro'}-${index}`} className="odd:bg-white even:bg-slate-50 transition hover:bg-blue-50/70">
                        <td className="min-w-[220px] border-b border-slate-100 px-3 py-3 font-semibold text-slate-800">
                          <span className="line-clamp-2" title={item.producto}>{item.producto}</span>
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-3 text-right font-semibold text-amber-700">{quantity(item.cantidad)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-3 py-8 text-center text-slate-500" colSpan={2}>Sin retiros registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <footer className="border-t border-slate-200 px-4 py-4 sm:px-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Field label="Observacion">
                <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={observacion} onChange={(event: ChangeEvent<HTMLInputElement>) => setObservacion(event.target.value)} placeholder="Opcional" />
              </Field>
              <Button
                type="button"
                onClick={handleRegistrar}
                disabled={Boolean(ruta.bloqueoRegistro) || !ruta.registroDisponible || ruta.cuadreRegistrado || mutation.isPending}
                title={ruta.bloqueoRegistro ?? undefined}
              >
                {mutation.isPending ? 'Registrando...' : ruta.cuadreRegistrado ? 'Cuadre registrado' : 'Registrar cuadre'}
              </Button>
            </div>
            {ruta.bloqueoRegistro ? (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
                {ruta.bloqueoRegistro}
              </div>
            ) : null}
          </footer>
        </section>
      )}
    </div>
  )
}

export default CuadreTecnicoPage
