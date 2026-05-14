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
  const { token, defaultPrivatePath, markPasswordChanged, logout } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmacion, setShowConfirmacion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const EyeIcon = ({ closed }: { closed: boolean }) => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="3" />
      {closed ? <path d="M4 20L20 4" /> : null}
    </svg>
  )

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
    if (actual === nueva) {
      setError('La nueva contrasena no puede ser igual a la contrasena actual.')
      return
    }
    if (nueva.length <= 3) {
      setError('La nueva contrasena debe tener mas de 3 caracteres.')
      return
    }
    mutation.mutate()
  }

  const handleCancel = () => {
    logout()
    navigate('/', { replace: true })
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
            <div className="relative">
              <input
                className="input-base pr-16"
                type={showActual ? 'text' : 'password'}
                value={actual}
                onChange={(event) => setActual(event.target.value)}
                disabled={mutation.isPending}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                onClick={() => setShowActual((prev) => !prev)}
                disabled={mutation.isPending}
                aria-label={showActual ? 'Ocultar contrasena actual' : 'Mostrar contrasena actual'}
              >
                <EyeIcon closed={showActual} />
              </button>
            </div>
          </Field>

          <Field label="Nueva contrasena">
            <div className="relative">
              <input
                className="input-base pr-16"
                type={showNueva ? 'text' : 'password'}
                value={nueva}
                onChange={(event) => setNueva(event.target.value)}
                disabled={mutation.isPending}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                onClick={() => setShowNueva((prev) => !prev)}
                disabled={mutation.isPending}
                aria-label={showNueva ? 'Ocultar nueva contrasena' : 'Mostrar nueva contrasena'}
              >
                <EyeIcon closed={showNueva} />
              </button>
            </div>
          </Field>

          <Field label="Confirmar nueva contrasena">
            <div className="relative">
              <input
                className="input-base pr-16"
                type={showConfirmacion ? 'text' : 'password'}
                value={confirmacion}
                onChange={(event) => setConfirmacion(event.target.value)}
                disabled={mutation.isPending}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                onClick={() => setShowConfirmacion((prev) => !prev)}
                disabled={mutation.isPending}
                aria-label={showConfirmacion ? 'Ocultar confirmacion de contrasena' : 'Mostrar confirmacion de contrasena'}
              >
                <EyeIcon closed={showConfirmacion} />
              </button>
            </div>
          </Field>

          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={mutation.isPending} className="w-full">
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Actualizando...' : 'Actualizar contrasena'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordPage
