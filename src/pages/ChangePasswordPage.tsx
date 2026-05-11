import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import { useAuth } from '../context/AuthContext'
import { changePassword } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'

const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const { token, defaultPrivatePath, markPasswordChanged } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      await changePassword({ actual, nueva }, token ?? undefined)
    },
    onSuccess: () => {
      setError(null)
      setSuccess('Contrasena actualizada correctamente.')
      markPasswordChanged()
      navigate(defaultPrivatePath, { replace: true })
    },
    onError: (err) => {
      setSuccess(null)
      setError(getApiErrorMessage(err, 'No se pudo actualizar la contrasena.'))
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!actual.trim() || !nueva.trim() || !confirmacion.trim()) {
      setError('Completa todos los campos.')
      return
    }
    if (nueva !== confirmacion) {
      setError('La nueva contrasena y su confirmacion no coinciden.')
      return
    }
    if (nueva.length < 6) {
      setError('La nueva contrasena debe tener al menos 6 caracteres.')
      return
    }
    mutation.mutate()
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center">
        <form onSubmit={handleSubmit} className="glass-panel flex w-full flex-col gap-5 p-8">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Cambio obligatorio de contrasena</h2>
            <p className="text-sm text-slate-500">Debes actualizar tu contrasena para continuar.</p>
          </div>

          <Field label="Contrasena actual">
            <input
              className="input-base"
              type="password"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              disabled={mutation.isPending}
            />
          </Field>

          <Field label="Nueva contrasena">
            <input
              className="input-base"
              type="password"
              value={nueva}
              onChange={(event) => setNueva(event.target.value)}
              disabled={mutation.isPending}
            />
          </Field>

          <Field label="Confirmar nueva contrasena">
            <input
              className="input-base"
              type="password"
              value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
              disabled={mutation.isPending}
            />
          </Field>

          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Actualizando...' : 'Actualizar contrasena'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordPage
