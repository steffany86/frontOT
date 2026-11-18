import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { matchPath } from 'react-router-dom'
import { navigationItems, type NavigationItem } from '../config/navigation'
import { fetchMe, fetchPermisos, fetchSucursales, login as loginRequest } from '../services/authApi'
import { getApiErrorMessage, isAuthError, listenMaintenanceActive, setUnauthorizedHandler } from '../services/httpClient'
import Modal from '../components/common/Modal'
import { useSessionStore } from '../store/sessionStore'
import type { LoginRequest, SessionData } from '../types/auth'
import type { MenuPermiso, PermisosUsuario } from '../types/permisos'
import { getSessionStorage, setSessionStorage } from '../utils/storage'
import { shouldForcePasswordChange } from '../config/passwordPolicy'

type UsuarioSesion = {
  idUsuario: number
  nombre: string
  rol: string
  idRol: number
  idSucursal: number
  necesitaCambio?: boolean
  ultimaModificacion?: string
}

export type Tecnologia = 'HFC' | 'DTH'

// Las paginas DTH viven bajo /dth... (ej. /dth/prueba). Un usuario de sucursal DTH solo entra a esas rutas.
export const isDthPath = (pathname: string): boolean => /^\/dth(\/|$)/i.test(pathname.trim())
const DTH_COMMON_PATHS = ['/', '/cambiar-password', '/403']

