import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import PrivilegiosTree from '../../components/privilegios/PrivilegiosTree'
import { useAuth } from '../../context/AuthContext'
import {
  fetchPrivilegiosRolDetalle,
  fetchRolesPrivilegios,
  updateNombreSidebarPorMenu,
  updatePaginasPorMenu,
  updatePrivilegiosRolMenu,
} from '../../services/privilegiosApi'
import { getApiErrorMessage } from '../../services/httpClient'
import type { MenuPermiso, PrivilegiosRolDetalle, Rol } from '../../types/permisos'

type ToastState = {
  kind: 'success' | 'error'
  message: string
}

type SidebarButtonConfig = {
  idMenu: number
  nombreMenu: string
  nombreSidebar: string
  principalKey: string
}

const getAssignedMenuIds = (detalle: PrivilegiosRolDetalle | null): number[] => {
  if (!detalle) return []
  return detalle.menus.filter((menu) => menu.asignado).map((menu) => menu.idMenu)
}

const getMenuPageNames = (menu: MenuPermiso | null): string[] => {
  if (!menu) return []
  const assigned = new Set<string>()
  if (menu.paginaAsociada?.trim()) {
    assigned.add(menu.paginaAsociada.trim())
  }
  for (const page of menu.paginasAsociadas ?? []) {
    const value = page.trim()
    if (!value) continue
    assigned.add(value)
  }
  return Array.from(assigned).sort((a, b) => a.localeCompare(b))
}

const collectAvailablePageNames = (menus: MenuPermiso[]): string[] => {
  const names = new Set<string>()
  for (const menu of menus) {
    if (menu.paginaAsociada?.trim()) {
      names.add(menu.paginaAsociada.trim())
    }
    for (const page of menu.paginasAsociadas ?? []) {
      const value = page.trim()
      if (!value) continue
      names.add(value)
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b))
}

