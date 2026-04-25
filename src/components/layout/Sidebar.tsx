import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { NavigationItem } from '../../config/navigation'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const { visibleNavigationItems, menusAsignados } = useAuth()
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

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-80 max-w-[86vw] p-4 transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-full lg:max-w-none lg:p-6 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="bento-tile flex h-full flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">TIGO STAR</h1>
              <p className="mt-2 text-sm text-slate-600">Gestion operativa y seguimiento diario.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-600 lg:hidden"
            >
              Cerrar
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'border-brand-500/30 bg-brand-600 text-white shadow-soft'
                      : 'border-transparent bg-white text-slate-600 hover:border-slate-300'
                  }`
                }
              >
                {resolveSidebarLabel(item)}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
            Consejo: activa <span className="font-semibold text-slate-800">VITE_USE_MOCKS=true</span> si no hay backend
            disponible.
          </div>
        </div>
      </aside>
    </>
  )
  
}

export default Sidebar
