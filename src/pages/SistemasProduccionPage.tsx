import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import { activarMaintenance, desactivarMaintenance, fetchMaintenanceStatus } from '../api/maintenanceApi'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'

const SISTEMAS_USUARIO = 'sistemas'

const normalizeRole = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
}

const SistemasProduccionPage = () => {
  const queryClient = useQueryClient()
  const { usuario } = useAuth()
  const [password, setPassword] = useState('123')
  const [message, setMessage] = useState('SISTEMA ABAJO. CAMBIOS EN PROCESO.')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSistemas = useMemo(
    () =>
      normalizeRole(usuario?.rol) === SISTEMAS_USUARIO ||
      normalizeRole(usuario?.nombre) === SISTEMAS_USUARIO,
    [usuario?.nombre, usuario?.rol]
  )

  const statusQuery = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: fetchMaintenanceStatus,
    refetchInterval: 15000,
  })

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => {
      const payload = { usuario: SISTEMAS_USUARIO, password, message }
      return active ? activarMaintenance(payload) : desactivarMaintenance(payload)
    },
    onSuccess: (status) => {
      queryClient.setQueryData(['maintenance-status'], status)
      setError(null)
      setNotice(status.active ? 'Modo cambios activado. Las sesiones normales se cerraran al validar token.' : 'Modo cambios desactivado. El login vuelve a operar normalmente.')
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err))
    },
  })

  const status = statusQuery.data

  if (!isSistemas) {
    return (
      <div className="space-y-4">
        <FormCard title="Poner en produccion" description="Acceso restringido.">
          <p className="text-sm font-semibold text-red-600">Solo el usuario sistemas puede entrar a este apartado.</p>
        </FormCard>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Poner en produccion</h2>
        <p className="text-sm text-slate-600">Controla el bloqueo temporal de login y sesiones durante cambios.</p>
      </div>

      <FormCard title="Estado del sistema">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
            <p className={`mt-2 text-2xl font-bold ${status?.active ? 'text-red-600' : 'text-emerald-600'}`}>
              {statusQuery.isLoading ? 'Consultando...' : status?.active ? 'Cambios en proceso' : 'Operativo'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ultimo cambio</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(status?.changedAt)}</p>
            <p className="text-xs text-slate-500">{status?.changedBy ?? '-'}</p>
          </div>
        </div>
      </FormCard>

      <FormCard title="Control de acceso">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Password sistemas
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Mensaje para usuarios
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {notice ? <p className="text-sm font-semibold text-emerald-700">{notice}</p> : null}
            {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-col gap-3 lg:w-64">
            <Button
              type="button"
              disabled={toggleMutation.isPending || status?.active}
              onClick={() => toggleMutation.mutate(true)}
              className="w-full bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Activar cambios
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={toggleMutation.isPending || !status?.active}
              onClick={() => toggleMutation.mutate(false)}
              className="w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              Desactivar bloqueo
            </Button>
          </div>
        </div>
      </FormCard>
    </div>
  )
}

export default SistemasProduccionPage
