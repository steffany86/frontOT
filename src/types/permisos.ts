export type MenuPermiso = {
  idMenu: number
  nombre: string
  nombreMostrar?: string
  nombreSidebar?: string
  paginaAsociada?: string
  paginasAsociadas?: string[]
  nivel: number
  padre: number
  asignado: boolean
}

export type Rol = {
  idRol: number
  nombre: string
}

export type PrivilegiosRolDetalle = {
  idRol: number
  rol: string
  menus: MenuPermiso[]
}

export type MenuPaginasRelacion = {
  idMenu: number
  nombre: string
  paginasAsociadas: string[]
}

export type MenuSidebarNombreRelacion = {
  idMenu: number
  nombre: string
  nombreSidebar?: string | null
}

export type PermisosUsuario = {
  idUsuario: number
  idRol: number
  rol: string
  administrador: boolean
  menuIds: number[]
  menus: MenuPermiso[]
}
