import { useMemo } from 'react'
import type { MenuPermiso } from '../../types/permisos'

interface PrivilegiosTreeProps {
  menus: MenuPermiso[]
  selectedMenuIds: number[]
  disabled?: boolean
  onToggle: (idMenu: number, checked: boolean) => void
}

const sortMenus = (a: MenuPermiso, b: MenuPermiso): number => {
  if (a.nivel !== b.nivel) return a.nivel - b.nivel
  return a.nombre.localeCompare(b.nombre)
}

const PrivilegiosTree = ({
  menus,
  selectedMenuIds,
  disabled = false,
  onToggle,
}: PrivilegiosTreeProps) => {
  const selectedSet = useMemo(() => new Set(selectedMenuIds), [selectedMenuIds])

  const menuById = useMemo(() => {
    return new Map(menus.map((menu) => [menu.idMenu, menu]))
  }, [menus])

  const childrenByParent = useMemo(() => {
    const map = new Map<number, MenuPermiso[]>()

    menus.forEach((menu) => {
      const hasValidParent = menuById.has(menu.padre) && menu.padre !== menu.idMenu
      const parentId = hasValidParent ? menu.padre : 0
      const siblings = map.get(parentId) ?? []
      siblings.push(menu)
      map.set(parentId, siblings)
    })

    map.forEach((value) => value.sort(sortMenus))
    return map
  }, [menuById, menus])

  const renderBranch = (parentId: number, depth: number, ancestry: Set<number>) => {
    const children = childrenByParent.get(parentId) ?? []

    return children.map((menu) => {
      const isChecked = selectedSet.has(menu.idMenu)
      const hasCycle = ancestry.has(menu.idMenu)
      const nextAncestry = new Set(ancestry)
      nextAncestry.add(menu.idMenu)

      return (
        <div key={menu.idMenu} className="space-y-2">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
              isChecked ? 'border-brand-300 bg-brand-50/60 shadow-sm' : 'border-slate-200/80 bg-white/85'
            } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            style={{ marginLeft: depth * 16 }}
            onClick={() => {
              if (disabled) return
              onToggle(menu.idMenu, !isChecked)
            }}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={isChecked}
              disabled={disabled}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onToggle(menu.idMenu, event.target.checked)}
            />
            <span className="truncate text-sm text-slate-700">{menu.nombreMostrar ?? menu.nombre}</span>
          </div>
          {!hasCycle ? renderBranch(menu.idMenu, depth + 1, nextAncestry) : null}
        </div>
      )
    })
  }

  if (!menus.length) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 text-sm text-slate-500">
        No hay menus para mostrar.
      </div>
    )
  }

  return <div className="space-y-2">{renderBranch(0, 0, new Set<number>())}</div>
}

export default PrivilegiosTree
