import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type { BoletaDigitalOt } from '../types/boletaDigital'

const normalizeString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const readValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
  }

  const normalizedMap = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue
    normalizedMap.set(key.replace(/_/g, '').trim().toLowerCase(), value)
  }

  for (const key of keys) {
    const value = normalizedMap.get(key.replace(/_/g, '').trim().toLowerCase())
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const mapBoletaDigitalOt = (row: Record<string, unknown>): BoletaDigitalOt => {
  const rutaPdf = normalizeString(readValue(row, ['RutaPDF', 'rutaPdf', 'ruta_pdf', 'pdf']))
  const id = normalizeString(readValue(row, ['Id', 'id', 'Id_Venta', 'idVenta', 'NroTrans', 'nroTrans']))
  const ot = normalizeString(readValue(row, ['OT', 'ot', 'OrdenTrabajo', 'ordenTrabajo', 'NroOT', 'nroOT']))
  return {
    id,
    ot,
    cliente: normalizeString(readValue(row, ['Cliente', 'cliente', 'Cliente_Nro', 'clienteNro', 'CodigoCliente', 'codigoCliente'])),
    tecnico: normalizeString(readValue(row, ['Tecnico', 'tecnico', 'NombreTecnico', 'nombreTecnico', 'Usuario', 'usuario'])),
    fecha: normalizeString(readValue(row, ['Fecha', 'fecha', 'FechaRegistro', 'fechaRegistro', 'Fecha_Ejecucion', 'fechaEjecucion'])),
    rutaPdf,
    estado: normalizeString(readValue(row, ['Estado', 'estado'])),
    raw: row,
  }
}

export const fetchBoletaDigitalOts = async (): Promise<BoletaDigitalOt[]> => {
  const { data } = await api.get('/boleta-digital/ots')
  const rows = normalizeArrayResponse<Record<string, unknown>>(data)
  return rows.map(mapBoletaDigitalOt)
}

export const fetchBoletaDigitalArchivo = async (rutaPdf: string): Promise<Blob> => {
  const { data } = await api.get('/boleta-digital/archivo', {
    params: { ruta: rutaPdf },
    responseType: 'blob',
  })
  return data
}

export const downloadBoletaDigitalArchivo = async (rutaPdf: string): Promise<Blob> => {
  const { data } = await api.get('/boleta-digital/archivo', {
    params: { ruta: rutaPdf, download: true },
    responseType: 'blob',
  })
  return data
}
