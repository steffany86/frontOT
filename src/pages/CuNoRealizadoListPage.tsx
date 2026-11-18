import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import PageLayout from '../components/common/PageLayout'
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
    { key: 'tecnico', header: 'Técnico' },
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
    <PageLayout
      title="Cargo Usuario No Realizado"
      subtitle="Listado de casos pendientes o reprogramados."
      actions={
        <Button type="button" className="h-8" onClick={() => navigate('/cu-no-realizado/nuevo')}>
          Registrar CU
        </Button>
      }
    >
      <FormCard title="Listado CU" description="Se muestran los últimos registros.">
        {errorMessage ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600">{errorMessage}</div>
        ) : (
          <Table columns={columns} data={query.data ?? []} emptyLabel="NO HAY DATOS PARA LA FECHA" />
        )}
      </FormCard>
    </PageLayout>
  )
}

export default CuNoRealizadoListPage

