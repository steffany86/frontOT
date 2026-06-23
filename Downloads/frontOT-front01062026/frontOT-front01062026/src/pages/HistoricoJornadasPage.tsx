import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDay, faFilter, faRotateRight, faUserClock } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Table, { type Column } from '../components/common/Table'
import { fetchHistoricoJornadas } from '../api/supervisionApi'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'
import type { SupervisionJornadaHistorico } from '../types/supervision'

const formatLocalDateInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const normalizeRole = (role?: string): string => (role ?? '').trim().toLowerCase().replace(/[\s_]+/g, '')

const estadoLabel = (row: SupervisionJornadaHistorico): string => {
  if (row.estadoJornada === 'NO_INICIO' || row.sinInicio) return 'No inicio'
  if (row.estadoJornada === 'SIN_CIERRE' || row.sinCierre) return 'Sin cierre'
  return 'Cerrada'
}

const estadoClass = (row: SupervisionJornadaHistorico): string => {
  if (row.estadoJornada === 'NO_INICIO' || row.sinInicio) return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
  if (row.estadoJornada === 'SIN_CIERRE' || row.sinCierre) return 'bg-red-100 text-red-700 ring-1 ring-red-200'
  return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
}

const HistoricoJornadasPage = () => {
  const { roleName } = useAuth()
  const isSupervisor = normalizeRole(roleName) === 'supervisor'
  const [fecha, setFecha] = useState(() => formatLocalDateInput(new Date()))
  const [sucursal, setSucursal] = useState('')
  const [idTecnico, setIdTecnico] = useState('')

  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-historico-jornadas'],
    queryFn: fetchSucursales,
    enabled: !isSupervisor,
    staleTime: 300_000,
  })

  const jornadasQuery = useQuery({
    queryKey: ['historico-jornadas', isSupervisor ? 'supervisor' : 'backoffice', fecha, sucursal],
    queryFn: () =>
      fetchHistoricoJornadas({
        scope: isSupervisor ? 'supervisor' : 'backoffice',
        fecha,
        sucursal: isSupervisor ? undefined : sucursal,
      }),
    enabled: Boolean(fecha),
  })

  const rows = jornadasQuery.data ?? []
  const tecnicoOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      const id = row.idTecnico.trim()
      if (!id || map.has(id)) continue
      map.set(id, row.tecnicoNombre || `Tecnico ${id}`)
    }
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }, [rows])

  const filteredRows = useMemo(() => {
    const tecnico = idTecnico.trim()
    if (!tecnico) return rows
    return rows.filter((row) => row.idTecnico === tecnico)
  }, [rows, idTecnico])

  const resumen = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        if (row.estadoJornada === 'NO_INICIO' || row.sinInicio) acc.noInicio += 1
        else if (row.estadoJornada === 'SIN_CIERRE' || row.sinCierre) acc.sinCierre += 1
        else acc.cerradas += 1
        return acc
      },
      { total: filteredRows.length, cerradas: 0, sinCierre: 0, noInicio: 0 }
    )
  }, [filteredRows])

  const columns = useMemo<Column<SupervisionJornadaHistorico>[]>(
    () => [
      { key: 'sucursal', header: 'Sucursal', render: (row) => row.sucursal || '-' },
      { key: 'grupo', header: 'Grupo', render: (row) => row.grupo || '-' },
      {
        key: 'tecnicoNombre',
        header: 'Tecnico',
        render: (row) => (
          <div>
            <p className="font-semibold text-slate-900">{row.tecnicoNombre}</p>
            <p className="text-xs text-slate-500">ID {row.idTecnico}</p>
          </div>
        ),
      },
      { key: 'supervisorNombre', header: 'Supervisor', render: (row) => row.supervisorNombre || '-' },
      { key: 'fechaInicio', header: 'Inicio', render: (row) => formatDateTime(row.fechaInicio) },
      {
        key: 'fechaCierre',
        header: 'Cierre',
        render: (row) =>
          row.fechaCierre ? (
            formatDateTime(row.fechaCierre)
          ) : (
            <span className="font-semibold text-red-600">{row.sinInicio ? 'No inicio' : 'Sin cierre'}</span>
          ),
      },
      {
        key: 'estadoJornada',
        header: 'Estado',
        render: (row) => (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${estadoClass(row)}`}>{estadoLabel(row)}</span>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            <FontAwesomeIcon icon={faUserClock} className="mr-2" />
            Historicos jornadas
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Inicios y cierres por tecnico</h1>
        </div>
        <Button type="button" variant="secondary" onClick={() => jornadasQuery.refetch()} disabled={jornadasQuery.isFetching}>
          <FontAwesomeIcon icon={faRotateRight} className={jornadasQuery.isFetching ? 'mr-2 animate-spin' : 'mr-2'} />
          Actualizar
        </Button>
      </div>

      <FormCard title="Filtros" compact>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Fecha">
            <input className="input-base" type="date" value={fecha} onChange={(event) => setFecha(event.target.value || formatLocalDateInput(new Date()))} />
          </Field>
          {!isSupervisor ? (
            <Field label="Sucursal">
              <select
                className="input-base"
                value={sucursal}
                onChange={(event) => {
                  setSucursal(event.target.value)
                  setIdTecnico('')
                }}
                disabled={sucursalesQuery.isLoading}
              >
                <option value="">Todas las sucursales</option>
                {(sucursalesQuery.data?.data ?? []).map((item) => (
                  <option key={item.idSucursal} value={item.sucursal}>
                    {item.sucursal}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Tecnico">
            <select className="input-base" value={idTecnico} onChange={(event) => setIdTecnico(event.target.value)}>
              <option value="">Todos los tecnicos</option>
              {tecnicoOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre} ({item.id})
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="secondary" className="w-full" onClick={() => setIdTecnico('')}>
              <FontAwesomeIcon icon={faFilter} className="mr-2" />
              Limpiar tecnico
            </Button>
          </div>
        </div>
      </FormCard>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-700">Cerradas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{resumen.cerradas}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase text-red-700">Sin cierre</p>
          <p className="mt-1 text-2xl font-bold text-red-800">{resumen.sinCierre}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase text-rose-700">No iniciaron</p>
          <p className="mt-1 text-2xl font-bold text-rose-800">{resumen.noInicio}</p>
        </div>
      </div>

      {jornadasQuery.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getApiErrorMessage(jornadasQuery.error, 'No se pudo cargar el historico de jornadas.')}
        </div>
      ) : null}

      <FormCard
        title="Detalle de jornadas"
        description={`Fecha seleccionada: ${fecha}`}
        actions={
          <span className="text-xs font-semibold text-slate-500">
            <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
            {jornadasQuery.isFetching ? 'Cargando...' : `${filteredRows.length} registro(s)`}
          </span>
        }
      >
        <Table
          columns={columns}
          data={filteredRows}
          emptyLabel={jornadasQuery.isLoading ? 'Cargando jornadas...' : 'Sin registros para los filtros seleccionados'}
          rowClassName={(row) => (row.estadoJornada === 'NO_INICIO' || row.sinInicio || row.sinCierre ? 'bg-red-50/70' : '')}
          desktopMinWidthClass="min-w-[980px]"
          density="compact"
          stickyHeader
        />
      </FormCard>
    </div>
  )
}

export default HistoricoJornadasPage
