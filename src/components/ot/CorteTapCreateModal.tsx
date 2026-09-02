import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { crearCorteTap, fetchCorteTapCatalogos, resolverCorteTapZonaHfc, type CorteTapCrearPayload } from '../../api/corteTapApi'
import { fetchTecnicos } from '../../api/catalogApi'
import { getApiErrorMessage } from '../../services/httpClient'

type Props = { open: boolean; onClose: () => void }
type TechnicianOption = { id: number; name: string }

const readValue = (row: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = Object.entries(row).find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1]
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return ''
}

const normalizeZonaHfcInput = (value: string): string => {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const withoutPrefix = compact.startsWith('NODO') ? compact.slice(4) : compact
  const letters = withoutPrefix.replace(/[^A-Z]/g, '').slice(0, 3)
  const digits = withoutPrefix.replace(/[^0-9]/g, '').slice(0, 4)
  return `NODO ${letters}${digits}`.trimEnd()
}

const NODO_TAP_BOCA_ANTIGUO_PARTIAL_PATTERN = /^(?:|N|NO|NOD|NODO(?:\s+[A-Z]{0,3}\d{0,4}(?:\s+(?:R|RA|RAM|RAMA|RAMAL)(?:\s+[A-Z]?(?:\s+\d{0,3}(?:\s+(?:B|BO|BOC|BOCA)(?:\s+\d?)?)?)?)?)?)?) ?$/i

