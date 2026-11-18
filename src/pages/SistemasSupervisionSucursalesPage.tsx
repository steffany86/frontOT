import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import PageLayout from '../components/common/PageLayout'
import { fetchSupervisores } from '../api/supervisionApi'
import {
  crearSupervisionSucursal,
  eliminarSupervisionSucursal,
  fetchSupervisionSucursales,
} from '../api/supervisionSucursalApi'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'

const normalizeRole = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')

const SistemasSupervisionSucursalesPage = () => {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const [sucursalOrigenFiltro, setSucursalOrigenFiltro] = useState('')
  const [idUsuario, setIdUsuario] = useState('')
  const [sucursalPermiso, setSucursalPermiso] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isSistemas = normalizeRole(usuario?.rol) === 'sistemas' || normalizeRole(usuario?.nombre) === 'sistemas'

  const sucursalesQuery = useQuery({
    queryKey: ['supervision-sucursales', 'sucursales'],
    queryFn: fetchSucursales,
    enabled: isSistemas,
  })

  const supervisoresQuery = useQuery({
    queryKey: ['supervision-sucursales', 'supervisores', sucursalOrigenFiltro],
    queryFn: () => fetchSupervisores(sucursalOrigenFiltro),
    enabled: isSistemas && Boolean(sucursalOrigenFiltro),
  })

  const asignacionesQuery = useQuery({
    queryKey: ['supervision-sucursales', 'listado'],
    queryFn: fetchSupervisionSucursales,
    enabled: isSistemas,
  })

  const crearMutation = useMutation({
    mutationFn: crearSupervisionSucursal,
    onSuccess: () => {
      setError(null)
      setSucursalOrigenFiltro('')
      setIdUsuario('')
      setSucursalPermiso('')
      queryClient.invalidateQueries({ queryKey: ['supervision-sucursales', 'listado'] })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo asignar la sucursal.'))
    },
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarSupervisionSucursal,
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['supervision-sucursales', 'listado'] })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo eliminar la asignacion.'))
    },
  })

  const handleAgregar = () => {
    setError(null)
    const sucursalUsuarioSeleccionada = (sucursalesQuery.data?.data ?? []).find((item) => item.sucursal === sucursalOrigenFiltro)
    if (!idUsuario || !sucursalUsuarioSeleccionada || !sucursalPermiso) {
      setError('Selecciona la sucursal, el usuario y la sucursal con permiso.')
      return
    }
    crearMutation.mutate({
      idUsuario: Number(idUsuario),
      idSucursalUsuario: Number(sucursalUsuarioSeleccionada.idSucursal),
      idSucursalPermiso: Number(sucursalPermiso),
    })
  }

  const handleSucursalOrigenChange = (value: string) => {
    setSucursalOrigenFiltro(value)
    setIdUsuario('')
  }

  if (!isSistemas) {
    return (
      <FormCard title="Sucursales de supervision" description="Acceso restringido.">
        <p className="text-sm font-semibold text-red-600">Solo el usuario sistemas puede administrar esta seccion.</p>
      </FormCard>
    )
  }

  const asignaciones = asignacionesQuery.data ?? []

  return (
    <PageLayout title="Sucursales de supervision" subtitle="Asigna sucursales adicionales a un supervisor para que pueda ver y agendar supervisiones de personal de esas sucursales.">
      <FormCard title="Asignar sucursal a un usuario">
        <div className="grid gap-2 md:grid-cols-4 md:items-end">
          <Field label="Sucursal">
            <select
              className="input-base bg-white"
              value={sucursalOrigenFiltro}
              onChange={(event) => handleSucursalOrigenChange(event.target.value)}
            >
              <option value="">{sucursalesQuery.isLoading ? 'Cargando sucursales...' : 'Selecciona sucursal'}</option>
              {(sucursalesQuery.data?.data ?? []).map((sucursal) => (
                <option key={sucursal.idSucursal} value={sucursal.sucursal}>
                  {sucursal.sucursal}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Usuario (supervisor)">
            <select
              className="input-base bg-white"
              value={idUsuario}
              onChange={(event) => setIdUsuario(event.target.value)}
              disabled={!sucursalOrigenFiltro || supervisoresQuery.isLoading}
            >
              <option value="">
                {!sucursalOrigenFiltro
                  ? 'Selecciona sucursal primero'
                  : supervisoresQuery.isLoading
                  ? 'Cargando usuarios...'
                  : 'Selecciona usuario'}
              </option>
              {(supervisoresQuery.data ?? []).map((sup) => (
                <option key={sup.idSupervisor} value={sup.idSupervisor}>
                  {sup.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sucursal con permiso">
            <select className="input-base bg-white" value={sucursalPermiso} onChange={(event) => setSucursalPermiso(event.target.value)}>
              <option value="">{sucursalesQuery.isLoading ? 'Cargando sucursales...' : 'Selecciona sucursal'}</option>
              {(sucursalesQuery.data?.data ?? []).map((sucursal) => (
                <option key={sucursal.idSucursal} value={sucursal.idSucursal}>
                  {sucursal.sucursal}
                </option>
              ))}
            </select>
          </Field>
          <Button type="button" onClick={handleAgregar} disabled={crearMutation.isPending}>
            {crearMutation.isPending ? 'Asignando...' : 'Asignar'}
          </Button>
        </div>
        {error ? <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
      </FormCard>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-3 py-1.5 sm:px-4">
          <h3 className="page-panel-title">Asignaciones vigentes ({asignaciones.length})</h3>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-600">
              <tr>
                <th className="px-2 py-1.5">Usuario</th>
                <th className="px-2 py-1.5">Sucursal usuario</th>
                <th className="px-2 py-1.5">Sucursal con permiso</th>
                <th className="px-2 py-1.5">Fecha registro</th>
                <th className="px-2 py-1.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignacionesQuery.isLoading ? (
                <tr><td className="px-3 py-4 text-center text-slate-500" colSpan={5}>Cargando asignaciones...</td></tr>
              ) : asignacionesQuery.isError ? (
                <tr><td className="px-3 py-4 text-center text-red-600" colSpan={5}>No se pudieron cargar las asignaciones.</td></tr>
              ) : asignaciones.length ? asignaciones.map((item) => (
                <tr key={item.id} className="odd:bg-white even:bg-slate-50">
                  <td className="px-2 py-1.5 font-semibold text-slate-800">{item.nombreUsuario || `Usuario ${item.idUsuario}`}</td>
                  <td className="px-2 py-1.5 text-slate-500">{item.nombreSucursalUsuario || `Sucursal ${item.idSucursalUsuario}`}</td>
                  <td className="px-2 py-1.5 text-slate-700">{item.nombreSucursalPermiso || `Sucursal ${item.idSucursalPermiso}`}</td>
                  <td className="px-2 py-1.5 text-slate-500">{item.fechaRegistro || '-'}</td>
                  <td className="px-2 py-1.5 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 px-3"
                      disabled={eliminarMutation.isPending}
                      onClick={() => eliminarMutation.mutate(item.id)}
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              )) : (
                <tr><td className="px-3 py-4 text-center text-slate-500" colSpan={5}>No hay sucursales adicionales asignadas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageLayout>
  )
}

export default SistemasSupervisionSucursalesPage
