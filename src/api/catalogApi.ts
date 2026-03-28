import api from './http'
import { normalizeArrayResponse } from './apiResponse'

export type CatalogItem = Record<string, unknown>

export const fetchTecnicos = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/tecnicos')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchRutas = async (tecnicoId?: number): Promise<CatalogItem[]> => {
  const params = tecnicoId ? { tecnicoId } : undefined
  const { data } = await api.get('/catalogos/rutas', params ? { params } : undefined)
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchTiposServicio = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/tipo-servicio')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchEstados = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/estados')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchCatalogSucursales = async (): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/sucursales')
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchTipoMaterial = async (tipoServicioId: number): Promise<CatalogItem[]> => {
  const { data } = await api.get('/catalogos/tipo-material', { params: { tipoServicioId } })
  return normalizeArrayResponse<CatalogItem>(data)
}

export const fetchUsuarios = async (rolId?: number | string): Promise<CatalogItem[]> => {
  const params = rolId ? { rolId } : undefined
  const { data } = await api.get('/catalogos/usuarios', params ? { params } : undefined)
  return normalizeArrayResponse<CatalogItem>(data)
}
