import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import FormCard from '../components/common/FormCard'
import PageLayout from '../components/common/PageLayout'
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
    <PageLayout title="Detalle CU No Realizado" subtitle="Información completa del caso.">

      <FormCard title={`CU #${cuId}`} description="Detalle del registro seleccionado.">
        {query.isLoading ? (
          <p className="text-slate-500">Cargando información...</p>
        ) : detail ? (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-medium uppercase text-slate-500">Cliente</p>
              <p className="font-semibold text-slate-700">{detail.cliente}</p>
              <p className="text-slate-500">{detail.direccion}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-medium uppercase text-slate-500">Técnico</p>
              <p className="font-semibold text-slate-700">{detail.tecnico}</p>
              <p className="text-slate-500">Fecha: {formatDate(detail.fecha)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-medium uppercase text-slate-500">Motivo</p>
              <p className="text-slate-700">{detail.motivo}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-medium uppercase text-slate-500">Estado</p>
              <p className="text-slate-700">{detail.estado}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 md:col-span-2">
              <p className="text-[10px] font-medium uppercase text-slate-500">Descripción</p>
              <p className="text-slate-700">{detail.descripcion}</p>
            </div>
          </div>
        ) : (
          <p className="text-rose-600">No se encontró el registro.</p>
        )}
      </FormCard>
    </PageLayout>
  )
}

export default CuNoRealizadoDetailPage
