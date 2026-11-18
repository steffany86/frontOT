import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import PageLayout, { PagePanel, PageTabs } from '../components/common/PageLayout'
import Table, { type Column } from '../components/common/Table'
import {
  bajaConfigCatalogo,
  createConfigCatalogo,
  fetchConfigCatalogo,
  type ConfigCatalogoItem,
  type ConfigCatalogoKey,
} from '../api/supervisionV2Api'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'

const PESTANAS: Array<{ key: ConfigCatalogoKey; label: string; singular: string }> = [
  { key: 'tipo-supervision', label: 'Tipo supervisión', singular: 'tipo de supervisión' },
  { key: 'tipo-trabajo', label: 'Tipo trabajo', singular: 'tipo de trabajo' },
  { key: 'tipo-penalizacion', label: 'Tipo penalización', singular: 'tipo de penalización' },
  { key: 'supervision-por', label: 'Supervisión por', singular: 'valor de supervisión por' },
  { key: 'tecnologia', label: 'Tecnología', singular: 'tipo de tecnología' },
  { key: 'tipo-revision', label: 'Tipo revisión', singular: 'tipo de revisión' },
]

const ROLES_PERMITIDOS = ['backoffice', 'backofficev', 'sistemas']

export const normalizeRole = (value?: string): string =>
  (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')

interface CatalogoPanelProps {
  catalogo: ConfigCatalogoKey
  singular: string
}

export const CatalogoPanel = ({ catalogo, singular }: CatalogoPanelProps) => {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState('')

  const queryKey = ['supervision-v2-config', catalogo]
  const { data = [], isLoading } = useQuery({ queryKey, queryFn: () => fetchConfigCatalogo(catalogo) })

  const crearMutation = useMutation({
    mutationFn: (valor: string) => createConfigCatalogo(catalogo, valor),
    onSuccess: async () => {
      setNombre('')
      setError('')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  })

  const bajaMutation = useMutation({
    mutationFn: (id: string) => bajaConfigCatalogo(catalogo, id),
    onSuccess: async () => {
      setError('')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  })

  const filas = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    return term ? data.filter((item) => item.nombre.toLowerCase().includes(term)) : data
  }, [data, filtro])

  const guardar = () => {
    const valor = nombre.trim()
    if (!valor) {
      setError(`Escribe el nombre del ${singular}.`)
      return
    }
    if (data.some((item) => item.nombre.toLowerCase() === valor.toLowerCase())) {
      setError(`Ya existe un ${singular} con ese nombre.`)
      return
    }
    crearMutation.mutate(valor)
  }

  const confirmarBaja = (item: ConfigCatalogoItem) => {
    if (window.confirm(`¿Dar de baja "${item.nombre}"?`)) bajaMutation.mutate(item.id)
  }

  const columns: Column<ConfigCatalogoItem>[] = [
    { key: 'id', header: 'Id', className: 'w-14' },
    { key: 'nombre', header: 'Nombre' },
    {
      key: 'acciones',
      header: 'Acción',
      className: 'w-24',
      render: (row) => (
        <button
          type="button"
          disabled={bajaMutation.isPending}
          onClick={() => confirmarBaja(row)}
          className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
        >
          Dar de baja
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label={`Nuevo ${singular}`}>
          <input
            className="input-base"
            value={nombre}
            maxLength={100}
            placeholder={`Nombre del ${singular}`}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardar()
            }}
          />
        </Field>
        <Button type="button" variant="primary" disabled={crearMutation.isPending} onClick={guardar}>
          {crearMutation.isPending ? 'Registrando...' : 'Registrar'}
        </Button>
      </div>

      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

      <Field label="Buscar">
        <input className="input-base" value={filtro} placeholder="Filtrar por nombre" onChange={(e) => setFiltro(e.target.value)} />
      </Field>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <Table columns={columns} data={filas} emptyLabel="NO HAY REGISTROS" density="compact" pageSize={8} />
      )}
    </div>
  )
}

const SupervisionV2ConfiguracionPage = () => {
  const { usuario, roleName } = useAuth()
  const [activa, setActiva] = useState<ConfigCatalogoKey>('tipo-supervision')
  const pestana = PESTANAS.find((p) => p.key === activa) ?? PESTANAS[0]
  const permitido = ROLES_PERMITIDOS.includes(normalizeRole(roleName || usuario?.rol))

  if (!permitido) {
    return (
      <FormCard title="Configuración Supervisión">
        <p className="font-semibold text-red-600">Solo BackOffice y Sistemas pueden administrar esta sección.</p>
      </FormCard>
    )
  }

  return (
    <PageLayout
      title="Configuración Supervisión"
      actions={
        <Link to="/supervisor/supervision_v2" className="btn-secondary h-8">
          Volver a Supervisión
        </Link>
      }
      tabs={<PageTabs items={PESTANAS.map((p) => ({ id: p.key, label: p.label }))} activeId={activa} onChange={(id) => setActiva(id as ConfigCatalogoKey)} />}
    >
      <PagePanel>
        <CatalogoPanel key={pestana.key} catalogo={pestana.key} singular={pestana.singular} />
      </PagePanel>
    </PageLayout>
  )
}

export default SupervisionV2ConfiguracionPage
