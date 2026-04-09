import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import { deleteOt } from '../api/otApi'
import { useSessionStore } from '../store/sessionStore'

const OtAnularPage = () => {
  const session = useSessionStore((state) => state.session)
  const [idOt, setIdOt] = useState('')
  const [modo, setModo] = useState<'con_cu' | 'solo_cu'>('solo_cu')
  const [idUsuario, setIdUsuario] = useState(session?.idUsuario ? String(session.idUsuario) : '')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!idUsuario && session?.idUsuario) {
      setIdUsuario(String(session.idUsuario))
    }
  }, [idUsuario, session?.idUsuario])

  const mutation = useMutation({
    mutationFn: ({
      id,
      modoValue,
      usuario,
    }: {
      id: number
      modoValue: 'con_cu' | 'solo_cu'
      usuario?: number
    }) => deleteOt(id, modoValue, usuario),
    onSuccess: () => {
      setError(null)
      setConfirmOpen(false)
    },
    onError: () => {
      setError('No se pudo anular la OT.')
    },
  })

  const handleConfirm = () => {
    const id = Number(idOt)
    if (!Number.isFinite(id)) {
      setError('ID OT invalido.')
      return
    }

    let usuario: number | undefined
    if (modo === 'solo_cu') {
      const parsedUsuario = Number(idUsuario)
      if (!Number.isFinite(parsedUsuario)) {
        setError('ID Usuario es requerido para modo solo_cu.')
        return
      }
      usuario = parsedUsuario
    }

    setError(null)
    mutation.mutate({ id, modoValue: modo, usuario })
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Anular OT</h2>
        <p className="text-sm text-slate-500">Confirma antes de anular una orden.</p>
      </div>

      <FormCard title="Confirmacion" description="Selecciona el modo de anulacion.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ID OT">
            <input className="input-base" value={idOt} onChange={(event) => setIdOt(event.target.value)} />
          </Field>
          <Field label="Modo">
            <select className="input-base" value={modo} onChange={(event) => setModo(event.target.value as 'con_cu' | 'solo_cu')}>
              <option value="solo_cu">Solo CU</option>
              <option value="con_cu">Con CU</option>
            </select>
          </Field>
          {modo === 'solo_cu' ? (
            <Field label="ID Usuario">
              <input className="input-base" value={idUsuario} onChange={(event) => setIdUsuario(event.target.value)} />
            </Field>
          ) : null}
        </div>

        {modo === 'con_cu' ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            El modo <strong>con_cu</strong> puede devolver 501 porque aun no esta implementado en backend.
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={() => setConfirmOpen(true)}>
            Anular OT
          </Button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        ) : null}
        {mutation.isSuccess ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
            OT anulada correctamente.
          </div>
        ) : null}
      </FormCard>

      <Modal
        open={confirmOpen}
        title="Confirmar anulacion"
        onClose={() => setConfirmOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} type="button">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} type="button" disabled={mutation.isPending}>
              {mutation.isPending ? 'Anulando...' : 'Confirmar'}
            </Button>
          </>
        }
      >
        Estas seguro de anular la OT {idOt}? Esta accion puede impactar cargos y materiales.
      </Modal>
    </div>
  )
}

export default OtAnularPage
