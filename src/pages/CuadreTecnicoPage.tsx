import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
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

const CuadreTecnicoPage = () => {
  const { roleId, roleName } = useAuth()
  const queryClient = useQueryClient()
  const isTecnico = roleId === 8 || roleName.trim().toLowerCase() === 'tecnico'
  const [fecha] = useState(today)
  const [observacion, setObservacion] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mostrarReporte, setMostrarReporte] = useState(false)
  const [registroConfirmado, setRegistroConfirmado] = useState(false)

  const query = useQuery({
    queryKey: ['cuadre-tecnico', fecha],
    queryFn: () => fetchCuadreTecnicoActual(fecha),
    enabled: isTecnico && Boolean(fecha),
  })

  const rutas = query.data?.rutas ?? []
  const ruta = rutas[0]

  const detalleOrdenado = useMemo<CuadreDetalle[]>(
    () => [...(ruta?.detalle ?? [])].sort(byProductName),
    [ruta],
  )

  const retirosOrdenados = useMemo<CuadreRetiro[]>(
    () => [...(ruta?.retiros ?? [])].sort(byProductName),
    [ruta],
  )

  const tieneValoresNegativos = useMemo(
    () => detalleOrdenado.some((item) => [item.saldo, item.vendido, item.retirado, item.sobrante].some((value) => toNumber(value) < 0))
      || retirosOrdenados.some((item) => toNumber(item.cantidad) < 0),
    [detalleOrdenado, retirosOrdenados],
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
      setRegistroConfirmado(true)
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-lista'] })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-bloqueo-registro'] })
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-validar-venta'] })
      queryClient.invalidateQueries({ queryKey: ['cuadre-tecnico', fecha] })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo registrar el cuadre.'))
      setFeedback(null)
      setRegistroConfirmado(false)
    },
  })

  const handleRegistrar = () => {
    if (!ruta || mutation.isPending) return
    if (tieneValoresNegativos) {
      setError('No se puede registrar el cuadre porque existen cantidades negativas.')
      return
    }
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
      {mutation.isPending && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="mx-4 flex min-w-[280px] flex-col items-center rounded-2xl bg-white px-8 py-7 text-center shadow-2xl">
            <span className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" aria-hidden="true" />
            <p className="text-base font-bold text-slate-900">Registrando cuadre...</p>
            <p className="mt-1 text-sm text-slate-500">Espera la confirmación del sistema.</p>
          </div>
        </div>
      )}

      <Modal
        open={registroConfirmado}
        title="Registro completado"
        onClose={() => setRegistroConfirmado(false)}
        actions={<Button type="button" onClick={() => setRegistroConfirmado(false)}>Aceptar</Button>}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden="true">✓</div>
          <p className="font-semibold text-slate-800">El cuadre fue registrado correctamente.</p>
          <p className="mt-1 text-slate-500">Ya puedes continuar con el sistema.</p>
        </div>
      </Modal>

      {ruta?.cuadreRegistrado && (
        <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
          <button
            type="button"
            className={`rounded-xl px-5 py-2 text-sm font-bold transition ${!mostrarReporte ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => setMostrarReporte(false)}
          >
            Cuadre
          </button>
          <button
            type="button"
            className={`rounded-xl px-5 py-2 text-sm font-bold transition ${mostrarReporte ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => setMostrarReporte(true)}
          >
            Reporte
          </button>
        </div>
      )}

      {query.isLoading && <FormCard title="Cargando" description="Consultando saldo y movimientos del grupo..."><div /></FormCard>}
      {query.isError && <FormCard title="No se pudo cargar" description={getApiErrorMessage(query.error, 'Revisa la conexion con el backend.')}><div /></FormCard>}
      {tieneValoresNegativos && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">No se puede registrar el cuadre: existen cantidades negativas. Verifica el saldo y las OT registradas.</div>}
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
          </header>

          {ruta.cuadreRegistrado && !mostrarReporte ? (
            <div className="bg-white p-4 sm:p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <p className="font-semibold text-slate-700">Los grids se muestran vacíos porque el cuadre ya fue registrado.</p>
                <p className="mt-1 text-sm text-slate-500">Consulta los valores guardados desde Reportes.</p>
              </div>
            </div>
          ) : !ruta.cuadreRegistrado ? (
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
                      <tr
                        key={`${item.idProducto ?? 'saldo'}-${index}`}
                        className={[
                          'transition',
                          [item.saldo, item.vendido, item.retirado, item.sobrante].some((value) => toNumber(value) < 0)
                            ? 'bg-red-100 text-red-900 hover:bg-red-200'
                            : 'odd:bg-white even:bg-slate-50 hover:bg-blue-50/70',
                        ].join(' ')}
                        title={
                          [item.saldo, item.vendido, item.retirado, item.sobrante].some((value) => toNumber(value) < 0)
                            ? 'Esta fila contiene valores negativos y bloquea el registro del cuadre.'
                            : undefined
                        }
                      >
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
          ) : null}

          {ruta.cuadreRegistrado && mostrarReporte && (
            <section className="bg-white px-4 py-4 sm:px-6">
                <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-xl bg-white p-2 print:max-h-none print:overflow-visible">
                  <div className="overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-100 text-left text-xs uppercase font-normal text-slate-600">
                        <tr>
                          <th className="px-2 py-1 font-normal">Producto</th>
                          <th className="px-2 py-1 text-right font-normal">Sobrantes</th>
                          <th className="px-2 py-1 text-right font-normal">Usados</th>
                          <th className="px-2 py-1 text-right font-normal">Retirados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleOrdenado.map((item, index) => (
                          <tr key={`reporte-${item.idProducto ?? index}`}>
                            <td className="px-2 py-1 font-normal">{item.producto}</td>
                            <td className="px-2 py-1 text-right font-normal">{quantity(item.sobrante)}</td>
                            <td className="px-2 py-1 text-right font-normal">{quantity(item.vendido)}</td>
                            <td className="px-2 py-1 text-right font-normal">{quantity(item.retirado)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h5 className="mt-4 mb-1 text-xs font-normal text-slate-900">Material retirado</h5>
                  <div className="overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-100 text-left text-xs uppercase font-normal text-slate-600"><tr><th className="px-2 py-1 font-normal">Producto</th><th className="px-2 py-1 text-right font-normal">Retiro</th></tr></thead>
                      <tbody>{retirosOrdenados.map((item, index) => <tr key={`reporte-retiro-${item.idProducto ?? index}`}><td className="px-2 py-1 font-normal">{item.producto}</td><td className="px-2 py-1 text-right font-normal">{quantity(item.cantidad)}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
            </section>
          )}

          <footer className="border-t border-slate-200 px-4 py-4 sm:px-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <Field label="Observacion">
                <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={observacion} onChange={(event: ChangeEvent<HTMLInputElement>) => setObservacion(event.target.value)} placeholder="Opcional" />
              </Field>
              <Button
                type="button"
                onClick={handleRegistrar}
                disabled={Boolean(ruta.bloqueoRegistro) || tieneValoresNegativos || !ruta.registroDisponible || ruta.cuadreRegistrado || mutation.isPending}
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
