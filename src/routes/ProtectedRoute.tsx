import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = () => {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, canAccessPath, mustChangePassword, usuario, tecnologia } = useAuth()

  const normalizeRole = (value?: string): string =>
    (value ?? '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '')

  const canAccessCruceAgendaMakiroBackOfficeV2 =
    tecnologia !== 'DTH' &&
    location.pathname === '/almacen/cruce-agenda-makiroBackOfficeV2' &&
    ['backoffice', 'backofficev', 'sistemas', 'admin', 'administrador'].includes(normalizeRole(usuario?.rol))

  const canAccessCruceAgendaMakiroSupervisorV2 =
    tecnologia !== 'DTH' &&
    location.pathname === '/almacen/cruce-agenda-makiroSupervisorV2' &&
    ['supervisor', 'sistemas', 'admin', 'administrador'].includes(normalizeRole(usuario?.rol))

  if (isBootstrapping) {
    return <div className="px-4 py-10 text-sm text-slate-600">Cargando permisos...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (mustChangePassword && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />
  }

  if (!canAccessCruceAgendaMakiroBackOfficeV2 && !canAccessCruceAgendaMakiroSupervisorV2 && !canAccessPath(location.pathname)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
