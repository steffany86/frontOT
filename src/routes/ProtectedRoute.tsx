import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = () => {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, canAccessPath, mustChangePassword, usuario } = useAuth()

  const normalizeRole = (value?: string): string =>
    (value ?? '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '')

  const canAccessCruceAgendaMakiro =
    location.pathname === '/almacen/cruce-agenda-makiro' &&
    ['almacenero', 'auxiliardealmacen', 'sistemas', 'admin', 'administrador'].includes(normalizeRole(usuario?.rol))

  if (isBootstrapping) {
    return <div className="px-4 py-10 text-sm text-slate-600">Cargando permisos...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (mustChangePassword && location.pathname !== '/cambiar-password') {
    return <Navigate to="/cambiar-password" replace />
  }

  if (!canAccessCruceAgendaMakiro && !canAccessPath(location.pathname)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
