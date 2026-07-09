import { NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faClipboardCheck, faFileInvoice, faGear, faHand, faHelmetSafety, faLocationDot, faShieldHalved, faStar, faThumbsUp, faUsers, faUserShield, faWrench } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import type { NavigationItem } from '../../config/navigation'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  showCierreJornada?: boolean
  onCierreJornadaClick?: () => void
}

const Sidebar = ({ isOpen = false, onClose, showCierreJornada = false, onCierreJornadaClick }: SidebarProps) => {
  const navigate = useNavigate()
  const { visibleNavigationItems, menusAsignados, usuario, logout } = useAuth()
  const sidebarItems = visibleNavigationItems.filter((item) => item.showInSidebar !== false)
  const menuById = new Map(menusAsignados.map((menu) => [menu.idMenu, menu] as const))

  const getMenuPages = (menu: (typeof menusAsignados)[number]): string[] => {
    const pages: string[] = []
    if (menu.paginaAsociada?.trim()) {
      pages.push(menu.paginaAsociada.trim().toLowerCase())
    }
    for (const page of menu.paginasAsociadas ?? []) {
      const value = page.trim()
      if (!value) continue
      pages.push(value.toLowerCase())
    }
    return pages
  }

  const resolveSidebarLabel = (item: NavigationItem): string => {
    if (!item.sidebarLabelFromMenu) return item.label

    const targetPages = new Set([...(item.requiredAnyPageNames ?? []), ...(item.requiredPageNames ?? [])].map((value) => value.toLowerCase()))

    const resolveLabelFromMenu = (menu: (typeof menusAsignados)[number]): string => {
      const custom = menu.nombreSidebar?.trim()
      if (custom) return custom
      return menu.nombreMostrar ?? menu.nombre ?? item.label
    }

    if (targetPages.size > 0) {
      for (const menu of menusAsignados) {
        const hasMatch = getMenuPages(menu).some((page) => targetPages.has(page))
        if (!hasMatch) continue

        const parentMenu = menu.padre > 0 ? menuById.get(menu.padre) : undefined
        return resolveLabelFromMenu(parentMenu ?? menu)
      }
    }

    return item.label
  }

  const getItemIcon = (item: NavigationItem) => {
    const key = `${item.label} ${item.to}`.toLowerCase()
    if (key.includes('gestion') || key.includes('/ot')) return faClipboardCheck
    if (key.includes('historico') || key.includes('jornada')) return faHelmetSafety
    if (key.includes('conform') || key.includes('cuadrilla')) return faUsers
    if (key.includes('llamada') || key.includes('seguimiento') || key.includes('control operativo')) return faBell
    if (key.includes('nps')) return faThumbsUp
    if (key.includes('georef')) return faLocationDot
    if (key.includes('boleta')) return faFileInvoice
    if (key.includes('central')) return faWrench
    if (key.includes('privileg')) return faUserShield
    if (key.includes('supervision')) return faHand
    return faStar
  }

  const initials = (usuario?.nombre || 'Usuario')
    .split(' ')
    .map((part) => part.trim()[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const hasLimitedFunctions = sidebarItems.length <= 3

  const handleLogout = () => {
    logout()
    onClose?.()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-84 max-w-[88vw] p-3 transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-full lg:max-w-none lg:p-4 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col gap-4 rounded-2xl border-2 border-blue-500 bg-slate-100 p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-blue-700">
                <FontAwesomeIcon icon={faShieldHalved} />
                <h1 className="text-2xl font-extrabold">Tigo Hogar</h1>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500"></p>
              <div className="mt-3 h-px w-14 bg-blue-200" />
              <p className="mt-2 text-xs text-slate-600">Control de Ordenes de trabajo</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-600 lg:hidden"
            >
              Cerrar
            </button>
          </div>
          <nav className={hasLimitedFunctions ? 'flex flex-col gap-2.5' : 'grid grid-cols-2 gap-2.5'}>
            {sidebarItems.map((item, index) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `rounded-xl border px-2.5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'border-blue-500 bg-blue-600 text-white shadow-lg'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                  }`
                }
                style={!hasLimitedFunctions && index === 0 ? { gridColumn: '1 / -1' } : undefined}
              >
                <div className={`flex ${index === 0 ? 'items-center' : 'flex-col items-start'} gap-2`}>
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FontAwesomeIcon icon={getItemIcon(item)} className="text-xs" />
                  </span>
                  <span className={`${index === 0 ? 'text-base' : 'w-full text-[12px] leading-4'} whitespace-normal break-words`}>
                    {resolveSidebarLabel(item)}
                  </span>
                </div>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{initials}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{usuario?.nombre || 'Usuario'}</p>
                <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">{usuario?.rol || 'Operador'}</p>
              </div>
              <FontAwesomeIcon icon={faGear} className="ml-auto text-slate-400" />
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1 text-[10px]">
              <span className="font-semibold">Sistema:</span> En linea
            </div>
            {showCierreJornada ? (
              <button
                type="button"
                onClick={onCierreJornadaClick}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                Cierre de jornada
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 lg:hidden"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </aside>
    </>
  )
  
}

export default Sidebar
