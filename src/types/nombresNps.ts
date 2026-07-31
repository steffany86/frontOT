export type NombreNpsEstado = 'match' | 'sin_match' | string

export type NombreNpsVendedor = {
  sucursal: string
  idSucursal: number
  idVendedor: number
  nombre: string
  nombreNps?: string
  nombreNpsActual?: string
  sugeridoNombreNps?: string
  score?: number
  estado: NombreNpsEstado
}

export type NombreNpsSucursal = {
  sucursal: string
  idSucursal: number
  total: number
  conMatch: number
  sinMatch: number
  actualizados: number
  rows: NombreNpsVendedor[]
}
