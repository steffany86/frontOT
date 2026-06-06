import { useQuery } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import { fetchInicioJornadaEstado } from '../../api/inicioJornadaApi'
import { useAuth } from '../../context/AuthContext'
import { fetchSucursales } from '../../services/authApi'
import { getApiErrorMessage } from '../../services/httpClient'
import Modal from '../common/Modal'
import InicioJornadaChecklistForm from '../tecnico/InicioJornadaChecklistForm'

const TecnicoInicioJornadaGuard = () => {
  const { isAuthenticated, roleId, roleName, usuario } = useAuth()
  const roleNormalized = roleName.trim().toLowerCase()
  const isTecnico = roleId === 8 || roleNormalized === 'tecnico'
  const requiresInicioJornada = isTecnico

  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-tecnico-inicio-jornada-guard'],
    queryFn: fetchSucursales,
    enabled: isAuthenticated && requiresInicioJornada,
    staleTime: 5 * 60 * 1000,
  })

  const loginSucursal = (() => {
    const idSucursal = usuario?.idSucursal
    const sucursales = sucursalesQuery.data?.data ?? []
    if (!idSucursal || sucursales.length === 0) return undefined
    const found = sucursales.find((item) => Number(item.idSucursal) === Number(idSucursal))
    return found?.sucursal?.trim() || undefined
  })()

  const estadoQuery = useQuery({
    queryKey: ['tecnico-inicio-jornada', 'estado', loginSucursal || 'auto'],
    queryFn: () => fetchInicioJornadaEstado(loginSucursal),
    enabled: isAuthenticated && requiresInicioJornada,
    staleTime: 30 * 1000,
  })

  if (!isAuthenticated || !requiresInicioJornada) {
    return <Outlet />
  }

  if (estadoQuery.isLoading) {
    return <div className="p-6 text-sm text-slate-600">Validando inicio de jornada...</div>
  }

  if (estadoQuery.isError) {
    return (
      <div className="p-6 text-sm text-rose-700">
        No se pudo validar inicio de jornada: {getApiErrorMessage(estadoQuery.error, 'Error de validacion.')}
      </div>
    )
  }

  const pendiente = estadoQuery.data?.pendiente ?? false

  return (
    <>
      <Outlet />
      <Modal open={pendiente} onClose={() => {}} title="Inicio de Jornada Obligatorio" maxWidthClass="max-w-3xl">
        <InicioJornadaChecklistForm
          sucursal={loginSucursal}
          nombreTecnico={usuario?.nombre}
          nombreSupervisor={estadoQuery.data?.encargado}
          onRegistered={() => {
            estadoQuery.refetch()
          }}
        />
      </Modal>
    </>
  )
}

export default TecnicoInicioJornadaGuard
