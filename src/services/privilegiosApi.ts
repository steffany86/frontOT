import type { ApiResponse } from '../types/auth'
import type { MenuPaginasRelacion, MenuSidebarNombreRelacion, PrivilegiosRolDetalle, Rol } from '../types/permisos'
import httpClient, { unwrapApiData } from './httpClient'

export const fetchRolesPrivilegios = async (): Promise<Rol[]> => {
  const { data } = await httpClient.get<ApiResponse<Rol[]>>('/admin/privilegios/roles')
  return unwrapApiData(data)
}

export const fetchPrivilegiosRolDetalle = async (idRol: number): Promise<PrivilegiosRolDetalle> => {
  const { data } = await httpClient.get<ApiResponse<PrivilegiosRolDetalle>>(`/admin/privilegios/roles/${idRol}/menu`)
  return unwrapApiData(data)
}

export const updatePrivilegiosRolMenu = async (idRol: number, menuIds: number[]): Promise<PrivilegiosRolDetalle> => {
  const { data } = await httpClient.put<ApiResponse<PrivilegiosRolDetalle>>(`/admin/privilegios/roles/${idRol}/menu`, {
    menuIds,
  })
  return unwrapApiData(data)
}

export const applySupervisorCuadrillasPreset = async (idRol: number): Promise<PrivilegiosRolDetalle> => {
  const { data } = await httpClient.put<ApiResponse<PrivilegiosRolDetalle>>(
    `/admin/privilegios/roles/${idRol}/preset/supervisor-cuadrillas`
  )
  return unwrapApiData(data)
}

export const updatePaginasPorMenu = async (idMenu: number, paginasAsociadas: string[]): Promise<MenuPaginasRelacion> => {
  const { data } = await httpClient.put<ApiResponse<MenuPaginasRelacion>>(`/admin/privilegios/menus/${idMenu}/paginas`, {
    paginasAsociadas,
  })
  return unwrapApiData(data)
}

export const updateNombreSidebarPorMenu = async (
  idMenu: number,
  nombreSidebar: string
): Promise<MenuSidebarNombreRelacion> => {
  const { data } = await httpClient.put<ApiResponse<MenuSidebarNombreRelacion>>(
    `/admin/privilegios/menus/${idMenu}/sidebar-nombre`,
    { nombreSidebar }
  )
  return unwrapApiData(data)
}
