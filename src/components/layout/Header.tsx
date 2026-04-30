import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { fetchSucursales } from '../../services/authApi'
import Button from '../common/Button'

interface HeaderProps {
  onMenuClick?: () => void
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate()
  const { usuario, roleName, roleId, administrador, logout } = useAuth()
  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-header'],
    queryFn: fetchSucursales,
    staleTime: 5 * 60 * 1000,
  })

  const roleNameResolved = (() => {
    if (roleName?.trim()) return roleName.trim()
    if (roleId === 8) return 'Tecnico'
    if (roleId === 9) return 'Supervisor'
    if (roleId > 0) return `Rol ${roleId}`
    return 'Sin asignar'
  })()
  const roleLabel = `Rol: ${roleNameResolved}`

  const sucursalNombre = (() => {
    const idSucursal = usuario?.idSucursal ?? 0
    if (!idSucursal) return 'Sin sucursal'
    const opciones = sucursalesQuery.data?.data ?? []
    const match = opciones.find((item) => item.idSucursal === idSucursal)
    if (match?.sucursal?.trim()) return match.sucursal.trim()
    return `ID ${idSucursal}`
  })()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="bento-tile mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white p-2 text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600 lg:hidden"
        >
          <span className="sr-only">Abrir menu</span>
          <span className="flex flex-col gap-1">
            <span className="h-0.5 w-5 rounded bg-current" />
            <span className="h-0.5 w-5 rounded bg-current" />
            <span className="h-0.5 w-5 rounded bg-current" />
          </span>
        </button>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Gestion OT&apos;s - {sucursalNombre}</h2>
          <p className="text-sm text-slate-600">Bienvenido, {usuario?.nombre ?? 'Operador'}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="badge">{roleLabel}</span>
        {administrador ? <span className="badge border-emerald-200 text-emerald-700">Administrador</span> : null}
        <Button variant="secondary" onClick={handleLogout} type="button">
          Cerrar sesion
        </Button>
      </div>
    </header>
  )
}

export default Header
