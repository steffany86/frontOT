import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ForbiddenPage = () => {
  const { logout } = useAuth()

  return (
    <div className="sup-v2-fs flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xl bento-page">
        <div className="glass-panel w-full space-y-2 p-4 text-center">
          <p className="text-[10px] font-medium uppercase text-slate-500">Error 403</p>
          <h1 className="page-title">No tienes permisos para acceder a esta ruta.</h1>
          <p className="text-slate-600">Solicita privilegios a un administrador o vuelve al login.</p>
          <Link to="/login" className="btn-primary" onClick={logout}>
            Cerrar sesion e ir al login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForbiddenPage
