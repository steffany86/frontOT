import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { fetchCuadreTecnicoActual, registrarCuadreTecnico } from '../api/cuadreTecnicoApi'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'

const today = () => new Date().toISOString().slice(0, 10)

const money = (value: number) =>
  `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const quantity = (value: number) =>
  value.toLocaleString('es-BO', { maximumFractionDigits: 2 })

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

  const materialesUsados = useMemo(
    () => ruta?.detalle.filter((item) => item.vendido > 0) ?? [],
    [ruta],
  )

  const totalUsado = ruta?.resumen.totalVendido ?? materialesUsados.reduce(
    (total, item) => total + item.totalVendido,
    0,
  )
  const cantidadUsada = ruta?.resumen.vendido ?? materialesUsados.reduce(
    (total, item) => total + item.vendido,
    0,
  )

  const mutation = useMutation({
    mutationFn: () => registrarCuadreTecnico({ idRuta: ruta!.idRuta, fecha, observacion: observacion.trim() || undefined }),
    onSuccess: () => {
      setFeedback('Cuadre registrado correctamente.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['cuadre-tecnico', fecha] })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo registrar el cuadre.'))
      setFeedback(null)
    },
  })

  if (!isTecnico) {
    return <FormCard title="Cuadre de tecnicos" description="Esta opcion esta disponible unicamente para tecnicos."><div /></FormCard>
  }

  return (
    <div className="space-y-5 pb-8">
      <FormCard title="Cuadre de tecnicos" description="Revisa los materiales usados y registra el cuadre del dia.">
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
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Cuadre del tecnico</p>
                <h2 className="mt-1 truncate text-xl font-bold text-slate-900">{query.data?.tecnico || 'Tecnico'}</h2>
                <p className="mt-1 text-sm text-slate-500">Grupo {ruta.ruta} <span className="px-1 text-slate-300">|</span> {fecha}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Items usados</p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">{quantity(cantidadUsada)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total usado</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{money(totalUsado)}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_92px_90px_108px] gap-3 border-b border-slate-200 px-3 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid">
              <span>Producto</span><span className="text-right">P/U</span><span className="text-right">Cantidad</span><span className="text-right">Importe</span>
            </div>

            {materialesUsados.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {materialesUsados.map((item, index) => (
                  <article key={`${item.idProducto ?? 'producto'}-${index}`} className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_92px_90px_108px] sm:items-center sm:gap-3 sm:py-2.5">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold leading-5 text-slate-800">{item.producto}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:hidden">Detalle del material</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs sm:contents">
                      <div className="rounded-md bg-slate-50 px-2 py-1.5 sm:bg-transparent sm:p-0 sm:text-right">
                        <span className="block text-[9px] font-bold uppercase text-slate-400 sm:hidden">P/U</span>
                        <span className="font-semibold text-slate-600">{money(item.precio)}</span>
                      </div>
                      <div className="rounded-md bg-slate-50 px-2 py-1.5 sm:bg-transparent sm:p-0 sm:text-right">
                        <span className="block text-[9px] font-bold uppercase text-slate-400 sm:hidden">Cantidad</span>
                        <span className="font-semibold text-emerald-700">{quantity(item.vendido)}</span>
                      </div>
                      <div className="rounded-md bg-emerald-50 px-2 py-1.5 text-right sm:bg-transparent sm:p-0">
                        <span className="block text-[9px] font-bold uppercase text-slate-400 sm:hidden">Importe</span>
                        <span className="font-bold text-slate-900">{money(item.totalVendido)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No hay materiales usados para este cuadre.</div>
            )}

            <div className="mt-4 flex items-center justify-between border-t-2 border-slate-800 px-3 pt-3">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-700">Total factura</span>
              <span className="text-xl font-extrabold text-slate-900">{money(totalUsado)}</span>
            </div>
          </div>

          <details className="border-t border-slate-200 bg-slate-50">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-700 marker:hidden sm:px-6">
              <span className="inline-flex items-center gap-2"><span className="text-base">+</span> Ver inventario y saldos</span>
            </summary>
            <div className="overflow-x-auto border-t border-slate-200 bg-white px-3 py-3 sm:px-6">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-2 py-2">Producto</th><th className="px-2 py-2 text-right">Saldo</th><th className="px-2 py-2 text-right">Usado</th><th className="px-2 py-2 text-right">Retirado</th><th className="px-2 py-2 text-right">Sobrante</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{ruta.detalle.map((item, index) => <tr key={`${item.idProducto ?? 'saldo'}-${index}`}><td className="max-w-[280px] break-words px-2 py-2 font-semibold text-slate-700">{item.producto}</td><td className="px-2 py-2 text-right text-slate-600">{quantity(item.saldo)}</td><td className="px-2 py-2 text-right font-semibold text-emerald-700">{quantity(item.vendido)}</td><td className="px-2 py-2 text-right text-amber-700">{quantity(item.retirado)}</td><td className="px-2 py-2 text-right font-semibold text-slate-700">{quantity(item.sobrante)}</td></tr>)}</tbody>
              </table>
            </div>
          </details>

          <footer className="border-t border-slate-200 px-4 py-4 sm:px-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Field label="Observacion">
                <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={observacion} onChange={(event: ChangeEvent<HTMLInputElement>) => setObservacion(event.target.value)} placeholder="Opcional" />
              </Field>
              <Button type="button" onClick={() => mutation.mutate()} disabled={!ruta.registroDisponible || mutation.isPending}>
                {mutation.isPending ? 'Registrando...' : ruta.cuadreRegistrado ? 'Cuadre registrado' : 'Registrar cuadre'}
              </Button>
            </div>
            {!ruta.registroDisponible && ruta.bloqueoRegistro ? <p className="mt-2 text-xs text-amber-700">{ruta.bloqueoRegistro}</p> : null}
          </footer>
        </section>
      )}
    </div>
  )
}

export default CuadreTecnicoPage
