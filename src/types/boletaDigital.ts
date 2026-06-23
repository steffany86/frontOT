export type BoletaDigitalOt = {
  id: string
  ot: string
  cliente: string
  tecnico: string
  fecha: string
  rutaPdf: string
  estado: string
  raw: Record<string, unknown>
}
