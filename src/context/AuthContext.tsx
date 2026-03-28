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
import { useQueryClient } from '@tanstack/react-query'
import { matchPath } from 'react-router-dom'
import { navigationItems, type NavigationItem } from '../config/navigation'
import { fetchPermisos, login as loginRequest } from '../services/authApi'
import { getApiErrorMessage, isAuthError, setUnauthorizedHandler } from '../services/httpClient'
import { useSessionStore } from '../store/sessionStore'
import type { LoginRequest, SessionData } from '../types/auth'
import type { MenuPermiso, PermisosUsuario } from '../types/permisos'
import { getSessionStorage, setSessionStorage } from '../utils/storage'

type UsuarioSesion = {
  idUsuario: number
  nombre: string
  rol: string
  idRol: number
  idSucursal: number
}

type AuthContextValue = {
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
  isBootstrapping: boolean
  visibleNavigationItems: NavigationItem[]
  defaultPrivatePath: string
  signIn: (credentials: LoginRequest) => Promise<SessionData>
  logout: () => void
  refreshPermisos: () => Promise<PermisosUsuario | null>
  canAccessNavigationItem: (item: NavigationItem) => boolean
  canAccessPath: (pathname: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const PRIVILEGIOS_ROUTE = '/admin/privilegios'
const PRIVILEGIOS_ALLOWED_ROLE_ID = 4

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const mapSessionToUser = (session: SessionData | null): UsuarioSesion | null => {
  if (!session?.sessionToken) return null
  return {
    idUsuario: session.idUsuario,
    nombre: session.nombre,
    rol: session.rol,
    idRol: session.idRol,
    idSucursal: session.idSucursal,
  }
}

const normalizeMenuName = (value: string): string => value.trim().toLowerCase()

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
  const [permisos, setPermisos] = useState<PermisosUsuario | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(Boolean(initialSession?.sessionToken))
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

  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetAuthState()
    })
    return () => setUnauthorizedHandler(null)
  }, [resetAuthState])

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
  const menuIds = permisos?.menuIds ?? []

  const menusAsignados = useMemo(() => {
    if (!permisos) return []
    const assignedById = new Set(menuIds)
    return permisos.menus.filter((menu) => menu.asignado || assignedById.has(menu.idMenu))
  }, [menuIds, permisos])

  const menuNamesAsignados = useMemo(() => {
    const names = new Set<string>()
    for (const menu of menusAsignados) {
      if (!menu?.nombre) continue
      names.add(normalizeMenuName(menu.nombre))
    }
    return names
  }, [menusAsignados])

  const canAccessNavigationItem = useCallback(
    (item: NavigationItem): boolean => {
      const activeRoleId = toFiniteNumber(permisos?.idRol ?? usuario?.idRol ?? getSessionStorage()?.idRol)
      if (item.to === PRIVILEGIOS_ROUTE) {
        return activeRoleId !== null && activeRoleId === PRIVILEGIOS_ALLOWED_ROLE_ID
      }

      if (!permisos) return false
      if (item.adminOnly && !administrador) return false
      if (item.requiredMenuIds?.length && !item.requiredMenuIds.every((idMenu) => menuIds.includes(idMenu))) return false
      if (item.requiredAnyMenuIds?.length && !item.requiredAnyMenuIds.some((idMenu) => menuIds.includes(idMenu))) return false
      if (
        item.requiredMenuNames?.length &&
        !item.requiredMenuNames.every((menuName) => menuNamesAsignados.has(normalizeMenuName(menuName)))
      ) {
        return false
      }
      if (
        item.requiredAnyMenuNames?.length &&
        !item.requiredAnyMenuNames.some((menuName) => menuNamesAsignados.has(normalizeMenuName(menuName)))
      ) {
        return false
      }
      return true
    },
    [administrador, menuIds, menuNamesAsignados, permisos, usuario]
  )

  const visibleNavigationItems = useMemo(
    () => navigationItems.filter((item) => canAccessNavigationItem(item)),
    [canAccessNavigationItem]
  )

  const defaultPrivatePath = useMemo(() => {
    return visibleNavigationItems[0]?.to ?? '/403'
  }, [visibleNavigationItems])

  const canAccessPath = useCallback(
    (pathname: string): boolean => {
      if (!token) return false
      if (!permisos) return false
      const normalizedPath = pathname.trim() || '/'

      const matchedNavigationItem = navigationItems.find((item) =>
        item.routePatterns.some((pattern) => Boolean(matchPath({ path: pattern, end: true }, normalizedPath)))
      )

      if (!matchedNavigationItem) return true
      return canAccessNavigationItem(matchedNavigationItem)
    },
    [canAccessNavigationItem, permisos, token]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
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
      isBootstrapping,
      visibleNavigationItems,
      defaultPrivatePath,
      signIn,
      logout,
      refreshPermisos,
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
      menuIds,
      menusAsignados,
      permisos,
      roleId,
      roleName,
      refreshPermisos,
      signIn,
      token,
      logout,
      usuario,
      visibleNavigationItems,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }
  return context
}
