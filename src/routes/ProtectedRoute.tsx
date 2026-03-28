import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = () => {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, canAccessPath } = useAuth()

  if (isBootstrapping) {
    return <div className="px-4 py-10 text-sm text-slate-600">Cargando permisos...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessPath(location.pathname)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
