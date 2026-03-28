import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FormCard from '../components/common/FormCard'
import Tabs from '../components/common/Tabs'
import MaterialTable from '../components/ot/MaterialTable'
import { fetchOtDetail, fetchOtMateriales } from '../api/otApi'
import type { OtMaterialTipo } from '../api/otApi'
import { formatDate } from '../utils/dates'

const tabItems = [
  { id: 'cabecera', label: 'Cabecera OT' },
  { id: 'instalados', label: 'Instalados' },
  { id: 'retirados', label: 'Retirados' },
  { id: 'excedentes', label: 'Excedentes' },
  { id: 'cargo-usuario', label: 'Cargo Usuario' },
]

const OtDetailPage = () => {
  const { id } = useParams()
  const otId = Number(id)
  const [activeTab, setActiveTab] = useState('cabecera')

  const detailQuery = useQuery({
    queryKey: ['ot-detail', otId],
    queryFn: () => fetchOtDetail(otId),
    enabled: Number.isFinite(otId),
  })

  const materialTipo = useMemo(() => {
    if (activeTab === 'cabecera') return null
    return activeTab as OtMaterialTipo
  }, [activeTab])

  const materialsQuery = useQuery({
    queryKey: ['ot-materiales', otId, materialTipo],
    queryFn: () => fetchOtMateriales(otId, materialTipo as OtMaterialTipo),
    enabled: Number.isFinite(otId) && Boolean(materialTipo),
  })

  const header = detailQuery.data?.header

  const materialsErrorMessage =
    materialsQuery.isError && materialsQuery.error instanceof Error && materialsQuery.error.message
      ? materialsQuery.error.message
      : materialsQuery.isError
        ? 'No se pudieron cargar los materiales.'
        : null

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Detalle OT</h2>
        <p className="text-sm text-slate-500">InformaciÃ³n completa de la orden de trabajo.</p>
      </div>

      <FormCard title={`OT ${header?.codigo ?? ''}`} description="Datos principales de la OT.">
        {detailQuery.isLoading ? (
          <p className="text-sm text-slate-500">Cargando cabecera...</p>
        ) : header ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">Cliente</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{header.cliente}</p>
              <p className="mt-2 text-xs text-slate-500">{header.direccion}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">TÃ©cnico</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{header.tecnico}</p>
              <p className="mt-2 text-xs text-slate-500">Fecha: {formatDate(header.fecha)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">Estado</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{header.estado}</p>
              <p className="mt-2 text-xs text-slate-500">OT #{header.id}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">Observaciones</p>
              <p className="mt-1 text-sm text-slate-600">{header.observaciones ?? 'Sin observaciones.'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-rose-600">No se encontrÃ³ la OT.</p>
        )}
      </FormCard>

      <FormCard title="Materiales" description="Detalle por categorÃ­a.">
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />
        <div className="mt-6">
          {activeTab === 'cabecera' ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Selecciona una pestaÃ±a para ver materiales asociados.
            </div>
          ) : materialsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Cargando materiales...</p>
          ) : materialsErrorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {materialsErrorMessage}
            </div>
          ) : (
            <MaterialTable data={materialsQuery.data ?? []} emptyLabel="No hay materiales para esta categorÃ­a." />
          )}
        </div>
      </FormCard>
    </div>
  )
}

export default OtDetailPage
