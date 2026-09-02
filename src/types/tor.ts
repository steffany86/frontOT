export type TorRegistroPayload = {
  detalle: string
  tor: string
  tipoServicio: string
}

export type TorRegistroResponse = {
  id: number
  usuarioRegistra: string
}

export type TorRegistrado = {
  id: string
  nroTrans: string
  detalle: string
  tor: string
  tipoServicio: string
  usuarioRegistra: string
}
