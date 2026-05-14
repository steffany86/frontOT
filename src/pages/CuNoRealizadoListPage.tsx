import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Table from '../components/common/Table'
import type { Column } from '../components/common/Table'
import { fetchCuList } from '../api/cuApi'
import type { CuNoRealizadoSummary } from '../types/cu'
import { formatDate } from '../utils/dates'

const CuNoRealizadoListPage = () => {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['cu-no-realizado'],
    queryFn: fetchCuList,
  })

  const columns: Column<CuNoRealizadoSummary>[] = [
    { key: 'id', header: 'ID' },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (row) => formatDate(row.fecha),
    },
    { key: 'tecnico', header: 'TÃ©cnico' },
    { key: 'motivo', header: 'Motivo' },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => <span className="badge">{row.estado}</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => (
        <Button variant="secondary" type="button" onClick={() => navigate(`/cu-no-realizado/${row.id}`)}>
          Ver detalle
        </Button>
      ),
    },
  ]

  const errorMessage =
    query.isError && query.error instanceof Error && query.error.message
      ? query.error.message
      : query.isError
        ? 'No se pudo cargar el listado.'
        : null

  return (
    <div className="bento-page">
      <div className="bento-page-head flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Cargo Usuario No Realizado</h2>
          <p className="text-sm text-slate-500">Listado de casos pendientes o reprogramados.</p>
        </div>
        <Button type="button" onClick={() => navigate('/cu-no-realizado/nuevo')}>
          Registrar CU
        </Button>
      </div>

      <FormCard title="Listado CU" description="Se muestran los Ãºltimos registros.">
        {errorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div>
        ) : (
          <Table columns={columns} data={query.data ?? []} emptyLabel="No hay registros disponibles." />
        )}
      </FormCard>
    </div>
  )
}

export default CuNoRealizadoListPage
