import Table from '../common/Table'
import type { Column } from '../common/Table'
import type { OtMaterial } from '../../types/ot'

const columns: Column<OtMaterial>[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'descripcion', header: 'Descripción' },
  { key: 'cantidad', header: 'Cantidad' },
  { key: 'unidad', header: 'Unidad' },
]

interface MaterialTableProps {
  data: OtMaterial[]
  emptyLabel?: string
}

const MaterialTable = ({ data, emptyLabel }: MaterialTableProps) => {
  return <Table columns={columns} data={data} emptyLabel={emptyLabel} />
}

export default MaterialTable
