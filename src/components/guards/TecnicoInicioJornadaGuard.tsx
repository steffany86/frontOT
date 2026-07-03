import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { Outlet, useNavigate } from 'react-router-dom'
import { fetchInicioJornadaEstado } from '../../api/inicioJornadaApi'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../services/httpClient'
import Button from '../common/Button'
import Modal from '../common/Modal'
import CierreJornadaForm from '../tecnico/CierreJornadaForm'
import InicioJornadaChecklistForm from '../tecnico/InicioJornadaChecklistForm'

const formatPendingClosureDate = (value?: string): string => {
  if (!value?.trim()) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const TecnicoInicioJornadaGuard = () => {
  const navigate = useNavigate()
  const { isAuthenticated, roleId, roleName, usuario, logout } = useAuth()
  const roleNormalized = roleName.trim().toLowerCase()
  const isTecnico = roleId === 8 || roleNormalized === 'tecnico'
  const requiresInicioJornada = isTecnico

  const estadoQuery = useQuery({
    queryKey: ['tecnico-inicio-jornada', 'estado', usuario?.idSucursal || 'sesion'],
    queryFn: () => fetchInicioJornadaEstado(),
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

  const requiereCierrePendiente = Boolean(estadoQuery.data?.requiereCierreAyer && estadoQuery.data?.idInicioPendienteCierre)
  const pendiente = !requiereCierrePendiente && (estadoQuery.data?.pendiente ?? false)
  const fechaCierrePendiente = formatPendingClosureDate(estadoQuery.data?.fechaInicioPendienteCierre)
  const supervisorPendiente = (estadoQuery.data?.supervisorPendienteCierre || '-').toUpperCase()
  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <Outlet />
      <Modal
        open={requiereCierrePendiente}
        onClose={handleLogout}
        title="Cierre de jornada pendiente"
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
            <p className="text-sm font-extrabold">Tiene una jornada anterior sin cierre.</p>
            <p className="mt-2 text-2xl font-black uppercase tracking-wide text-amber-950">{fechaCierrePendiente}</p>
            <p className="mt-2 text-sm font-black uppercase tracking-wide text-amber-950">SUPERVISOR: {supervisorPendiente}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-amber-800">SE RECOMIENDA LLENAR FORMULARIO A TIEMPO</p>
            <p className="mt-1 text-sm font-semibold">Por favor, antes de iniciar, llenar los campos de cierre.</p>
          </div>
        </div>
        <CierreJornadaForm
          idInicio={estadoQuery.data?.idInicioPendienteCierre}
          supervisorPendiente={estadoQuery.data?.supervisorPendienteCierre}
          submitLabel="Registrar cierre pendiente"
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
