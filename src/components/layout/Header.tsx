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
  const { usuario, administrador, logout } = useAuth()
  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-header'],
    queryFn: fetchSucursales,
    staleTime: 5 * 60 * 1000,
  })

  const sucursalNombre = (() => {
    const idSucursal = usuario?.idSucursal ?? 0
    if (!idSucursal) return 'Sin sucursal'
    const opciones = sucursalesQuery.data?.data ?? []
    const readSucursalId = (item: Record<string, unknown>): number => {
      const candidates = [item.idSucursal, item.IdSucursal, item.id_sucursal, item.Id_Sucursal]
      for (const value of candidates) {
        const parsed = Number(value)
        if (Number.isFinite(parsed) && parsed > 0) return parsed
      }
      return 0
    }
    const match = opciones.find((item) => readSucursalId(item as unknown as Record<string, unknown>) === Number(idSucursal))
    if (match?.sucursal?.trim()) return match.sucursal.trim()
    return `ID ${idSucursal}`
  })()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="relative z-20 bento-tile mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5 lg:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-1.5 text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600 lg:hidden"
        >
          <span className="sr-only">Abrir menu</span>
          <span className="flex flex-col gap-1">
            <span className="h-0.5 w-4 rounded bg-current" />
            <span className="h-0.5 w-4 rounded bg-current" />
            <span className="h-0.5 w-4 rounded bg-current" />
          </span>
        </button>
        <div className="min-w-0">
          <h2 className="max-w-full break-words pr-1 text-sm font-extrabold leading-tight tracking-tight text-slate-900 sm:text-lg md:text-xl">
            Gestion de OT - {sucursalNombre}
          </h2>
          <p className="mt-0.5 truncate text-xs font-medium tracking-tight text-slate-600 sm:text-sm">
            Bienvenido, {usuario?.nombre ?? 'Operador'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {administrador ? <span className="badge border-emerald-200 text-emerald-700">Administrador</span> : null}
        <Button variant="secondary" onClick={handleLogout} type="button" className="hidden lg:inline-flex">
          Cerrar sesion
        </Button>
      </div>
    </header>
  )
}

export default Header
