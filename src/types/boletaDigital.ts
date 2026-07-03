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
  otFisica: string
  comparacion: string
  previamenteModificada: boolean
  raw: Record<string, unknown>
}
