import { useEffect, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faCheck, faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import Modal from '../common/Modal'
import Button from '../common/Button'
import {
  fetchCorteTapDetalle,
  fetchCorteTapCatalogos,
  finalizarCorteTap,
  guardarCorteTapDigitacion,
  guardarCorteTapEjecucion,
  guardarCorteTapEstado,
  guardarCorteTapObservacion,
  guardarDatosCorteTapDigitador,
  resolverCorteTapZonaHfc,
  type CorteTapRow,
  type CorteTapEstado,
} from '../../api/corteTapApi'
import { getApiErrorMessage } from '../../services/httpClient'
import { useFileSizeLimitModal } from '../../hooks/useFileSizeLimitModal'

type DetailMode = 'digitador' | 'tecnico'

type Props = {
  id: number | null
  mode: DetailMode
  onClose: () => void
}

const readValue = (row: CorteTapRow | undefined, keys: string[]): unknown => {
  if (!row) return null
  for (const key of keys) {
    const found = Object.entries(row).find(([name]) => name.toLowerCase() === key.toLowerCase())
    if (found?.[1] !== undefined && found[1] !== null && String(found[1]).trim() !== '') return found[1]
  }
  return null
}

const readText = (row: CorteTapRow | undefined, keys: string[]): string => {
  const value = readValue(row, keys)
  return value === null ? '' : String(value).trim()
}

const formatDateTime = (value: unknown): string => {
  if (value === undefined || value === null || String(value).trim() === '') return '-'
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const resolveImageSrc = (value: string): string => {
  if (!value) return ''
  if (value.startsWith('data:image') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  return `data:image/jpeg;base64,${value}`
}

const localDateTimeNow = (): string => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

const ZONA_HFC_PATTERN = /^NODO [A-Z]{3}\d{3,4}$/i
const NODO_TAP_BOCA_ANTIGUO_PATTERN = /^NODO [A-Z]{3}\d{3,4} RAMAL [A-Z] \d{3} BOCA \d$/i
const NODO_TAP_BOCA_ANTIGUO_PARTIAL_PATTERN = /^(?:|N|NO|NOD|NODO(?:\s+[A-Z]{0,3}\d{0,4}(?:\s+(?:R|RA|RAM|RAMA|RAMAL)(?:\s+[A-Z]?(?:\s+\d{0,3}(?:\s+(?:B|BO|BOC|BOCA)(?:\s+\d?)?)?)?)?)?)?) ?$/i

const normalizeZonaHfcInput = (value: string): string => {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const withoutPrefix = compact.startsWith('NODO') ? compact.slice(4) : compact
  const letters = withoutPrefix.replace(/[^A-Z]/g, '').slice(0, 3)
  const digits = withoutPrefix.replace(/[^0-9]/g, '').slice(0, 4)
  return `NODO ${letters}${digits}`.trimEnd()
}

const toDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-[11px] font-bold uppercase text-slate-500">{label}</dt>
    <dd className="mt-0.5 break-words font-medium text-slate-800">{value || '-'}</dd>
  </div>
)

const CorteTapDetailModal = ({ id, mode, onClose }: Props) => {
  const { validateFileSize, FileSizeLimitModal } = useFileSizeLimitModal()
  const queryClient = useQueryClient()
  const [nodoTapBocaAntiguo, setNodoTapBocaAntiguo] = useState('')
  const [zonaHfc, setZonaHfc] = useState('')
  const [ordenTrabajo, setOrdenTrabajo] = useState('')
  const [observacion, setObservacion] = useState('')
  const [estadoEditable, setEstadoEditable] = useState<CorteTapEstado>('PENDIENTE')
  const [fechaEjecucion, setFechaEjecucion] = useState(localDateTimeNow)
  const [foto1, setFoto1] = useState<string | null>(null)
  const [foto2, setFoto2] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['corte-tap-detalle', id],
    queryFn: () => fetchCorteTapDetalle(id as number),
    enabled: id !== null,
  })

  const estadosQuery = useQuery({
    queryKey: ['corte-tap-estados'],
    queryFn: fetchCorteTapCatalogos,
    enabled: id !== null && mode === 'digitador',
    staleTime: 300_000,
  })

  const row = detailQuery.data
  const digitado = Boolean(readValue(row, ['FechaRegDig_D2']))
  const estado = readText(row, ['Estado']).toUpperCase()
  const ejecutado = estado === 'EJECUTADA'
  const finalizado = estado === 'FINALIZADO' || estado === 'FINALIZADA'
  const cancelado = estado === 'CANCELADA'
  const pasoDigitador = readText(row, ['Paso', 'paso']).toUpperCase()
  const pasoFinal = pasoDigitador === 'PF'
  const estadoBloqueado = ejecutado || finalizado || cancelado || pasoFinal
  const digitadorBloqueado = estadoBloqueado || pasoDigitador === 'P2' || pasoDigitador === 'P3'
  const tecnicoCompleto = Boolean(readValue(row, ['FechaRegTec_T3']))
  const cerrado = estadoBloqueado
  const estadosDelProcedimiento = (estadosQuery.data?.estados ?? [])
    .map((item) => String(
      item.estado
      ?? item.Estado
      ?? item.EstadoCorteTap
      ?? item.estadoCorteTap
      ?? item.Nombre
      ?? item.nombre
      ?? item.Descripcion
      ?? item.descripcion
      ?? '',
    ).trim().toUpperCase())
    .filter((value, index, values) => value && values.indexOf(value) === index) as CorteTapEstado[]
  const estadosBase: CorteTapEstado[] = estadosDelProcedimiento.length > 0
    ? estadosDelProcedimiento
    : ['PENDIENTE', 'EJECUTADA', 'FINALIZADO']
  const estadosDigitador = estadosBase.filter((option) => option !== 'EJECUTADA')
  const estadosDisponibles: CorteTapEstado[] = estado === 'EJECUTADA'
    ? [estado]
    : estado && !estadosDigitador.includes(estado)
      ? [estado, ...estadosDigitador]
      : estadosDigitador
  const zonaHfcCompleta = ZONA_HFC_PATTERN.test(zonaHfc.trim())
  const nodoTapBocaAntiguoCompleto = NODO_TAP_BOCA_ANTIGUO_PATTERN.test(nodoTapBocaAntiguo.trim())

  const resolucionZonaHfcQuery = useQuery({
    queryKey: ['corte-tap-resolucion-zona-hfc', zonaHfc.trim().toUpperCase()],
    queryFn: () => resolverCorteTapZonaHfc(zonaHfc.trim()),
    enabled: id !== null && mode === 'digitador' && !cerrado && zonaHfcCompleta,
    retry: false,
    staleTime: 300_000,
  })

  useEffect(() => {
    if (!row) return
    setNodoTapBocaAntiguo(readText(row, ['NodoTapBocaAntiguo_D2', 'nodoTapBocaAntiguo_D2']))
    setZonaHfc(readText(row, ['Zona_HFC_D2']))
    const estadoGuardado = readText(row, ['Estado']).toUpperCase()
    setEstadoEditable(estadoGuardado || 'PENDIENTE')
    setOrdenTrabajo(readText(row, ['OrdenTrabajo_T3']))
    setObservacion(readText(row, mode === 'digitador' ? ['Observacion_D2', 'Observacion_T3'] : ['Observacion_T3', 'Observacion_D2']))
    setFoto1(readText(row, ['Foto1_T3']) || null)
    setFoto2(readText(row, ['Foto2_T3']) || null)
    const savedDate = readText(row, ['FechaEjecucion_T3'])
    setFechaEjecucion(savedDate ? savedDate.replace(' ', 'T').slice(0, 16) : localDateTimeNow())
    setError(null)
    setSuccess(null)
  }, [row, mode])

  const refreshLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ot-dashboard-cortes-tap'] }),
      queryClient.invalidateQueries({ queryKey: ['digitador-cortes-tap'] }),
      queryClient.invalidateQueries({ queryKey: ['corte-tap-detalle', id] }),
    ])
  }

  const digitacionMutation = useMutation({
    mutationFn: () => guardarCorteTapDigitacion(id as number, { nodoTapBocaAntiguo, zonaHfc }),
    onSuccess: async () => {
      setError(null)
      setSuccess('Datos del digitador guardados. El Corte TAP ya se puede finalizar.')
      await refreshLists()
    },
    onError: (value) => {
      setSuccess(null)
      setError(getApiErrorMessage(value, 'No se pudo guardar la digitacion.'))
    },
  })

  const ejecucionMutation = useMutation({
    mutationFn: () => guardarCorteTapEjecucion(id as number, {
      ordenTrabajo,
      observacion,
      foto1,
      foto2,
      fechaEjecucion,
    }),
    onSuccess: async () => {
      setError(null)
      setSuccess('Corte TAP ejecutado correctamente.')
      await refreshLists()
    },
    onError: (value) => {
      setSuccess(null)
      setError(getApiErrorMessage(value, 'No se pudo ejecutar el Corte TAP.'))
    },
  })

  const estadoMutation = useMutation({
    mutationFn: () => guardarCorteTapEstado(id as number, estadoEditable),
    onSuccess: async () => {
      setError(null)
      setSuccess('Estado de Corte TAP actualizado correctamente.')
      await refreshLists()
    },
    onError: (value) => {
      setSuccess(null)
      setError(getApiErrorMessage(value, 'No se pudo actualizar el estado.'))
    },
  })

  const observacionMutation = useMutation({
    mutationFn: () => guardarCorteTapObservacion(id as number, observacion),
    onSuccess: async () => {
      setError(null)
      setSuccess('Observacion de Corte TAP actualizada correctamente.')
      await refreshLists()
    },
    onError: (value) => {
      setSuccess(null)
      setError(getApiErrorMessage(value, 'No se pudo actualizar la observacion.'))
    },
  })

  const guardarTodoMutation = useMutation({
    mutationFn: () => guardarDatosCorteTapDigitador(id as number, {
      nodoTapBocaAntiguo,
      zonaHfc,
      estado: estadoEditable,
      observacion,
    }),
    onSuccess: async () => {
      setError(null)
      setSuccess('Datos del digitador guardados correctamente.')
      await refreshLists()
    },
    onError: (value) => {
      setSuccess(null)
      setError(getApiErrorMessage(value, 'No se pudieron guardar los datos.'))
    },
  })

  const finalizacionMutation = useMutation({
    mutationFn: () => finalizarCorteTap(id as number),
    onSuccess: async () => {
      setError(null)
      setSuccess('Corte TAP finalizado correctamente.')
      await refreshLists()
    },
    onError: (value) => {
      setSuccess(null)
      setError(getApiErrorMessage(value, 'No se pudo finalizar el Corte TAP.'))
    },
  })

  const handlePhoto = async (slot: 1 | 2, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen.')
      return
    }
    if (!validateFileSize(file)) return
    try {
      const value = await toDataUrl(file)
      if (slot === 1) setFoto1(value)
      else setFoto2(value)
      setError(null)
    } catch {
      setError('No se pudo leer la imagen.')
    }
  }

  const saving = digitacionMutation.isPending || ejecucionMutation.isPending || estadoMutation.isPending || observacionMutation.isPending || guardarTodoMutation.isPending || finalizacionMutation.isPending

  return (
    <Modal
      open={id !== null}
      title={`Detalle Corte TAP${readText(row, ['CodigoCliente_OT1']) ? ` - ${readText(row, ['CodigoCliente_OT1'])}` : ''}`}
      onClose={saving ? () => undefined : onClose}
      maxWidthClass="max-w-4xl"
    >
      {detailQuery.isLoading ? (
        <div className="py-12 text-center font-medium text-slate-500">Cargando detalle...</div>
      ) : detailQuery.isError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">No se pudo cargar el detalle.</div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-slate-200 pb-2 sm:grid-cols-3 sm:gap-3 sm:pb-3">
            <Field label="Cliente" value={readText(row, ['CodigoCliente_OT1'])} />
            <Field label="TOR" value={readText(row, ['TOR_OT1'])} />
            <div>
              <dt className="text-[11px] font-bold uppercase text-slate-500">Estado</dt>
              <div className="mt-1 flex items-center gap-2">
                <select
                  className="input-base min-w-36 py-1.5 text-sm"
                  value={estadoEditable}
                  onChange={(event) => setEstadoEditable(event.target.value as CorteTapEstado)}
                  disabled={saving || estadoBloqueado || digitadorBloqueado}
                  aria-label="Estado del Corte TAP"
                >
                  {estadosDisponibles.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <Field label="Tecnico" value={readText(row, ['Tecnico1_OT1'])} />
            <Field label="Sucursal" value={readText(row, ['Sucursal_OT1'])} />
            <Field label="Etapa digitador" value={digitado ? 'COMPLETADA' : 'PENDIENTE'} />
          </dl>

          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div> : null}
          {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">{success}</div> : null}

          {mode === 'digitador' ? (
            <section>
              <h4 className="text-base font-bold text-slate-900">Datos de digitacion</h4>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">
                  Zona HFC
                  <input
                    className={`input-base mt-1 ${zonaHfc && !zonaHfcCompleta ? 'border-rose-500' : ''}`}
                    value={zonaHfc}
                    onChange={(event) => setZonaHfc(normalizeZonaHfcInput(event.target.value))}
                    placeholder="NODO SCZ0001"
                    pattern="NODO [A-Z]{3}[0-9]{3,4}"
                    title="Formato: NODO SCZ0001"
                    disabled={cerrado || digitadorBloqueado}
                  />
                </label>
                {zonaHfc && !zonaHfcCompleta ? <span className="text-xs font-medium text-rose-600 sm:col-span-3">Usa: NODO SCZ0001.</span> : null}
                <Field
                  label="Zona determinada"
                  value={resolucionZonaHfcQuery.isFetching ? 'Consultando...' : resolucionZonaHfcQuery.data?.zona || readText(row, ['Zona_D2'])}
                />
                <Field
                  label="Distrito determinado"
                  value={resolucionZonaHfcQuery.isFetching ? 'Consultando...' : resolucionZonaHfcQuery.data?.distrito || readText(row, ['Distrito_D2'])}
                />
                <label className="text-sm font-semibold text-slate-700 sm:col-span-3">
                  Nodo / TAP / Boca antiguo
                  <input
                    className={`input-base mt-1 ${nodoTapBocaAntiguo && !nodoTapBocaAntiguoCompleto ? 'border-rose-500' : ''}`}
                    value={nodoTapBocaAntiguo}
                    onChange={(event) => { const value = event.target.value.toUpperCase().slice(0, 50); if (NODO_TAP_BOCA_ANTIGUO_PARTIAL_PATTERN.test(value)) setNodoTapBocaAntiguo(value) }}
                    placeholder="NODO SCZ0001 RAMAL D 001 BOCA 1"
                    pattern="NODO [A-Z]{3}[0-9]{3,4} RAMAL [A-Z] [0-9]{3} BOCA [0-9]"
                    title="Formato: NODO SCZ0001 RAMAL D 001 BOCA 1"
                    disabled={cerrado || digitadorBloqueado}
                  />
                </label>
                {nodoTapBocaAntiguo && !nodoTapBocaAntiguoCompleto ? <span className="text-xs font-medium text-rose-600 sm:col-span-3">Usa: NODO SCZ0001 RAMAL D 001 BOCA 1.</span> : null}
              </div>
              {zonaHfcCompleta && resolucionZonaHfcQuery.isError ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                  No se encontro Zona y Distrito para {zonaHfc.trim().toUpperCase()}.
                </div>
              ) : null}
              {tecnicoCompleto ? (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                  <h4 className="text-base font-bold text-slate-900">Datos cargados por el tecnico</h4>
                  <dl className="mt-1.5 grid gap-1.5 rounded-lg bg-slate-100 p-2 sm:gap-2 sm:p-3 sm:grid-cols-2">
                    <Field label="Orden de trabajo" value={readText(row, ['OrdenTrabajo_T3'])} />
                    <Field label="Fecha de ejecucion" value={formatDateTime(readValue(row, ['FechaEjecucion_T3']))} />
                    <Field label="Usuario tecnico" value={readText(row, ['UsuarioTec_T3'])} />
                    <Field label="Fecha de registro tecnico" value={formatDateTime(readValue(row, ['FechaRegTec_T3']))} />
                    <div className="sm:col-span-2">
                      <Field label="Observacion" value={readText(row, ['Observacion_T3'])} />
                    </div>
                  </dl>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[readText(row, ['Foto1_T3']), readText(row, ['Foto2_T3'])].map((photo, index) => (
                      photo ? (
                        <div key={index}>
                          <p className="text-[11px] font-bold uppercase text-slate-500">Foto {index + 1}</p>
                          <img
                            className="mt-1 h-24 w-full rounded-lg border border-slate-200 bg-white object-contain"
                            src={resolveImageSrc(photo)}
                            alt={`Foto ${index + 1} cargada por el tecnico`}
                          />
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              ) : null}
              <label className="mt-3 block text-sm font-semibold text-slate-700">
                Observacion
                <textarea
                  className="input-base mt-1 min-h-24 resize-y"
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  disabled={mode !== 'digitador' || saving || cerrado || digitadorBloqueado}
                  maxLength={1000}
                  placeholder="Escribe una observacion"
                />
              </label>
              {!digitadorBloqueado ? <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  onClick={() => guardarTodoMutation.mutate()}
                  disabled={saving || pasoFinal || !zonaHfcCompleta || !nodoTapBocaAntiguoCompleto}
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  Guardar datos
                </Button>
              </div> : null}
              {digitado && estado !== 'PENDIENTE' && !finalizado && !cancelado && !pasoFinal ? (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-emerald-800">
                    {tecnicoCompleto ? 'El tecnico completo los datos finales.' : 'La digitacion esta completa.'} El Corte TAP esta listo para finalizar.
                  </p>
                  <Button type="button" onClick={() => finalizacionMutation.mutate()} disabled={saving}>
                    <FontAwesomeIcon icon={faCheck} />
                    Finalizar Corte TAP
                  </Button>
                </div>
              ) : null}
              {finalizado ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-800">
                  Corte TAP finalizado.
                </div>
              ) : null}
            </section>
          ) : (
            <section>
              <div className="grid gap-1.5 rounded-lg bg-slate-100 p-2 sm:gap-2 sm:p-3 sm:grid-cols-2">
                <Field label="Nodo / TAP / Boca antiguo" value={nodoTapBocaAntiguo} />
                <Field label="Zona HFC" value={readText(row, ['Zona_HFC_D2'])} />
                <Field label="Zona" value={readText(row, ['Zona_D2'])} />
                <Field label="Distrito" value={readText(row, ['Distrito_D2'])} />
              </div>

              {!digitado ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-medium text-amber-800">
                  Pendiente de modificacion por el digitador.
                </div>
              ) : (
                <>
                  <h4 className="mt-3 text-base font-bold text-slate-900">Ejecucion tecnica</h4>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Orden de trabajo
                      <input className="input-base mt-1" value={ordenTrabajo} onChange={(event) => setOrdenTrabajo(event.target.value.replace(/\D/g, ''))} inputMode="numeric" pattern="[0-9]*" disabled={cerrado} />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Fecha de ejecucion
                      <input className="input-base mt-1 bg-slate-100" type="datetime-local" value={fechaEjecucion} readOnly aria-readonly="true" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                      Observacion
                      <textarea className="input-base mt-1 min-h-24 resize-y" value={observacion} onChange={(event) => setObservacion(event.target.value)} disabled={cerrado} />
                    </label>
                    {[1, 2].map((slot) => {
                      const photo = slot === 1 ? foto1 : foto2
                      return (
                        <div key={slot}>
                          <label className="text-sm font-semibold text-slate-700">Foto {slot}{slot === 1 ? ' (se requiere al menos una)' : ''}</label>
                          {photo ? <img className="mt-1 h-28 w-full rounded-lg border border-slate-200 object-contain" src={photo} alt={`Foto ${slot} del Corte TAP`} /> : null}
                          {!cerrado ? (
                            <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:border-brand-400">
                              <FontAwesomeIcon icon={faCamera} />
                              {photo ? 'Cambiar foto' : 'Seleccionar foto'}
                              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => void handlePhoto(slot as 1 | 2, event)} />
                            </label>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  {!cerrado ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => ejecucionMutation.mutate()}
                        disabled={saving || !ordenTrabajo.trim() || !observacion.trim() || !fechaEjecucion || (!foto1 && !foto2)}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        Marcar ejecutado
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          )}
        </div>
      )}
      <FileSizeLimitModal />
    </Modal>
  )
}

export default CorteTapDetailModal
