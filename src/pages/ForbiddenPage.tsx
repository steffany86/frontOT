import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ForbiddenPage = () => {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl bento-page">
        <div className="glass-panel w-full space-y-4 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Error 403</p>
          <h1 className="text-2xl font-semibold text-slate-900">No tienes permisos para acceder a esta ruta.</h1>
          <p className="text-sm text-slate-600">Solicita privilegios a un administrador o vuelve al login.</p>
          <Link to="/login" className="btn-primary" onClick={logout}>
            Cerrar sesion e ir al login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForbiddenPage
