import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../common/Button'
import Field from '../common/Field'
import Modal from '../common/Modal'
import SignaturePad from '../common/SignaturePad'
import { fetchLlamadaAtencionMotivos, fetchLlamadaAtencionTiposComunicacion } from '../../api/llamadaAtencionApi'
import { createLlamadaSupervision, firmarLlamadaSupervision, type LlamadaSupervisionResumen } from '../../api/supervisionV2Api'
import { getApiErrorMessage } from '../../services/httpClient'

interface LlamadaAtencionSupervisionModalProps {
  open: boolean
  /** crear: genera la llamada pendiente; firmar: el tecnico firma y la llamada se completa. */
  modo: 'crear' | 'firmar' | 'ver'
  /** Datos de la llamada, solo para el modo 'ver'. */
  llamada?: LlamadaSupervisionResumen
  idSupervision: string
  tecnico: string
  onClose: () => void
  /** Se llama cuando la llamada se genero o se firmo con exito (antes de cerrar). */
  onGuardado?: () => void
}

const LlamadaAtencionSupervisionModal = ({ open, modo, llamada, idSupervision, tecnico, onClose, onGuardado }: LlamadaAtencionSupervisionModalProps) => {
  const queryClient = useQueryClient()
  const [idTipoComunicacion, setIdTipoComunicacion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fechaSeguimiento, setFechaSeguimiento] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [comentario, setComentario] = useState('')
  const [acuerdos, setAcuerdos] = useState('')
  const [firmaTecnico, setFirmaTecnico] = useState('')
  const [testigo, setTestigo] = useState('')
  const [firmaTestigo, setFirmaTestigo] = useState('')
  const [invalidos, setInvalidos] = useState<string[]>([])
  const [error, setError] = useState('')

  const tiposQuery = useQuery({
    queryKey: ['llamada-atencion', 'tipos-comunicacion'],
    queryFn: fetchLlamadaAtencionTiposComunicacion,
    enabled: open && modo === 'crear',
    staleTime: 300_000,
  })
  const motivosQuery = useQuery({
    queryKey: ['llamada-atencion', 'motivos'],
    queryFn: fetchLlamadaAtencionMotivos,
    enabled: open && modo === 'crear',
    staleTime: 300_000,
  })

  const cerrar = () => {
    setIdTipoComunicacion('')
    setMotivo('')
    setFechaSeguimiento('')
    setDescripcion('')
    setComentario('')
    setAcuerdos('')
    setFirmaTecnico('')
    setTestigo('')
    setFirmaTestigo('')
    setInvalidos([])
    setError('')
    onClose()
  }

  const exito = async () => {
    await queryClient.invalidateQueries({ queryKey: ['supervision'] })
    await queryClient.invalidateQueries({ queryKey: ['supervision-v2'] })
    onGuardado?.()
    cerrar()
  }

  const crearMutation = useMutation({
    mutationFn: () =>
      createLlamadaSupervision(idSupervision, {
        idTipoComunicacion,
        motivo,
        descripcion: descripcion.trim() || undefined,
        comentarioColaborador: comentario.trim() || undefined,
        acuerdos: acuerdos.trim() || undefined,
        fechaSeguimiento: fechaSeguimiento || undefined,
      }),
    onSuccess: exito,
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo generar la llamada de atencion.')),
  })

  const firmarMutation = useMutation({
    mutationFn: () =>
      firmarLlamadaSupervision(idSupervision, {
        firmaTecnico,
        firmaTestigo: firmaTestigo || undefined,
        testigo: testigo.trim() || undefined,
      }),
    onSuccess: exito,
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo guardar la firma.')),
  })

  const guardar = () => {
    setError('')
    const faltan: string[] = []
    if (modo === 'crear') {
      if (!idTipoComunicacion) faltan.push('tipo')
      if (!motivo) faltan.push('motivo')
    } else if (!firmaTecnico.trim()) {
      faltan.push('firmaTecnico')
    }
    setInvalidos(faltan)
    if (faltan.length > 0) {
      setError('Completa los campos marcados en rojo.')
      return
    }
    if (modo === 'crear') crearMutation.mutate()
    else firmarMutation.mutate()
  }

  const inv = (campo: string) => invalidos.includes(campo)
  const guardando = crearMutation.isPending || firmarMutation.isPending

  return (
    <Modal
      compactText
      open={open}
      title={modo === 'crear' ? 'Llamada de atencion al tecnico' : modo === 'ver' ? 'Llamada de atencion' : 'Firma de la llamada de atencion'}
      onClose={cerrar}
      maxWidthClass="max-w-3xl"
      actions={
        <>
          <Button type="button" variant="secondary" onClick={cerrar} disabled={guardando}>
            {modo === 'ver' ? 'Cerrar' : 'Cancelar'}
          </Button>
          {modo === 'ver' ? null : (
            <Button type="button" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando...' : modo === 'crear' ? 'Generar llamada' : 'Guardar firma'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Tecnico: <strong className="text-slate-900">{tecnico || '-'}</strong>
        </p>

        {modo === 'ver' ? (
          <div className="space-y-2 text-sm">
            {[
              ['Estado', llamada?.firmado ? 'Firmada' : llamada?.estado],
              ['Motivo', llamada?.motivo],
              ['Fecha de registro', llamada?.fechaRegistro],
              ['Fecha de Evento', llamada?.fechaSeguimiento],
              ['Descripcion', llamada?.descripcion],
              ['Comentario del colaborador', llamada?.comentarioColaborador],
              ['Acuerdos', llamada?.acuerdos],
              ['Testigo', llamada?.testigo],
            ].map(([etiqueta, valor]) => (
              <p key={etiqueta} className="whitespace-pre-wrap break-words">
                <span className="mr-1.5 text-[10px] uppercase tracking-wide text-slate-400">{etiqueta}</span>
                {valor || ''}
              </p>
            ))}
          </div>
        ) : modo === 'crear' ? (
          <>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              La llamada se registra como <strong>Pendiente</strong>. Despues podras hacer firmar al tecnico desde el detalle de esta supervision.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tipo de comunicacion" invalid={inv('tipo')}>
                <select
                  className="input-base"
                  value={idTipoComunicacion}
                  onChange={(e) => setIdTipoComunicacion(e.target.value)}
                  disabled={tiposQuery.isLoading}
                >
                  <option value="">{tiposQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo de comunicacion'}</option>
                  {(tiposQuery.data ?? []).map((tipo) => (
                    <option key={tipo.idTipoComunicacion} value={tipo.idTipoComunicacion}>
                      {tipo.tipoComunicacion}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Motivo" invalid={inv('motivo')}>
                <select className="input-base" value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={motivosQuery.isLoading}>
                  <option value="">{motivosQuery.isLoading ? 'Cargando incidencias...' : 'Selecciona una incidencia'}</option>
                  {(motivosQuery.data ?? []).map((item) => (
                    <option key={item.idMotivo} value={item.motivo}>
                      {item.motivo}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de Evento">
                <input className="input-base" type="datetime-local" value={fechaSeguimiento} onChange={(e) => setFechaSeguimiento(e.target.value)} />
              </Field>
            </div>
            <Field label="Descripcion">
              <textarea className="input-base min-h-20" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Comentario del colaborador">
                <textarea className="input-base min-h-20" value={comentario} onChange={(e) => setComentario(e.target.value)} />
              </Field>
              <Field label="Acuerdos">
                <textarea className="input-base min-h-20" value={acuerdos} onChange={(e) => setAcuerdos(e.target.value)} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-wide ${inv('firmaTecnico') ? 'text-rose-600' : 'text-slate-500'}`}>Firma del tecnico</p>
              <div className={`rounded-2xl ${inv('firmaTecnico') ? 'ring-2 ring-rose-300' : ''}`}>
                <SignaturePad value={firmaTecnico} onChange={setFirmaTecnico} />
              </div>
            </div>
            <Field label="Testigo (opcional)">
              <input className="input-base" type="text" maxLength={150} value={testigo} placeholder="Nombre completo del testigo" onChange={(e) => setTestigo(e.target.value)} />
            </Field>
            {testigo.trim() ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Firma del testigo (opcional)</p>
                <SignaturePad value={firmaTestigo} onChange={setFirmaTestigo} />
              </div>
            ) : null}
          </>
        )}

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      </div>
    </Modal>
  )
}

export default LlamadaAtencionSupervisionModal
