import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import FormCard from '../components/common/FormCard'
import PageLayout from '../components/common/PageLayout'
import { fetchConfiguraciones, updateConfiguracion, type ConfiguracionItem } from '../api/configuracionApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'

const normalizeRole = (value?: string): string =>
  (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const ConfiguracionesPage = () => {
  const { usuario, roleName } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const esSistemas = normalizeRole(roleName || usuario?.rol) === 'sistemas'

  const { data = [], isLoading } = useQuery({
    queryKey: ['configuraciones'],
    queryFn: fetchConfiguraciones,
    enabled: esSistemas,
  })

  const cambiarMutation = useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: string }) => updateConfiguracion(clave, valor),
    onSuccess: async (_, vars) => {
      setError('')
      await queryClient.invalidateQueries({ queryKey: ['configuraciones'] })
      await queryClient.invalidateQueries({ queryKey: ['configuracion-valor', vars.clave] })
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  })

  if (!esSistemas) {
    return (
      <FormCard title="Configuraciones">
        <p className="text-sm font-semibold text-red-600">Solo el usuario sistemas puede administrar esta sección.</p>
      </FormCard>
    )
  }

  const renderOpcion = (item: ConfiguracionItem) => {
    const activa = item.valor === '1'
    return (
      <div key={item.clave} className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
          <p className="text-xs text-slate-600">{item.descripcion}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activa}
          aria-label={item.titulo}
          disabled={cambiarMutation.isPending}
          onClick={() => cambiarMutation.mutate({ clave: item.clave, valor: activa ? '0' : '1' })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
            activa ? 'bg-blue-700' : 'bg-slate-300'
          }`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${activa ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    )
  }

  return (
    <PageLayout title="Configuraciones" subtitle="Opciones generales del sistema. Solo visible para el usuario sistemas.">

      <FormCard title="Supervisión V2">
        {error ? <p className="mb-2 text-xs font-semibold text-rose-600">{error}</p> : null}
        {isLoading ? <p className="text-slate-500">Cargando...</p> : null}
        {!isLoading && data.length === 0 ? <p className="text-slate-500">No hay opciones configurables.</p> : null}
        {data.map(renderOpcion)}
      </FormCard>
    </PageLayout>
  )
}

export default ConfiguracionesPage
