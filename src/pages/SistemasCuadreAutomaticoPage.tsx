import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import {
  buildCuadreAutomaticoProgressUrl,
  ejecutarCierreAutomatico,
  fetchCuadreAutomaticoPreview,
  fetchNotificacionesCierreAutomatico,
  iniciarCuadreAutomatico,
  type CierreAutomaticoResultado,
  type CuadreAutomaticoProgressEvent,
  type CuadreAutomaticoResultado,
} from '../api/cuadreTecnicoApi'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().slice(0, 10)

const normalizeRole = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')

const quantity = (value: unknown): string => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed.toLocaleString('es-BO', { maximumFractionDigits: 2 }) : '0'
}

const statusClass = (estado: string): string => {
  const normalized = normalizeRole(estado)
  if (normalized === 'registrado' || normalized === 'listo') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (normalized === 'omitido') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (normalized === 'error') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

const executionSteps = [
  'Validando usuario sistemas y sucursal',
  'Consultando rutas pendientes de cuadre',
  'Revisando cierres y movimientos pendientes',
  'Calculando saldo, usado del dia y retiros',
  'Validando sobrantes y ventas registradas',
  'Registrando cuadre por cada ruta valida',
  'Actualizando saldos, retiros y equipo tecnico',
  'Preparando resumen final de ejecucion',
]

const SistemasCuadreAutomaticoPage = () => {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const [fecha, setFecha] = useState(today)
  const [idSucursal, setIdSucursal] = useState(String(usuario?.idSucursal && usuario.idSucursal > 0 ? usuario.idSucursal : ''))
  const [resultado, setResultado] = useState<CuadreAutomaticoResultado[] | null>(null)
  const [cierreResultado, setCierreResultado] = useState<CierreAutomaticoResultado[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processModalOpen, setProcessModalOpen] = useState(false)
  const [processStatus, setProcessStatus] = useState<'idle' | 'starting' | 'running' | 'success' | 'error'>('idle')
  const [progressEvents, setProgressEvents] = useState<CuadreAutomaticoProgressEvent[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  const isSistemas = normalizeRole(usuario?.rol) === 'sistemas' || normalizeRole(usuario?.nombre) === 'sistemas'

  const sucursalesQuery = useQuery({
    queryKey: ['sucursales'],
    queryFn: fetchSucursales,
  })

  const previewQuery = useQuery({
    queryKey: ['cuadre-automatico-preview', fecha, idSucursal],
    queryFn: () => fetchCuadreAutomaticoPreview({ fecha, idSucursal: Number(idSucursal) }),
    enabled: isSistemas && Number(idSucursal) > 0,
    retry: false,
    staleTime: 0,
  })

  const notificacionesCierreQuery = useQuery({
    queryKey: ['cuadre-automatico-cierres-notificaciones', idSucursal],
    queryFn: () => fetchNotificacionesCierreAutomatico({ idSucursal: Number(idSucursal) }),
    enabled: isSistemas && Number(idSucursal) > 0,
    retry: false,
    staleTime: 0,
  })

  const ejecutarMutation = useMutation({
    mutationFn: () => iniciarCuadreAutomatico({ fecha, idSucursal: Number(idSucursal) }),
    onSuccess: (data) => {
      setError(null)
      setProcessStatus('running')
      setProcessModalOpen(true)
      openProgressStream(data.jobId)
    },
    onError: (err) => {
      setResultado(null)
      setError(getApiErrorMessage(err, 'No se pudo ejecutar el cuadre automatico.'))
      setProcessStatus('error')
      setProcessModalOpen(true)
    },
  })

  const cierreMutation = useMutation({
    mutationFn: () => ejecutarCierreAutomatico({ fecha, idSucursal: Number(idSucursal) }),
    onSuccess: (data) => {
      setError(null)
      setCierreResultado(data.cierres ?? [])
      queryClient.invalidateQueries({ queryKey: ['cuadre-automatico-preview'] })
      queryClient.invalidateQueries({ queryKey: ['cuadre-automatico-cierres-notificaciones'] })
    },
    onError: (err) => {
      setCierreResultado(null)
      setError(getApiErrorMessage(err, 'No se pudo ejecutar el cierre automatico.'))
    },
  })

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [])

  const processRunning = processStatus === 'starting' || processStatus === 'running'

  const appendProgressEvent = (event: CuadreAutomaticoProgressEvent) => {
    setProgressEvents((current) => [...current.slice(-80), event])
  }

  const openProgressStream = (jobId: string) => {
    eventSourceRef.current?.close()
    const source = new EventSource(buildCuadreAutomaticoProgressUrl(jobId))
    eventSourceRef.current = source

    const handleServerEvent = (rawEvent: MessageEvent<string>) => {
      try {
        const event = JSON.parse(rawEvent.data) as CuadreAutomaticoProgressEvent
        appendProgressEvent(event)
        if (event.type === 'complete') {
          if (event.resultado) {
            setResultado(event.resultado.rutas ?? [])
            setCierreResultado(event.resultado.cierres ?? null)
          }
          setError(null)
          setProcessStatus('success')
          queryClient.invalidateQueries({ queryKey: ['cuadre-automatico-preview'] })
          queryClient.invalidateQueries({ queryKey: ['cuadre-automatico-cierres-notificaciones'] })
          source.close()
          eventSourceRef.current = null
        } else if (event.type === 'error') {
          const message = event.error || event.message || 'No se pudo ejecutar el cuadre automatico.'
          setError(message)
          setProcessStatus('error')
          source.close()
          eventSourceRef.current = null
        }
      } catch {
        appendProgressEvent({
          type: 'error',
          status: 'error',
          step: 'Mensaje invalido',
          message: 'No se pudo interpretar un mensaje de progreso del backend.',
        })
      }
    }

    source.addEventListener('progress', handleServerEvent)
    source.addEventListener('route', handleServerEvent)
    source.addEventListener('complete', handleServerEvent)
    source.addEventListener('error', (rawEvent) => {
      if ('data' in rawEvent && typeof rawEvent.data === 'string') {
        handleServerEvent(rawEvent as MessageEvent<string>)
        return
      }
      if (eventSourceRef.current === source) {
        setError('Se perdio la conexion con el progreso del cuadre automatico.')
        setProcessStatus('error')
        source.close()
        eventSourceRef.current = null
      }
    })
  }

  const rutas = resultado ?? previewQuery.data?.rutas ?? []
  const cierreEstado = previewQuery.data?.cierre
  const notificacionesCierre = previewQuery.data?.notificacionesCierre ?? notificacionesCierreQuery.data ?? []
  const puedeHacerCierre = Boolean(cierreEstado?.puedeCerrar && !rutas.length)
  const resumen = useMemo(() => {
    const base = resultado ? null : previewQuery.data?.resumen
    if (base) return base
    return rutas.reduce<Record<string, number>>(
      (acc, row) => {
        acc.total += 1
        const estado = normalizeRole(row.estado)
        if (estado === 'registrado') acc.registrados += 1
        else if (estado === 'listo') acc.listos += 1
        else if (estado === 'omitido') acc.omitidos += 1
        else if (estado === 'error') acc.errores += 1
        return acc
      },
      { total: 0, registrados: 0, listos: 0, omitidos: 0, errores: 0 }
    )
  }, [previewQuery.data?.resumen, resultado, rutas])

  const handleExecute = () => {
    setError(null)
    setResultado(null)
    if (!idSucursal) {
      setError('Selecciona una sucursal.')
      return
    }
    const ok = window.confirm(`Ejecutar cuadre automatico para ${fecha}?`)
    if (ok) {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setProgressEvents([])
      setCierreResultado(null)
      setProcessStatus('starting')
      setProcessModalOpen(true)
      ejecutarMutation.mutate()
    }
  }

  const handleCierre = () => {
    setError(null)
    if (!idSucursal) {
      setError('Selecciona una sucursal.')
      return
    }
    const ok = window.confirm(`Hacer cierre automatico para ${fecha}?`)
    if (ok) {
      cierreMutation.mutate()
    }
  }

  if (!isSistemas) {
    return (
      <FormCard title="Cuadre automatico" description="Acceso restringido.">
        <p className="text-sm font-semibold text-red-600">Solo el usuario sistemas puede ejecutar este proceso.</p>
      </FormCard>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      <Modal
        open={processModalOpen}
        title={processRunning ? 'Cuadre automatico en proceso' : error ? 'Proceso detenido' : 'Cuadre automatico finalizado'}
        onClose={() => {
          if (!processRunning) setProcessModalOpen(false)
        }}
        maxWidthClass="max-w-xl"
        actions={
          processRunning ? null : (
            <Button type="button" onClick={() => setProcessModalOpen(false)}>
              Ver resultado
            </Button>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <div className={processRunning ? 'h-9 w-9 shrink-0 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white'}>
              {processRunning ? null : error ? '!' : 'OK'}
            </div>
            <div>
              <p className="font-bold text-slate-900">
                {processRunning ? (progressEvents.at(-1)?.step ?? 'Ejecutando cuadre automatico') : error ? 'No se completo la ejecucion' : 'Proceso completado'}
              </p>
              <p className="text-xs text-slate-600">
                {processRunning ? (progressEvents.at(-1)?.message ?? 'Esperando mensajes del backend...') : `Fecha ${fecha} - Sucursal ${idSucursal || '-'} - Rutas en pantalla ${quantity(rutas.length)}`}
              </p>
            </div>
          </div>

          <ol className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
            {(progressEvents.length ? progressEvents : executionSteps.map((step) => ({
              type: 'progress',
              status: 'pending',
              step,
              message: processStatus === 'starting' ? 'Esperando inicio del backend...' : 'Pendiente.',
            } as CuadreAutomaticoProgressEvent))).map((event, index) => {
              const completed = event.status === 'success'
              const active = processRunning && index === progressEvents.length - 1
              const failed = event.status === 'error'
              const warning = event.status === 'warning'
              return (
                <li key={`${event.timestamp ?? index}-${event.step}`} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${failed ? 'border-red-200 bg-red-50' : warning ? 'border-amber-200 bg-amber-50' : active ? 'border-blue-200 bg-blue-50' : completed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${failed ? 'bg-red-600 text-white' : warning ? 'bg-amber-500 text-white' : active ? 'bg-blue-700 text-white' : completed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {failed ? '!' : warning ? '!' : completed ? 'OK' : index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {event.rutaIndex && event.totalRutas ? `${event.rutaIndex}/${event.totalRutas} - ` : ''}
                      {event.step}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.message || (failed ? 'Se detuvo en esta etapa.' : active ? 'Procesando ahora...' : completed ? 'Completado.' : 'Pendiente.')}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>

          {!processRunning && !error && resultado ? (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-2">
                <p className="font-bold text-blue-700">Registradas</p>
                <p className="text-lg font-black text-blue-900">{quantity(resumen.registrados)}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2">
                <p className="font-bold text-amber-700">Omitidas</p>
                <p className="text-lg font-black text-amber-900">{quantity(resumen.omitidos)}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-2">
                <p className="font-bold text-red-700">Errores</p>
                <p className="text-lg font-black text-red-900">{quantity(resumen.errores)}</p>
              </div>
            </div>
          ) : null}

          {!processRunning && cierreResultado?.length ? (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-2 text-sm font-bold text-slate-900">Cierre</div>
              <div className="divide-y divide-slate-100">
                {cierreResultado.map((cierre, index) => (
                  <div key={`${cierre.tipo}-${index}`} className="px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800">{cierre.tipo}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusClass(cierre.estado)}`}>{cierre.estado}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{cierre.mensaje || `Registro ${cierre.idRegistro ?? '-'}`}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!processRunning && error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </Modal>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Cuadre automatico</h2>
        <p className="text-sm text-slate-600">Ejecuta el proceso legacy de cuadres automaticos por fecha y sucursal.</p>
      </div>

      <FormCard title="Parametros">
        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end">
          <Field label="Fecha">
            <input className="input-base bg-white" type="date" value={fecha} onChange={(event) => { setFecha(event.target.value); setResultado(null) }} />
          </Field>
          <Field label="Sucursal">
            <select className="input-base bg-white" value={idSucursal} onChange={(event) => { setIdSucursal(event.target.value); setResultado(null) }}>
              <option value="">{sucursalesQuery.isLoading ? 'Cargando sucursales...' : 'Selecciona sucursal'}</option>
              {(sucursalesQuery.data?.data ?? []).map((sucursal) => (
                <option key={sucursal.idSucursal} value={String(sucursal.idSucursal)}>{sucursal.sucursal}</option>
              ))}
            </select>
          </Field>
          <Button type="button" onClick={handleExecute} disabled={processRunning || !idSucursal}>
            {processRunning ? 'Ejecutando...' : 'Ejecutar cuadre'}
          </Button>
        </div>
        {cierreEstado ? (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Cierre de almacen</p>
              <p className="text-xs text-slate-600">{cierreEstado.mensaje}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Pendientes cuadre: {quantity(cierreEstado.pendientesCuadre)} | Almacen: {cierreEstado.cierreAlmacenRegistrado ? 'SI' : 'NO'} | PR/PD: {cierreEstado.cierrePrPdRegistrado ? 'SI' : 'NO'}
              </p>
            </div>
            {puedeHacerCierre ? (
              <Button type="button" onClick={handleCierre} disabled={cierreMutation.isPending || processRunning}>
                {cierreMutation.isPending ? 'Cerrando...' : 'Hacer cierre'}
              </Button>
            ) : null}
          </div>
        ) : null}
        {cierreResultado?.length ? (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {cierreResultado.map((item) => `${item.tipo}: ${item.estado}${item.idRegistro ? ` #${item.idRegistro}` : ''}`).join(' | ')}
          </div>
        ) : null}
        {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {previewQuery.isError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getApiErrorMessage(previewQuery.error, 'No se pudo cargar el preview de rutas.')}
          </div>
        ) : null}
      </FormCard>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-amber-950">Notificaciones de cierre</h3>
            <p className="text-xs font-semibold text-amber-800">Dias sin cierre completo en los ultimos 5 dias.</p>
          </div>
          {notificacionesCierreQuery.isFetching ? <span className="text-xs font-bold text-amber-700">Actualizando...</span> : null}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {notificacionesCierre.length ? notificacionesCierre.map((item) => (
            <button
              key={item.fecha}
              type="button"
              className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-left transition hover:border-amber-400"
              onClick={() => { setFecha(item.fecha); setResultado(null); setCierreResultado(null) }}
            >
              <p className="font-bold text-slate-900">{item.fecha}</p>
              <p className="text-xs text-slate-600">{item.mensaje}</p>
              <p className="mt-1 text-xs font-semibold text-amber-700">Pendientes cuadre: {quantity(item.pendientesCuadre)}</p>
            </button>
          )) : (
            <div className="rounded-lg border border-emerald-200 bg-white px-3 py-3 text-sm font-semibold text-emerald-700">
              No hay cierres pendientes en los ultimos 5 dias.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Rutas</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{quantity(resumen.total)}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase text-emerald-700">Listas</p>
          <p className="mt-1 text-2xl font-black text-emerald-800">{quantity(resumen.listos)}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase text-blue-700">Registradas</p>
          <p className="mt-1 text-2xl font-black text-blue-800">{quantity(resumen.registrados)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase text-amber-700">Omitidas</p>
          <p className="mt-1 text-2xl font-black text-amber-800">{quantity(resumen.omitidos)}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase text-red-700">Errores</p>
          <p className="mt-1 text-2xl font-black text-red-800">{quantity(resumen.errores)}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-bold text-slate-900">{resultado ? 'Resultado de ejecucion' : 'Preview de rutas'}</h3>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-3">Ruta</th>
                <th className="px-3 py-3">Vendedor</th>
                <th className="px-3 py-3 text-right">OT</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Mensaje</th>
                <th className="px-3 py-3 text-right">Cuadre</th>
              </tr>
            </thead>
            <tbody>
              {previewQuery.isLoading && !resultado ? (
                <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={6}>Consultando rutas...</td></tr>
              ) : previewQuery.isError && !resultado ? (
                <tr><td className="px-3 py-8 text-center text-red-600" colSpan={6}>No se pudo consultar rutas.</td></tr>
              ) : rutas.length ? rutas.map((row, index) => (
                <tr key={`${row.idRuta ?? 'ruta'}-${index}`} className="odd:bg-white even:bg-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{row.idRuta} - {row.ruta}</td>
                  <td className="px-3 py-3 text-slate-700">{row.vendedor ?? '-'}</td>
                  <td className="px-3 py-3 text-right font-semibold">{quantity(row.cantidadOt)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.estado)}`}>{row.estado}</span>
                  </td>
                  <td className="min-w-[260px] px-3 py-3 text-slate-700">{row.mensaje || '-'}</td>
                  <td className="px-3 py-3 text-right font-semibold">{row.idCuadre ?? '-'}</td>
                </tr>
              )) : (
                <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={6}>Sin rutas pendientes para la fecha seleccionada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default SistemasCuadreAutomaticoPage
