import { useAuth } from '../context/AuthContext'

export type { Tecnologia } from '../context/AuthContext'

/**
 * Tecnologia (HFC/DTH) de la sucursal de la sesion. null mientras carga o si no esta definida.
 * No se asume ningun valor por defecto: si falta el dato, el modulo debe tratarlo explicitamente.
 */
export const useTecnologia = () => {
  const { tecnologia } = useAuth()
  return { tecnologia, esDth: tecnologia === 'DTH', esHfc: tecnologia === 'HFC' }
}
