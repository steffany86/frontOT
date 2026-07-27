import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { fetchCuadreTecnicoActual, registrarCuadreTecnico, type CuadreDetalle, type CuadreRetiro } from '../api/cuadreTecnicoApi'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'

const today = () => new Date().toISOString().slice(0, 10)

const quantity = (value: number) =>
  value.toLocaleString('es-BO', { maximumFractionDigits: 2 })

const byProductName = <T extends { producto: string }>(a: T, b: T) =>
  a.producto.localeCompare(b.producto, 'es', { sensitivity: 'base' })

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

  const mutation = useMutation({
    mutationFn: () => registrarCuadreTecnico({
      idRuta: ruta!.idRuta,
      cantidadOt: ruta!.cantidadOt,
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
        <section className={`overflow-hidden rounded-xl border bg-white shadow-sm ${ruta.bloqueoRegistro ? 'border-amber-300' : 'border-slate-200'}`}>
          <header className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                
                
                <p className="mt-1 text-sm text-slate-500">DETALLE  {fecha}</p>
              </div>
          
            </div>
          </header>

          <div className="grid gap-4 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
            <div className="min-w-0">
              <h3 className="mb-2 rounded-t-lg bg-sky-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">Detalle de OT's - cantidad</h3>
              <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-b-lg border border-slate-200">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-sky-700 text-[10px] uppercase tracking-wide text-white shadow-sm"><tr><th className="px-2 py-2">Producto</th><th className="px-2 py-2 text-right">Items sobrantes</th><th className="px-2 py-2 text-right">Items usados</th><th className="px-2 py-2 text-right">Items retirados</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{detalleOrdenado.map((item, index) => <tr key={`${item.idProducto ?? 'saldo'}-${index}`}><td className="max-w-[280px] break-words px-2 py-2 font-semibold text-slate-700">{item.producto}</td><td className="px-2 py-2 text-right font-semibold text-slate-700">{quantity(item.sobrante)}</td><td className="px-2 py-2 text-right font-semibold text-emerald-700">{quantity(item.vendido)}</td><td className="px-2 py-2 text-right font-semibold text-amber-700">{quantity(item.retirado)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>

            <div className="min-w-0">
              <h3 className="mb-2 rounded-t-lg bg-amber-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">Detalle de retiro - cantidad</h3>
              <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-b-lg border border-slate-200">
                <table className="w-full min-w-[300px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-amber-600 text-[10px] uppercase tracking-wide text-white shadow-sm"><tr><th className="px-2 py-2">Producto</th><th className="px-2 py-2 text-right">Items retiro</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{retirosOrdenados.map((item, index) => <tr key={`${item.idProducto ?? 'retiro'}-${index}`}><td className="max-w-[280px] break-words px-2 py-2 font-semibold text-slate-700">{item.producto}</td><td className="px-2 py-2 text-right font-semibold text-amber-700">{quantity(item.cantidad)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
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
