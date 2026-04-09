import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import PrivilegiosTree from '../../components/privilegios/PrivilegiosTree'
import {
  applySupervisorCuadrillasPreset,
  fetchPrivilegiosRolDetalle,
  fetchRolesPrivilegios,
  updatePrivilegiosRolMenu,
} from '../../services/privilegiosApi'
import { getApiErrorMessage } from '../../services/httpClient'
import type { PrivilegiosRolDetalle, Rol } from '../../types/permisos'

type ToastState = {
  kind: 'success' | 'error'
  message: string
}

const getAssignedMenuIds = (detalle: PrivilegiosRolDetalle | null): number[] => {
  if (!detalle) return []
  return detalle.menus.filter((menu) => menu.asignado).map((menu) => menu.idMenu)
}

const PrivilegiosPage = () => {
  const queryClient = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([])
  const [syncedRoleId, setSyncedRoleId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

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
    },
    onError: (error) => {
      setToast({ kind: 'error', message: getApiErrorMessage(error, 'No fue posible guardar los privilegios.') })
    },
  })

  const presetMutation = useMutation({
    mutationFn: async () => {
      if (selectedRoleId === null) {
        throw new Error('Selecciona un rol antes de aplicar el preset.')
      }
      return applySupervisorCuadrillasPreset(selectedRoleId)
    },
    onSuccess: (updatedDetalle) => {
      queryClient.setQueryData(['privilegios', 'detalle', updatedDetalle.idRol], updatedDetalle)
      setSelectedMenuIds(getAssignedMenuIds(updatedDetalle))
      setToast({ kind: 'success', message: 'Preset Supervisor Cuadrillas aplicado.' })
    },
    onError: (error) => {
      setToast({ kind: 'error', message: getApiErrorMessage(error, 'No fue posible aplicar el preset.') })
    },
  })

  const selectedRole: Rol | undefined = useMemo(
    () => roles.find((role) => role.idRol === selectedRoleId),
    [roles, selectedRoleId]
  )

  const detalle = detalleQuery.data ?? null
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

  const handleSelectAll = () => {
    setSelectedMenuIds(allMenuIds)
  }

  const handleClearAll = () => {
    setSelectedMenuIds([])
  }

  const isMutating = saveMutation.isPending || presetMutation.isPending
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
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {hasUnsavedChanges ? 'Cambios pendientes' : 'Sin cambios'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-3 rounded-[1.4rem] border border-slate-200/90 bg-white/95 p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">Acciones rapidas</p>
                <p className="text-xs text-slate-500">Selecciona y guarda cuando termines.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => presetMutation.mutate()}
                  disabled={selectedRoleId === null || isMutating || isRoleLoading}
                  className="w-full"
                >
                  {presetMutation.isPending ? 'Aplicando...' : 'Preset Supervisor'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSelectAll}
                  disabled={!allMenuIds.length || isMutating || isRoleLoading}
                  className="w-full"
                >
                  Seleccionar todo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClearAll}
                  disabled={!selectedMenuIds.length || isMutating || isRoleLoading}
                  className="w-full"
                >
                  Limpiar todo
                </Button>
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={selectedRoleId === null || isMutating || isRoleLoading || !hasUnsavedChanges}
                  className="w-full"
                >
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
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
              </div>
            </div>
          ) : null}
        </div>
      </section>

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