const CorteTapCreateModal = ({ open, onClose }: Props) => {
  const queryClient = useQueryClient()
  const [codigoCliente, setCodigoCliente] = useState('')
  const [idTecnico, setIdTecnico] = useState('')
  const [nodoTapBocaAntiguo, setNodoTapBocaAntiguo] = useState('')
  const [zonaHfc, setZonaHfc] = useState('')
  const [estado, setEstado] = useState('PENDIENTE')
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const tecnicosQuery = useQuery({ queryKey: ['catalogos', 'tecnicos', 'corte-tap'], queryFn: fetchTecnicos, enabled: open, staleTime: 300_000 })
  const estadosQuery = useQuery({ queryKey: ['corte-tap-estados'], queryFn: fetchCorteTapCatalogos, enabled: open, staleTime: 300_000 })

  const tecnicos = useMemo<TechnicianOption[]>(() => (tecnicosQuery.data ?? [])
    .map((row) => ({
      id: Number(readValue(row, ['idTecnico', 'IdTecnico', 'id_tecnico', 'idVendedor', 'IdVendedor', 'id_vendedor'])),
      name: readValue(row, ['tecnico', 'Tecnico', 'nombreTecnico', 'NombreTecnico', 'nombre', 'Nombre', 'vendedor', 'Vendedor']),
    }))
    .filter((item, index, values) => Number.isFinite(item.id) && item.id > 0 && item.name && values.findIndex((value) => value.id === item.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')), [tecnicosQuery.data])

  const estados = useMemo(() => {
    const values = (estadosQuery.data?.estados ?? [])
      .map((row) => readValue(row, ['estado', 'Estado', 'EstadoCorteTap', 'Nombre', 'Descripcion']).toUpperCase())
      .filter((value, index, all) => value && all.indexOf(value) === index)
    return values.length ? values : ['PENDIENTE', 'EJECUTADA', 'FINALIZADO', 'CANCELADA']
  }, [estadosQuery.data])
  const zonaCompleta = /^NODO [A-Z]{3}\d{3,4}$/i.test(zonaHfc.trim())
  const nodoTapBocaAntiguoCompleto = /^NODO [A-Z]{3}\d{3,4} RAMAL [A-Z] \d{3} BOCA \d$/i.test(nodoTapBocaAntiguo.trim())
  const resolucionQuery = useQuery({
    queryKey: ['nuevo-corte-tap-zona', zonaHfc.trim().toUpperCase()],
    queryFn: () => resolverCorteTapZonaHfc(zonaHfc.trim()),
    enabled: open && zonaCompleta,
    retry: false,
  })

  useEffect(() => {
    if (!open) return
    setCodigoCliente(''); setIdTecnico(''); setNodoTapBocaAntiguo('')
    setZonaHfc(''); setEstado('PENDIENTE'); setObservacion(''); setError(null)
  }, [open])

  const mutation = useMutation({
    mutationFn: () => {
      const tecnico = tecnicos.find((item) => String(item.id) === idTecnico)
      const zona = resolucionQuery.data?.zona?.trim() || ''
      const distrito = resolucionQuery.data?.distrito?.trim() || ''
      if (!/^\d+$/.test(codigoCliente.trim()) || !tecnico || !nodoTapBocaAntiguoCompleto || !zonaCompleta || !zona || !distrito) {
        throw new Error('Completa los datos requeridos con los formatos indicados y verifica la Zona HFC.')
      }
      const payload: CorteTapCrearPayload = {
        codigoCliente: codigoCliente.trim(), tor: 'SO1', idTecnico: tecnico.id, tecnico: tecnico.name,
        nodoTapBocaAntiguo: nodoTapBocaAntiguo.trim().toUpperCase(), nodoTapBoca: nodoTapBocaAntiguo.trim().toUpperCase(),
        zonaHfc: zonaHfc.trim().toUpperCase(), estado, observacion: observacion.trim(),
      }
      return crearCorteTap(payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['digitador-cortes-tap'] }),
        queryClient.invalidateQueries({ queryKey: ['ot-dashboard-cortes-tap'] }),
      ])
      onClose()
    },
    onError: (value) => setError(getApiErrorMessage(value, 'No se pudo crear el Corte TAP.')),
  })

  return (
    <Modal open={open} title="Nuevo Corte TAP" onClose={mutation.isPending ? () => undefined : onClose} maxWidthClass="max-w-2xl">
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); setError(null); mutation.mutate() }}>
        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Cliente<input className="input-base mt-1" value={codigoCliente} onChange={(event) => setCodigoCliente(event.target.value.replace(/\D/g, ''))} inputMode="numeric" pattern="[0-9]+" required autoFocus /></label>
          <label className="text-sm font-semibold text-slate-700">TOR<input className="input-base mt-1 bg-slate-100" value="SO1" readOnly /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Técnico<select className="input-base mt-1" value={idTecnico} onChange={(event) => setIdTecnico(event.target.value)} required disabled={tecnicosQuery.isLoading}><option value="">{tecnicosQuery.isLoading ? 'Cargando técnicos...' : 'Selecciona un técnico'}</option>{tecnicos.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Zona HFC<input className={`input-base mt-1 ${zonaHfc && !zonaCompleta ? 'border-rose-500' : ''}`} value={zonaHfc} onChange={(event) => setZonaHfc(normalizeZonaHfcInput(event.target.value))} placeholder="NODO SCZ0001" maxLength={12} pattern="NODO [A-Z]{3}[0-9]{3,4}" title="Formato: NODO SCZ0001" required />{zonaHfc && !zonaCompleta ? <span className="mt-1 block text-xs font-medium text-rose-600">Usa: NODO SCZ0001.</span> : null}</label>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-2 text-sm"><div><span className="text-[10px] font-bold uppercase text-slate-500">Zona</span><p className="font-medium">{resolucionQuery.isFetching ? 'Consultando...' : resolucionQuery.data?.zona || '-'}</p></div><div><span className="text-[10px] font-bold uppercase text-slate-500">Distrito</span><p className="font-medium">{resolucionQuery.isFetching ? 'Consultando...' : resolucionQuery.data?.distrito || '-'}</p></div></div>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Nodo/TAP/Boca antiguo<input className={`input-base mt-1 ${nodoTapBocaAntiguo && !nodoTapBocaAntiguoCompleto ? 'border-rose-500' : ''}`} value={nodoTapBocaAntiguo} onChange={(event) => { const value = event.target.value.toUpperCase().slice(0, 50); if (NODO_TAP_BOCA_ANTIGUO_PARTIAL_PATTERN.test(value)) setNodoTapBocaAntiguo(value) }} placeholder="NODO SCZ0001 RAMAL D 001 BOCA 1" maxLength={50} pattern="NODO [A-Z]{3}[0-9]{3,4} RAMAL [A-Z] [0-9]{3} BOCA [0-9]" title="Formato: NODO SCZ0001 RAMAL D 001 BOCA 1" required />{nodoTapBocaAntiguo && !nodoTapBocaAntiguoCompleto ? <span className="mt-1 block text-xs font-medium text-rose-600">Usa: NODO SCZ0001 RAMAL D 001 BOCA 1.</span> : null}</label>
          <label className="text-sm font-semibold text-slate-700">Estado<select className="input-base mt-1" value={estado} onChange={(event) => setEstado(event.target.value)}>{estados.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Observación<textarea className="input-base mt-1 min-h-20 resize-y" value={observacion} onChange={(event) => setObservacion(event.target.value)} maxLength={1000} /></label>
        </div>
        <div className="flex justify-end pt-1"><Button type="submit" disabled={mutation.isPending || tecnicosQuery.isLoading || resolucionQuery.isFetching || !zonaCompleta || !nodoTapBocaAntiguoCompleto}><FontAwesomeIcon icon={faFloppyDisk} />{mutation.isPending ? 'Guardando...' : 'Guardar Corte TAP'}</Button></div>
      </form>
    </Modal>
  )
}

export default CorteTapCreateModal
