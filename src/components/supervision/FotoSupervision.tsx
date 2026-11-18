import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { esRutaFotoSupervision, fetchSupervisionFoto } from '../../api/supervisionV2Api'

interface FotoSupervisionProps {
  /** Valor de la columna: ruta del archivo, base64 o data URL. */
  value?: string
  /** Fuente directa ya resuelta (data URL / http) cuando el valor no es una ruta. */
  directSrc: string | null
  alt: string
  className?: string
  onOpen?: (src: string) => void
}

/** Muestra una foto de supervision: si el valor es una ruta, la pide al backend con la sesion del usuario. */
const FotoSupervision = ({ value, directSrc, alt, className = '', onOpen }: FotoSupervisionProps) => {
  const ruta = !directSrc && esRutaFotoSupervision(value) ? (value ?? '').trim() : ''
  const { data: blob, isLoading, isError } = useQuery({
    queryKey: ['supervision-v2', 'foto', ruta],
    queryFn: () => fetchSupervisionFoto(ruta),
    enabled: Boolean(ruta),
    staleTime: 10 * 60_000,
    retry: false,
  })
  // La URL temporal se crea y se libera dentro del mismo efecto. Si se creara aparte (useMemo) y se revocara en la
  // limpieza, React en desarrollo ejecuta el efecto dos veces y dejaria una URL ya revocada (imagen rota).
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setObjectUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const src = directSrc ?? objectUrl
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-[10px] text-slate-500 ${className}`}>
        {ruta && isLoading ? 'Cargando...' : isError ? 'No disponible' : 'Sin imagen'}
      </div>
    )
  }
  return <img src={src} alt={alt} className={className} onClick={() => onOpen?.(src)} />
}

export default FotoSupervision
