import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { Outlet, useNavigate } from 'react-router-dom'
import { fetchInicioJornadaEstado } from '../../api/inicioJornadaApi'
import { useAuth } from '../../context/AuthContext'
import { fetchSucursales } from '../../services/authApi'
import { getApiErrorMessage } from '../../services/httpClient'
import Button from '../common/Button'
import Modal from '../common/Modal'
import CierreJornadaForm from '../tecnico/CierreJornadaForm'
import InicioJornadaChecklistForm from '../tecnico/InicioJornadaChecklistForm'

const TecnicoInicioJornadaGuard = () => {
  const navigate = useNavigate()
  const { isAuthenticated, roleId, roleName, usuario, logout } = useAuth()
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
    staleTime: 0,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
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

  const requiereCierreAyer = Boolean(estadoQuery.data?.requiereCierreAyer && estadoQuery.data?.idInicioPendienteCierre)
  const pendiente = !requiereCierreAyer && (estadoQuery.data?.pendiente ?? false)
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <Outlet />
      <Modal
        open={requiereCierreAyer}
        onClose={handleLogout}
        title="Modal de cierre de jornada de AYER"
        maxWidthClass="max-w-3xl"
        actions={
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        }
      >
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <FontAwesomeIcon icon={faClockRotateLeft} />
          </span>
          <div>
            <p className="text-sm font-extrabold">No marco el cierre ayer.</p>
            <p className="mt-1 text-sm font-semibold">Por favor, antes de iniciar, llenar los campos de cierre.</p>
          </div>
        </div>
        <CierreJornadaForm
          idInicio={estadoQuery.data?.idInicioPendienteCierre}
          submitLabel="Registrar cierre de ayer"
          onClosed={() => {
            estadoQuery.refetch()
          }}
        />
      </Modal>
      <Modal
        open={pendiente}
        onClose={handleLogout}
        title="Inicio de Jornada Obligatorio"
        maxWidthClass="max-w-3xl"
        actions={
          <Button type="button" variant="secondary" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        }
      >
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