type AuthContextValue = {
  tecnologia: Tecnologia | null
  token: string | null
  usuario: UsuarioSesion | null
  permisos: PermisosUsuario | null
  roleName: string
  roleId: number
  hasValidRole: boolean
  menusAsignados: MenuPermiso[]
  menuIds: number[]
  administrador: boolean
  isAuthenticated: boolean
  mustChangePassword: boolean
  isBootstrapping: boolean
  visibleNavigationItems: NavigationItem[]
  defaultPrivatePath: string
  signIn: (credentials: LoginRequest) => Promise<SessionData>
  logout: () => void
  refreshPermisos: () => Promise<PermisosUsuario | null>
  markPasswordChanged: () => void
  canAccessNavigationItem: (item: NavigationItem) => boolean
  canAccessPath: (pathname: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const mapSessionToUser = (session: SessionData | null): UsuarioSesion | null => {
  if (!session?.sessionToken) return null
  return {
    idUsuario: session.idUsuario,
    nombre: session.nombre,
    rol: session.rol,
    idRol: session.idRol,
    idSucursal: session.idSucursal,
    necesitaCambio: session.necesitaCambio,
    ultimaModificacion: session.ultimaModificacion,
  }
}

const normalizePageName = (value: string): string => value.trim().toLowerCase()
const normalizeRoleName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')

const hasCruceAgendaSupervisorAccessByRole = (roleName: string): boolean =>
  ['supervisor', 'sistemas', 'admin', 'administrador'].includes(normalizeRoleName(roleName))

const hasCruceAgendaBackOfficeAccessByRole = (roleName: string): boolean =>
  ['backoffice', 'backofficev', 'sistemas', 'admin', 'administrador'].includes(normalizeRoleName(roleName))

const isSistemasRole = (roleName: string): boolean => normalizeRoleName(roleName) === 'sistemas'
const isSistemasPath = (pathname: string): boolean => pathname.trim().startsWith('/sistemas/')

const resolveRoleData = (usuario: UsuarioSesion | null, permisos: PermisosUsuario | null): { roleName: string; roleId: number } => {
  const roleName = (permisos?.rol ?? usuario?.rol ?? '').trim()
  const roleId = permisos?.idRol ?? usuario?.idRol ?? 0
  return { roleName, roleId }
}

const updateSessionStorageRole = (permisos: PermisosUsuario): void => {
  const currentSession = getSessionStorage()
  if (!currentSession?.sessionToken) return
  const nextSession = {
    ...currentSession,
    idUsuario: permisos.idUsuario,
    idRol: permisos.idRol,
    rol: permisos.rol,
  }
  setSessionStorage(nextSession)
  useSessionStore.getState().setSession(nextSession)
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient()
  const initialSession = useMemo(() => getSessionStorage(), [])
  const [token, setToken] = useState<string | null>(initialSession?.sessionToken ?? null)
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => mapSessionToUser(initialSession))
  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-header'],
    queryFn: fetchSucursales,
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(token),
  })
  const tecnologia = useMemo<Tecnologia | null>(() => {
    const idSucursal = Number(usuario?.idSucursal ?? 0)
    if (!idSucursal) return null
    const match = (sucursalesQuery.data?.data ?? []).find((s) => {
      const r = s as unknown as Record<string, unknown>
      return Number(r.idSucursal ?? r.IdSucursal ?? r.id_sucursal ?? r.Id_Sucursal) === idSucursal
    })
    const raw = String(match?.tecnologia ?? '').trim().toUpperCase()
    return raw === 'HFC' || raw === 'DTH' ? raw : null
  }, [sucursalesQuery.data, usuario?.idSucursal])
  const [permisos, setPermisos] = useState<PermisosUsuario | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(Boolean(initialSession?.sessionToken))
  const [maintenanceModal, setMaintenanceModal] = useState<{ open: boolean; message: string }>({
    open: false,
    message: 'CAMBIOS DE SISTEMAS EN PROCESO',
  })
  const loadedPermisosTokenRef = useRef<string | null>(null)

  const resetAuthState = useCallback(() => {
    useSessionStore.getState().clearSession()
    setToken(null)
    setUsuario(null)
    setPermisos(null)
    setIsBootstrapping(false)
    loadedPermisosTokenRef.current = null
    queryClient.clear()
  }, [queryClient])

  const hydratePermisos = useCallback((nextPermisos: PermisosUsuario) => {
    setPermisos(nextPermisos)
    setUsuario((previous) => {
      if (!previous) {
        return {
          idUsuario: nextPermisos.idUsuario,
          nombre: '',
          rol: nextPermisos.rol,
          idRol: nextPermisos.idRol,
          idSucursal: 0,
        }
      }
      return {
        ...previous,
        idUsuario: nextPermisos.idUsuario,
        rol: nextPermisos.rol,
        idRol: nextPermisos.idRol,
      }
    })
    updateSessionStorageRole(nextPermisos)
  }, [])

  const refreshPermisos = useCallback(async (): Promise<PermisosUsuario | null> => {
    const activeToken = getSessionStorage()?.sessionToken ?? token
    if (!activeToken) return null
    const me = await fetchMe(activeToken)
    const restoredSession: SessionData = {
      sessionToken: activeToken,
      ...me,
    }
    setSessionStorage(restoredSession)
    useSessionStore.getState().setSession(restoredSession)
    setToken(activeToken)
    setUsuario(mapSessionToUser(restoredSession))
    const nextPermisos = await fetchPermisos(activeToken)
    hydratePermisos(nextPermisos)
    loadedPermisosTokenRef.current = activeToken
    return nextPermisos
  }, [hydratePermisos, token])

  const signIn = useCallback(async (credentials: LoginRequest): Promise<SessionData> => {
    setIsBootstrapping(true)
    queryClient.clear()
    try {
      const nextSession = await loginRequest(credentials)
      let nextPermisos: PermisosUsuario | null = null
      try {
        nextPermisos = await fetchPermisos(nextSession.sessionToken)
      } catch (error) {
        if (!isAuthError(error)) {
          console.error('No fue posible cargar permisos durante el login:', getApiErrorMessage(error))
        }
      }

      const sessionUser = mapSessionToUser(nextSession)

      setSessionStorage(nextSession)
      useSessionStore.getState().setSession(nextSession)
      setToken(nextSession.sessionToken)
      setUsuario(sessionUser)
      setPermisos(null)
      loadedPermisosTokenRef.current = null
      if (nextPermisos) {
        hydratePermisos(nextPermisos)
        loadedPermisosTokenRef.current = nextSession.sessionToken
      }
      return nextSession
    } finally {
      setIsBootstrapping(false)
    }
  }, [hydratePermisos, queryClient])

  const logout = useCallback(() => {
    resetAuthState()
  }, [resetAuthState])

  const markPasswordChanged = useCallback(() => {
    const currentSession = getSessionStorage()
    if (!currentSession?.sessionToken) return
    const updatedSession: SessionData = {
      ...currentSession,
      necesitaCambio: false,
      ultimaModificacion: new Date().toISOString(),
    }
    setSessionStorage(updatedSession)
    useSessionStore.getState().setSession(updatedSession)
    setUsuario((prev) => (prev ? { ...prev, necesitaCambio: false, ultimaModificacion: updatedSession.ultimaModificacion } : prev))
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetAuthState()
    })
    return () => setUnauthorizedHandler(null)
  }, [resetAuthState])

  useEffect(() => {
    return listenMaintenanceActive((message) => {
      setMaintenanceModal({
        open: true,
        message: message?.trim() || 'CAMBIOS DE SISTEMAS EN PROCESO',
      })
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    if (!token) {
      setIsBootstrapping(false)
      return () => {
        isMounted = false
      }
    }

    if (loadedPermisosTokenRef.current === token && permisos) {
      setIsBootstrapping(false)
      return () => {
        isMounted = false
      }
    }

    setIsBootstrapping(true)
    refreshPermisos()
      .catch((error) => {
        if (!isMounted) return
        if (!isAuthError(error)) {
          console.error('No fue posible cargar permisos:', getApiErrorMessage(error))
        }
      })
      .finally(() => {
        if (!isMounted) return
        setIsBootstrapping(false)
      })

    return () => {
      isMounted = false
    }
  }, [permisos, refreshPermisos, token])

  const { roleName, roleId } = useMemo(() => resolveRoleData(usuario, permisos), [permisos, usuario])
  const hasValidRole = useMemo(
    () => Number.isFinite(roleId) && roleId > 0,
    [roleId]
  )

  const administrador = permisos?.administrador ?? false
  const mustChangePassword = useMemo(
    () =>
      shouldForcePasswordChange({
        necesitaCambio: usuario?.necesitaCambio,
        ultimaModificacion: usuario?.ultimaModificacion,
      }),
    [usuario?.necesitaCambio, usuario?.ultimaModificacion]
  )
  const menuIds = permisos?.menuIds ?? []

  const menusAsignados = useMemo(() => {
    if (!permisos) return []
    const assignedById = new Set(menuIds)
    return permisos.menus.filter((menu) => menu.asignado || assignedById.has(menu.idMenu))
  }, [menuIds, permisos])

  const pageNamesAsignadas = useMemo(() => {
    const pages = new Set<string>()
    for (const menu of menusAsignados) {
      if (menu?.paginaAsociada?.trim()) {
        pages.add(normalizePageName(menu.paginaAsociada))
      }
      if (!menu?.paginasAsociadas?.length) continue
      for (const pageName of menu.paginasAsociadas) {
        const value = pageName.trim()
        if (!value) continue
        pages.add(normalizePageName(value))
      }
    }
    return pages
  }, [menusAsignados])

  const canAccessNavigationItem = useCallback(
    (item: NavigationItem): boolean => {
      const itemEsDth = isDthPath(item.to)
      if (itemEsDth && tecnologia !== 'DTH') return false
      if (!itemEsDth && tecnologia === 'DTH') return false
      const currentRole = normalizeRoleName(roleName)
      if (
        item.allowedRoles?.length &&
        !item.allowedRoles.some((allowedRole) => normalizeRoleName(allowedRole) === currentRole)
      ) {
        return false
      }
      if (!permisos) {
        return Boolean(item.allowedRoles?.length)
      }
      const hasPageRules = Boolean(item.requiredPageNames?.length || item.requiredAnyPageNames?.length)
      if (
        hasPageRules &&
        item.requiredPageNames?.length &&
        !item.requiredPageNames.every((pageName) => pageNamesAsignadas.has(normalizePageName(pageName)))
      ) {
        return false
      }
      if (
        hasPageRules &&
        item.requiredAnyPageNames?.length &&
        !item.requiredAnyPageNames.some((pageName) => pageNamesAsignadas.has(normalizePageName(pageName)))
      ) {
        return false
      }
      if (hasPageRules) {
        return true
      }
      return true
    },
    [pageNamesAsignadas, permisos, roleName, tecnologia]
  )

  const visibleNavigationItems = useMemo(() => {
    return navigationItems.filter((item) => canAccessNavigationItem(item))
  }, [canAccessNavigationItem])

  const defaultPrivatePath = useMemo(() => {
    if (tecnologia === 'DTH') {
      return visibleNavigationItems[0]?.to ?? '/403'
    }
    if (isSistemasRole(roleName)) {
      return '/sistemas/produccion'
    }
    if (hasCruceAgendaSupervisorAccessByRole(roleName)) {
      return '/almacen/cruce-agenda-makiroSupervisorV2'
    }
    if (hasCruceAgendaBackOfficeAccessByRole(roleName)) {
      return '/almacen/cruce-agenda-makiroBackOfficeV2'
    }
    return visibleNavigationItems[0]?.to ?? '/403'
  }, [roleName, tecnologia, visibleNavigationItems])

  const canAccessPath = useCallback(
    (pathname: string): boolean => {
      if (!token) return false
      if (tecnologia === 'DTH' && !isDthPath(pathname) && !DTH_COMMON_PATHS.includes(pathname.trim() || '/')) return false
      if (tecnologia !== 'DTH' && isDthPath(pathname)) return false
      if (isSistemasRole(roleName) && isSistemasPath(pathname)) return true
      if (!permisos) return false
      const normalizedPath = pathname.trim() || '/'

      const matchedNavigationItem = navigationItems.find((item) =>
        item.routePatterns.some((pattern) => Boolean(matchPath({ path: pattern, end: true }, normalizedPath)))
      )

      if (normalizedPath === '/almacen/cruce-agenda-makiroBackOfficeV2' && hasCruceAgendaBackOfficeAccessByRole(roleName)) {
        return true
      }
      if (normalizedPath === '/almacen/cruce-agenda-makiroSupervisorV2' && hasCruceAgendaSupervisorAccessByRole(roleName)) {
        return true
      }
      if (!matchedNavigationItem) return true
      return canAccessNavigationItem(matchedNavigationItem)
    },
    [canAccessNavigationItem, permisos, roleName, tecnologia, token]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      tecnologia,
      token,
      usuario,
      permisos,
      roleName,
      roleId,
      hasValidRole,
      menusAsignados,
      menuIds,
      administrador,
      isAuthenticated: Boolean(token),
      mustChangePassword,
      isBootstrapping: isBootstrapping || (Boolean(token) && sucursalesQuery.isLoading),
      visibleNavigationItems,
      defaultPrivatePath,
      signIn,
      logout,
      refreshPermisos,
      markPasswordChanged,
      canAccessNavigationItem,
      canAccessPath,
    }),
    [
      administrador,
      canAccessNavigationItem,
      canAccessPath,
      defaultPrivatePath,
      hasValidRole,
      isBootstrapping,
      sucursalesQuery.isLoading,
      menuIds,
      menusAsignados,
      mustChangePassword,
      permisos,
      roleId,
      roleName,
      refreshPermisos,
      markPasswordChanged,
      signIn,
      tecnologia,
      token,
      logout,
      usuario,
      visibleNavigationItems,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Modal
        open={maintenanceModal.open}
        title="CAMBIOS EN PROCESO"
        onClose={() => setMaintenanceModal((current) => ({ ...current, open: false }))}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-3 text-center">
          <p className="text-xl font-black uppercase tracking-wide text-red-600">CAMBIOS EN PROCESO</p>
          <p className="text-sm font-semibold text-slate-700">{maintenanceModal.message}</p>
          <p className="text-xs text-slate-500">El acceso volvera cuando sistemas desactive el bloqueo.</p>
        </div>
      </Modal>
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }
  return context
}
