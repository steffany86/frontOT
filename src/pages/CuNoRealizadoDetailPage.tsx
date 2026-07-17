import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FormCard from '../components/common/FormCard'
import { fetchCuDetail } from '../api/cuApi'
import { formatDate } from '../utils/dates'

const CuNoRealizadoDetailPage = () => {
  const { id } = useParams()
  const cuId = Number(id)

  const query = useQuery({
    queryKey: ['cu-no-realizado', cuId],
    queryFn: () => fetchCuDetail(cuId),
    enabled: Number.isFinite(cuId),
  })

  const detail = query.data

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Detalle CU No Realizado</h2>
        <p className="text-sm text-slate-500">Información completa del caso.</p>
      </div>

      <FormCard title={`CU #${cuId}`} description="Detalle del registro seleccionado.">
        {query.isLoading ? (
          <p className="text-sm text-slate-500">Cargando información...</p>
        ) : detail ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">Cliente</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{detail.cliente}</p>
              <p className="mt-2 text-xs text-slate-500">{detail.direccion}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">Técnico</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{detail.tecnico}</p>
              <p className="mt-2 text-xs text-slate-500">Fecha: {formatDate(detail.fecha)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">Motivo</p>
              <p className="mt-1 text-sm text-slate-700">{detail.motivo}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase text-slate-400">Estado</p>
              <p className="mt-1 text-sm text-slate-700">{detail.estado}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
              <p className="text-xs uppercase text-slate-400">Descripción</p>
              <p className="mt-1 text-sm text-slate-700">{detail.descripcion}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-rose-600">No se encontró el registro.</p>
        )}
      </FormCard>
    </div>
  )
}

export default CuNoRealizadoDetailPage
