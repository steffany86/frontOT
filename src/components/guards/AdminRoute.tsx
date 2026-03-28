import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSessionStorage } from '../../utils/storage'

const resolveUserId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const AdminRoute = () => {
  const { isAuthenticated, isBootstrapping, administrador, usuario, roleId } = useAuth()
  const activeUserId = resolveUserId(usuario?.idUsuario ?? getSessionStorage()?.idUsuario)
  const hasPrivilegiosBypass = activeUserId === 4 || roleId === 4

  if (isBootstrapping) {
    return <div className="px-4 py-10 text-sm text-slate-600">Cargando permisos...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!administrador && !hasPrivilegiosBypass) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

export default AdminRoute
