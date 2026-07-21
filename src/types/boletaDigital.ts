export type BoletaDigitalOt = {
  id: string
  nroTransaccion: string
  ot: string
  cliente: string
  tecnico: string
  fecha: string
  rutaPdf: string
  estado: string
  estadoArchivo: string
  rutaArchivoNoPdf: boolean
  rutaArchivoImagen: boolean
  otFisica: string
  comparacion: string
  previamenteModificada: boolean
  todoOk: boolean
  raw: Record<string, unknown>
}
