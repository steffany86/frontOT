import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import PageLayout from '../components/common/PageLayout'
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
          <p className="font-semibold text-red-600">Solo el usuario sistemas puede entrar a este apartado.</p>
        </FormCard>
      </div>
    )
  }

  return (
    <PageLayout title="Poner en produccion" subtitle="Controla el bloqueo temporal de login y sesiones durante cambios.">

      <FormCard title="Estado del sistema">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[10px] font-medium uppercase text-slate-500">Estado</p>
            <p className={`mt-0.5 text-sm font-bold ${status?.active ? 'text-red-600' : 'text-emerald-600'}`}>
              {statusQuery.isLoading ? 'Consultando...' : status?.active ? 'Cambios en proceso' : 'Operativo'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[10px] font-medium uppercase text-slate-500">Ultimo cambio</p>
            <p className="mt-0.5 font-semibold text-slate-900">{formatDate(status?.changedAt)}</p>
            <p className="text-slate-500">{status?.changedBy ?? '-'}</p>
          </div>
        </div>
      </FormCard>

      <FormCard title="Control de acceso">
        <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-500">
              Password sistemas
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-500">
              Mensaje para usuarios
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="h-8 w-full rounded-md bg-slate-100 px-2.5 text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
              />
            </label>
            {notice ? <p className="font-semibold text-emerald-700">{notice}</p> : null}
            {error ? <p className="font-semibold text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-col gap-2 lg:w-56">
            <Button
              type="button"
              disabled
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
    </PageLayout>
  )
}

export default SistemasProduccionPage
