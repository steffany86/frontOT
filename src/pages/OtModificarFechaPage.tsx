import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { updateOtFecha } from '../api/otApi'
import { todayISO } from '../utils/dates'
import { useSessionStore } from '../store/sessionStore'

const OtModificarFechaPage = () => {
  const session = useSessionStore((state) => state.session)
  const [idOt, setIdOt] = useState('')
  const [fechaVieja, setFechaVieja] = useState(todayISO())
  const [fechaNueva, setFechaNueva] = useState(todayISO())
  const [idRuta, setIdRuta] = useState('')
  const [idUsuario, setIdUsuario] = useState(session?.idUsuario ? String(session.idUsuario) : '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!idUsuario && session?.idUsuario) {
      setIdUsuario(String(session.idUsuario))
    }
  }, [idUsuario, session?.idUsuario])

  const mutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: { fechaVieja: string; fechaNueva: string; idRuta: number; idUsuario: number }
    }) => updateOtFecha(id, payload),
    onError: () => {
      setError('No se pudo modificar la fecha de la OT.')
    },
    onSuccess: () => {
      setError(null)
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const id = Number(idOt)
    const ruta = Number(idRuta)
    const usuario = Number(idUsuario)
    if (!Number.isFinite(id) || !Number.isFinite(ruta) || !Number.isFinite(usuario)) {
      setError('ID OT, Ruta e ID Usuario son requeridos.')
      return
    }
    if (!fechaVieja || !fechaNueva) {
      setError('Fecha vieja y fecha nueva son requeridas.')
      return
    }
    setError(null)
    mutation.mutate({
      id,
      payload: {
        fechaVieja,
        fechaNueva,
        idRuta: ruta,
        idUsuario: usuario,
      },
    })
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Modificar fecha OT</h2>
        <p className="text-sm text-slate-500">Actualiza fecha validando ruta y cuadre.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <FormCard title="Actualizar fecha" description="Campos requeridos por PUT /ot/{id}/fecha.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ID OT">
              <input className="input-base" value={idOt} onChange={(event) => setIdOt(event.target.value)} />
            </Field>
            <Field label="ID Ruta">
              <input className="input-base" value={idRuta} onChange={(event) => setIdRuta(event.target.value)} />
            </Field>
            <Field label="Fecha vieja">
              <input className="input-base" type="date" value={fechaVieja} onChange={(event) => setFechaVieja(event.target.value)} />
            </Field>
            <Field label="Fecha nueva">
              <input className="input-base" type="date" value={fechaNueva} onChange={(event) => setFechaNueva(event.target.value)} />
            </Field>
            <Field label="ID Usuario">
              <input className="input-base" value={idUsuario} onChange={(event) => setIdUsuario(event.target.value)} />
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Actualizando...' : 'Guardar fecha'}
            </Button>
          </div>
          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
          ) : null}
          {mutation.isSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              Fecha actualizada correctamente.
            </div>
          ) : null}
        </FormCard>
      </form>
    </div>
  )
}

export default OtModificarFechaPage