const PrivilegiosPage = () => {
  const { refreshPermisos } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([])
  const [syncedRoleId, setSyncedRoleId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isMenuPaginasModalOpen, setIsMenuPaginasModalOpen] = useState(false)
  const [selectedMenuForPagesId, setSelectedMenuForPagesId] = useState<number | null>(null)
  const [selectedPageNames, setSelectedPageNames] = useState<string[]>([])
  const [isSidebarConfigModalOpen, setIsSidebarConfigModalOpen] = useState(false)
  const [sidebarConfigs, setSidebarConfigs] = useState<SidebarButtonConfig[]>([])
  const [originalSidebarConfigMenuIds, setOriginalSidebarConfigMenuIds] = useState<number[]>([])
  const [draftSidebarMenuId, setDraftSidebarMenuId] = useState<number | null>(null)
  const [draftSidebarName, setDraftSidebarName] = useState('')
  const [draftPrincipalKey, setDraftPrincipalKey] = useState('')

  const rolesQuery = useQuery({
    queryKey: ['privilegios', 'roles'],
    queryFn: fetchRolesPrivilegios,
  })

  const roles = rolesQuery.data ?? []

  useEffect(() => {
    if (!roles.length) return
    const roleExists = roles.some((role) => role.idRol === selectedRoleId)
    if (selectedRoleId === null || !roleExists) {
      setSelectedRoleId(roles[0].idRol)
    }
  }, [roles, selectedRoleId])

  const detalleQuery = useQuery({
    queryKey: ['privilegios', 'detalle', selectedRoleId],
    queryFn: () => fetchPrivilegiosRolDetalle(selectedRoleId as number),
    enabled: selectedRoleId !== null,
  })

  useEffect(() => {
    const detalle = detalleQuery.data ?? null
    if (!detalle) return
    if (syncedRoleId === detalle.idRol) return
    setSelectedMenuIds(getAssignedMenuIds(detalle))
    setSyncedRoleId(detalle.idRol)
  }, [detalleQuery.data, syncedRoleId])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedRoleId === null) {
        throw new Error('Selecciona un rol antes de guardar.')
      }
      return updatePrivilegiosRolMenu(selectedRoleId, selectedMenuIds)
    },
    onSuccess: (updatedDetalle) => {
      queryClient.setQueryData(['privilegios', 'detalle', updatedDetalle.idRol], updatedDetalle)
      setSelectedMenuIds(getAssignedMenuIds(updatedDetalle))
      setToast({ kind: 'success', message: 'Privilegios guardados correctamente.' })
      refreshPermisos().catch(() => undefined)
    },
    onError: (error) => {
      setToast({ kind: 'error', message: getApiErrorMessage(error, 'No fue posible guardar los privilegios.') })
    },
  })

  const sidebarConfigMutation = useMutation({
    mutationFn: async () => {
      if (selectedRoleId === null) {
        throw new Error('Selecciona un rol antes de configurar el sidebar.')
      }

      const validConfigs = sidebarConfigs.filter((item) => item.idMenu > 0 && item.principalKey.trim())
      const targetMenuIds = validConfigs.map((item) => item.idMenu)

      for (const config of validConfigs) {
        await updatePaginasPorMenu(config.idMenu, [config.principalKey])
        await updateNombreSidebarPorMenu(config.idMenu, config.nombreSidebar.trim())
      }

      const removedMenuIds = originalSidebarConfigMenuIds.filter((idMenu) => !targetMenuIds.includes(idMenu))
      for (const removedId of removedMenuIds) {
        await updatePaginasPorMenu(removedId, [])
        await updateNombreSidebarPorMenu(removedId, '')
      }

      const mergedMenuIds = Array.from(new Set([...selectedMenuIds, ...targetMenuIds]))
      return updatePrivilegiosRolMenu(selectedRoleId, mergedMenuIds)
    },
    onSuccess: (updatedDetalle) => {
      queryClient.setQueryData(['privilegios', 'detalle', updatedDetalle.idRol], updatedDetalle)
      queryClient.invalidateQueries({ queryKey: ['privilegios', 'detalle', updatedDetalle.idRol] })
      setSelectedMenuIds(getAssignedMenuIds(updatedDetalle))
      setIsSidebarConfigModalOpen(false)
      setToast({ kind: 'success', message: 'Botones de sidebar guardados correctamente.' })
      refreshPermisos().catch(() => undefined)
    },
    onError: (error) => {
      setToast({ kind: 'error', message: getApiErrorMessage(error, 'No fue posible guardar configuracion de sidebar.') })
    },
  })

  const menuPaginasMutation = useMutation({
    mutationFn: async () => {
      if (selectedMenuForPagesId === null) {
        throw new Error('Selecciona un menu para configurar sus paginas.')
      }
      return updatePaginasPorMenu(selectedMenuForPagesId, selectedPageNames)
    },
    onSuccess: (response) => {
      if (selectedRoleId !== null) {
        queryClient.invalidateQueries({ queryKey: ['privilegios', 'detalle', selectedRoleId] })
      }
      setToast({
        kind: 'success',
        message: `Paginas asociadas guardadas para ${response.nombre}.`,
      })
      setIsMenuPaginasModalOpen(false)
      refreshPermisos().catch(() => undefined)
    },
    onError: (error) => {
      setToast({ kind: 'error', message: getApiErrorMessage(error, 'No fue posible guardar la relacion menu-paginas.') })
    },
  })

  const selectedRole: Rol | undefined = useMemo(
    () => roles.find((role) => role.idRol === selectedRoleId),
    [roles, selectedRoleId]
  )

  const detalle = detalleQuery.data ?? null
  const availablePageNames = useMemo(() => collectAvailablePageNames(detalle?.menus ?? []), [detalle])
  const fullMenuById = useMemo(() => {
    const map = new Map<number, MenuPermiso>()
    if (!detalle) return map
    for (const menu of detalle.menus) {
      map.set(menu.idMenu, menu)
    }
    return map
  }, [detalle])
  const allMenuIds = useMemo(() => detalle?.menus.map((menu) => menu.idMenu) ?? [], [detalle])
  const menuById = useMemo(() => {
    const map = new Map<number, { idMenu: number; padre: number }>()
    if (!detalle) return map
    for (const menu of detalle.menus) {
      map.set(menu.idMenu, { idMenu: menu.idMenu, padre: menu.padre })
    }
    return map
  }, [detalle])
  const childrenByParent = useMemo(() => {
    const map = new Map<number, number[]>()
    if (!detalle) return map
    for (const menu of detalle.menus) {
      const hasValidParent = menuById.has(menu.padre) && menu.padre !== menu.idMenu
      const parentId = hasValidParent ? menu.padre : 0
      const siblings = map.get(parentId) ?? []
      siblings.push(menu.idMenu)
      map.set(parentId, siblings)
    }
    return map
  }, [detalle, menuById])
  const isAllSelected = allMenuIds.length > 0 && allMenuIds.every((idMenu) => selectedMenuIds.includes(idMenu))
  const roleLabel = detalle?.rol || selectedRole?.nombre || 'Sin seleccion'
  const selectedMenuForPages = useMemo(
    () => (selectedMenuForPagesId !== null ? fullMenuById.get(selectedMenuForPagesId) ?? null : null),
    [fullMenuById, selectedMenuForPagesId]
  )
  const menusDisponiblesSidebar = useMemo(
    () =>
      (detalle?.menus ?? [])
        .slice()
        .sort((a, b) => (a.nombreMostrar ?? a.nombre).localeCompare(b.nombreMostrar ?? b.nombre)),
    [detalle]
  )

  useEffect(() => {
    if (!detalle?.menus.length) {
      setSelectedMenuForPagesId(null)
      return
    }
    const currentExists = selectedMenuForPagesId !== null && detalle.menus.some((menu) => menu.idMenu === selectedMenuForPagesId)
    if (!currentExists) {
      setSelectedMenuForPagesId(detalle.menus[0].idMenu)
    }
  }, [detalle, selectedMenuForPagesId])

  const openMenuPaginasModal = () => {
    if (!detalle?.menus.length) return
    const targetId = selectedMenuForPagesId && fullMenuById.has(selectedMenuForPagesId)
      ? selectedMenuForPagesId
      : detalle.menus[0].idMenu
    setSelectedMenuForPagesId(targetId)
    setSelectedPageNames(getMenuPageNames(fullMenuById.get(targetId) ?? null))
    setIsMenuPaginasModalOpen(true)
  }

  const openSidebarConfigModal = () => {
    const configs: SidebarButtonConfig[] = []
    for (const menu of menusDisponiblesSidebar) {
      const principals = getMenuPageNames(menu)
      const principalKey = principals[0] ?? ''
      const nombreSidebar = (menu.nombreSidebar ?? '').trim()
      if (!principalKey && !nombreSidebar) continue
      configs.push({
        idMenu: menu.idMenu,
        nombreMenu: menu.nombreMostrar ?? menu.nombre,
        nombreSidebar,
        principalKey,
      })
    }
    const ids = configs.map((item) => item.idMenu)
    setSidebarConfigs(configs)
    setOriginalSidebarConfigMenuIds(ids)
    setDraftSidebarMenuId(null)
    setDraftSidebarName('')
    setDraftPrincipalKey('')
    setIsSidebarConfigModalOpen(true)
  }

  const handleSelectMenuForPages = (menuId: number) => {
    setSelectedMenuForPagesId(menuId)
    setSelectedPageNames(getMenuPageNames(fullMenuById.get(menuId) ?? null))
  }

  const handleTogglePageForMenu = (pageName: string, checked: boolean) => {
    setSelectedPageNames((current) => {
      if (checked) {
        if (current.includes(pageName)) return current
        return [...current, pageName]
      }
      return current.filter((item) => item !== pageName)
    })
  }

  const handleAddSidebarConfig = () => {
    if (draftSidebarMenuId === null || !draftPrincipalKey.trim()) {
      setToast({ kind: 'error', message: 'Selecciona privilegio y clase principal antes de agregar.' })
      return
    }
    const selectedMenu = fullMenuById.get(draftSidebarMenuId)
    if (!selectedMenu) {
      setToast({ kind: 'error', message: 'El privilegio seleccionado no es valido.' })
      return
    }
    setSidebarConfigs((current) => {
      const withoutCurrent = current.filter((item) => item.idMenu !== draftSidebarMenuId)
      return [
        ...withoutCurrent,
        {
          idMenu: draftSidebarMenuId,
          nombreMenu: selectedMenu.nombreMostrar ?? selectedMenu.nombre,
          nombreSidebar: draftSidebarName.trim(),
          principalKey: draftPrincipalKey.trim(),
        },
      ].sort((a, b) => a.nombreMenu.localeCompare(b.nombreMenu))
    })
    setDraftSidebarMenuId(null)
    setDraftSidebarName('')
    setDraftPrincipalKey('')
  }

  const handleRemoveSidebarConfig = (idMenu: number) => {
    setSidebarConfigs((current) => current.filter((item) => item.idMenu !== idMenu))
  }

  const handleEditSidebarConfig = (idMenu: number) => {
    const found = sidebarConfigs.find((item) => item.idMenu === idMenu)
    if (!found) return
    setDraftSidebarMenuId(found.idMenu)
    setDraftSidebarName(found.nombreSidebar)
    setDraftPrincipalKey(found.principalKey)
  }

  const handleToggleMenu = (idMenu: number, checked: boolean) => {
    const descendantIds: number[] = []
    const visited = new Set<number>()
    const stack = [...(childrenByParent.get(idMenu) ?? [])]
    while (stack.length) {
      const current = stack.pop()
      if (current === undefined) continue
      if (current === idMenu) continue
      if (visited.has(current)) continue
      visited.add(current)
      descendantIds.push(current)
      const children = childrenByParent.get(current) ?? []
      for (const childId of children) {
        if (!visited.has(childId) && childId !== idMenu) {
          stack.push(childId)
        }
      }
    }

    setSelectedMenuIds((current) => {
      const targetIds = [idMenu, ...descendantIds]
      if (checked) {
        const next = new Set(current)
        targetIds.forEach((id) => next.add(id))
        return Array.from(next)
      }
      const blocked = new Set(targetIds)
      return current.filter((item) => !blocked.has(item))
    })
  }

  const isMutating = saveMutation.isPending || menuPaginasMutation.isPending || sidebarConfigMutation.isPending
  const isRoleLoading = detalleQuery.isLoading
  const isDetailRefreshing = detalleQuery.isFetching && !detalleQuery.isLoading
  const assignedMenuIds = useMemo(() => getAssignedMenuIds(detalle), [detalle])
  const hasUnsavedChanges = useMemo(() => {
    const assignedSet = new Set(assignedMenuIds)
    if (assignedSet.size !== selectedMenuIds.length) return true
    return selectedMenuIds.some((idMenu) => !assignedSet.has(idMenu))
  }, [assignedMenuIds, selectedMenuIds])
  const totalMenus = allMenuIds.length
  const selectedMenus = selectedMenuIds.length
  const coverage = totalMenus > 0 ? Math.round((selectedMenus / totalMenus) * 100) : 0

  return (
    <div className="bento-page">
      <section className="glass-panel relative overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-brand-100/60 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-slate-200/70 blur-3xl" />
        </div>

        <div className="relative space-y-4 sm:space-y-5">
          <div className="rounded-[1.4rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="section-title">Pool de Privilegios</h1>
                <p className="text-sm text-slate-500">Rol seleccionado: {roleLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openSidebarConfigModal}
                  disabled={!detalle?.menus.length || isMutating || isRoleLoading}
                >
                  Configurar sidebar
                </Button>
                <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {hasUnsavedChanges ? 'Cambios pendientes' : 'Sin cambios'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-3 rounded-[1.4rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">Relacion Menu-Paginas</p>
                <p className="text-xs text-slate-500">Configura que paginas JSX desbloquea cada menu.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-1 xl:grid-cols-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openMenuPaginasModal}
                  disabled={!detalle?.menus.length || isMutating || isRoleLoading}
                  className="w-full"
                >
                  Configurar relacion menu-paginas
                </Button>
              </div>
            </div>

            <div className="lg:col-span-4 rounded-[1.4rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm sm:p-5">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-800">Rol</span>
                <select
                  className="input-base"
                  value={selectedRoleId ?? ''}
                  onChange={(event) => setSelectedRoleId(Number(event.target.value))}
                  disabled={rolesQuery.isLoading || !roles.length || isMutating}
                >
                  {!roles.length ? <option value="">Sin roles disponibles</option> : null}
                  {roles.map((role) => (
                    <option key={role.idRol} value={role.idRol}>
                      {role.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-[1.2rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm lg:col-span-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Menus marcados</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {selectedMenus}
                <span className="text-base font-medium text-slate-500"> / {totalMenus}</span>
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm lg:col-span-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cobertura</p>
              <p className="mt-1 text-2xl font-semibold text-brand-700">{coverage}%</p>
            </div>

            <div className="rounded-[1.2rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm lg:col-span-6">
              <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {isRoleLoading ? 'Cargando menus del rol...' : isDetailRefreshing ? 'Actualizando datos del rol...' : 'Listo para editar'}
              </p>
            </div>
          </div>

          {rolesQuery.isLoading ? <div className="text-sm text-slate-500">Cargando roles...</div> : null}
          {rolesQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {getApiErrorMessage(rolesQuery.error, 'No se pudieron cargar los roles.')}
            </div>
          ) : null}

          {detalleQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {getApiErrorMessage(detalleQuery.error, 'No se pudieron cargar los menus del rol.')}
            </div>
          ) : null}

          {!detalleQuery.isLoading && !detalleQuery.isError && detalle ? (
            <div className="grid gap-3 lg:grid-cols-12">
              <div className="rounded-[1.4rem] border border-slate-200/90 bg-white/95 p-3 shadow-sm sm:p-4 lg:col-span-8">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-sm font-semibold text-slate-800">Menus por rol</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {isAllSelected ? 'Todos seleccionados' : 'Seleccion parcial'}
                  </span>
                </div>
                <div className="max-h-[58vh] overflow-y-auto pr-1">
                  <PrivilegiosTree
                    menus={detalle.menus}
                    selectedMenuIds={selectedMenuIds}
                    disabled={isMutating}
                    onToggle={handleToggleMenu}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-[1.4rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm sm:p-5 lg:col-span-4">
                <p className="text-sm font-semibold text-slate-800">Resumen de configuracion</p>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-xs text-slate-500">Rol actual</p>
                  <p className="text-sm font-semibold text-slate-800">{roleLabel}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-xs text-slate-500">Cambios sin guardar</p>
                  <p className={`text-sm font-semibold ${hasUnsavedChanges ? 'text-brand-700' : 'text-slate-700'}`}>
                    {hasUnsavedChanges ? 'Si' : 'No'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <p className="text-xs text-slate-500">Consejo</p>
                  <p className="text-sm text-slate-700">Selecciona menus, revisa el conteo y luego guarda para aplicar permisos.</p>
                </div>
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={selectedRoleId === null || isMutating || isRoleLoading || !hasUnsavedChanges}
                  className="w-full"
                >
                  {saveMutation.isPending ? 'Guardando permisos...' : 'Guardar permisos del rol'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <Modal
        open={isMenuPaginasModalOpen}
        title="Relacion Menu con Clases Principales"
        onClose={() => {
          if (menuPaginasMutation.isPending) return
          setIsMenuPaginasModalOpen(false)
        }}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsMenuPaginasModalOpen(false)}
              disabled={menuPaginasMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => menuPaginasMutation.mutate()}
              disabled={selectedMenuForPagesId === null || menuPaginasMutation.isPending}
            >
              {menuPaginasMutation.isPending ? 'Guardando relacion...' : 'Guardar relacion'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Menus disponibles</p>
            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {(detalle?.menus ?? []).map((menu) => {
                const active = menu.idMenu === selectedMenuForPagesId
                const pageCount = getMenuPageNames(menu).length
                return (
                  <button
                    key={menu.idMenu}
                    type="button"
                    onClick={() => handleSelectMenuForPages(menu.idMenu)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? 'border-brand-300 bg-brand-50 text-brand-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{menu.nombreMostrar ?? menu.nombre}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        {pageCount}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">ID Menu: {menu.idMenu}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clases principales</p>
            <p className="mt-1 text-sm text-slate-700">
              Menu seleccionado:{' '}
              <span className="font-semibold text-slate-900">{selectedMenuForPages?.nombreMostrar ?? selectedMenuForPages?.nombre ?? 'Ninguno'}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Cada clase principal habilita automaticamente sus paginas hijas.</p>
            <div className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
              {availablePageNames.map((pageName) => {
                const checked = selectedPageNames.includes(pageName)
                return (
                  <label
                    key={pageName}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 transition hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    <span className="text-sm font-medium text-slate-700">{pageName}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={checked}
                      onChange={(event) => handleTogglePageForMenu(pageName, event.target.checked)}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={isSidebarConfigModalOpen}
        title="Configurar botones del sidebar"
        onClose={() => {
          if (sidebarConfigMutation.isPending) return
          setIsSidebarConfigModalOpen(false)
        }}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSidebarConfigModalOpen(false)}
              disabled={sidebarConfigMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => sidebarConfigMutation.mutate()}
              disabled={sidebarConfigMutation.isPending || selectedRoleId === null}
            >
              {sidebarConfigMutation.isPending ? 'Guardando...' : 'Guardar configuracion'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Agregar / editar boton</p>
            <div className="grid gap-2 md:grid-cols-12">
              <div className="md:col-span-5">
                <select
                  className="input-base"
                  value={draftSidebarMenuId ?? ''}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    setDraftSidebarMenuId(Number.isFinite(value) && value > 0 ? value : null)
                  }}
                >
                  <option value="">Selecciona privilegio</option>
                  {menusDisponiblesSidebar.map((menu) => (
                    <option key={menu.idMenu} value={menu.idMenu}>
                      {menu.nombreMostrar ?? menu.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4">
                <input
                  type="text"
                  className="input-base"
                  placeholder="Nombre de boton"
                  value={draftSidebarName}
                  onChange={(event) => setDraftSidebarName(event.target.value)}
                />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <select
                  className="input-base"
                  value={draftPrincipalKey}
                  onChange={(event) => setDraftPrincipalKey(event.target.value)}
                >
                  <option value="">Asociar a</option>
                  {availablePageNames.map((pageName) => (
                    <option key={pageName} value={pageName}>
                      {pageName}
                    </option>
                  ))}
                </select>
                <Button type="button" onClick={handleAddSidebarConfig} className="px-3">
                  +
                </Button>
              </div>
            </div>
          </div>

          {!sidebarConfigs.length ? (
            <p className="text-sm text-slate-600">No hay botones configurados.</p>
          ) : (
            sidebarConfigs.map((item) => (
              <div key={item.idMenu} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.nombreSidebar || 'Sin nombre'}</p>
                    <p className="text-[11px] text-slate-500">
                      Privilegio: {item.nombreMenu} | Asociado: {item.principalKey}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => handleEditSidebarConfig(item.idMenu)} className="px-3 py-1.5">
                      ✏
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => handleRemoveSidebarConfig(item.idMenu)} className="px-3 py-1.5">
                      -
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {toast ? (
        <div
          className={`fixed right-4 top-4 z-[70] rounded-xl border px-4 py-3 text-sm shadow-soft ${
            toast.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}

export default PrivilegiosPage
