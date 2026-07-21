import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type { BoletaDigitalOt } from '../types/boletaDigital'

const normalizeString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí'
  }
  return false
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
  const rutaPdf = normalizeString(readValue(row, ['RutaPdf', 'RutaPDF', 'rutaPdf', 'ruta_pdf', 'pdf']))
  const nroTransaccion = normalizeString(readValue(row, [
    'NroTransaccion',
    'nroTransaccion',
    'NroTrans',
    'nroTrans',
    'nventa',
    'NVenta',
    'NVENTA',
    'Id_Venta',
    'idVenta',
  ]))
  const id = normalizeString(readValue(row, ['Id', 'id', 'Id_Venta', 'idVenta', 'nventa', 'NVenta', 'NVENTA', 'NroTrans', 'nroTrans']))
  const ot = normalizeString(readValue(row, ['OrdenTrabajo', 'ordenTrabajo', 'OT', 'ot', 'NroOT', 'nroOT']))
  return {
    id,
    idBoCitaHistorial: normalizeString(readValue(row, ['Id_BO_CITA_MAKIRO_Historial', 'id_BO_CITA_MAKIRO_Historial', 'idBoCitaMakiroHistorial'])),
    nroTransaccion,
    ot,
    cliente: normalizeString(readValue(row, ['cliente_nro', 'Cliente_Nro', 'clienteNro', 'Cliente', 'cliente', 'CodigoCliente', 'codigoCliente'])),
    tecnico: normalizeString(readValue(row, ['Tecnico', 'tecnico', 'NombreTecnico', 'nombreTecnico', 'Usuario', 'usuario'])),
    fecha: normalizeString(readValue(row, ['Fecha', 'fecha', 'FechaRegistro', 'fechaRegistro', 'Fecha_Ejecucion', 'fechaEjecucion'])),
    rutaPdf,
    estado: normalizeString(readValue(row, ['Estado', 'estado'])),
    estadoArchivo: normalizeString(readValue(row, ['EstadoArchivo', 'estadoArchivo', 'Estado_Archivo', 'estado_archivo'])),
    rutaArchivoNoPdf: normalizeBoolean(readValue(row, ['RutaArchivoNoPdf', 'rutaArchivoNoPdf', 'ruta_archivo_no_pdf'])),
    rutaArchivoImagen: normalizeBoolean(readValue(row, ['RutaArchivoImagen', 'rutaArchivoImagen', 'ruta_archivo_imagen'])),
    otFisica: normalizeString(readValue(row, ['OT_FIsica', 'OT_FISICA', 'otFisica', 'ot_fisica', 'OtFisica'])),
    comparacion: normalizeString(readValue(row, ['Comparacion', 'comparacion', 'Comparación', 'comparación'])),
    previamenteModificada: normalizeBoolean(readValue(row, ['PreviamenteModificada', 'previamenteModificada'])),
    todoOk: normalizeBoolean(readValue(row, ['TodoOk', 'todoOk', 'todo_ok'])),
    raw: row,
  }
}

export const fetchBoletaDigitalOts = async (params?: {
  fechaInicio?: string
  fechaFin?: string
}): Promise<BoletaDigitalOt[]> => {
  const queryParams: Record<string, string> = {}
  if (params?.fechaInicio) queryParams.fechaInicio = params.fechaInicio
  if (params?.fechaFin) queryParams.fechaFin = params.fechaFin
  const { data } = await api.get('/boleta-digital/ots', { params: queryParams })
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

export const uploadBoletaDigitalArchivo = async (idVenta: string, archivo: File): Promise<unknown> => {
  const formData = new FormData()
  formData.append('id_venta', idVenta)
  formData.append('archivo', archivo, archivo.name)

  const { data } = await api.post('/boleta-digital/archivo-digital', formData)
  return data
}

export const markBoletaDigitalTodoOk = async (idVenta: string, todoOk = true): Promise<unknown> => {
  const formData = new FormData()
  formData.append('id_venta', idVenta)
  formData.append('todoOk', String(todoOk))

  const { data } = await api.post('/boleta-digital/todo-ok', formData)
  return data
}

export const confirmarBoletaDigitalBoleta = async (idVenta: string): Promise<unknown> => {
  const formData = new FormData()
  formData.append('id_venta', idVenta)

  const { data } = await api.post('/boleta-digital/confirmar-boleta', formData)
  return data
}
