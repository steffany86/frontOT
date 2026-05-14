import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Button from '../common/Button'
import Field from '../common/Field'
import { registrarInicioJornada } from '../../api/inicioJornadaApi'
import { getApiErrorMessage } from '../../services/httpClient'

type SiNo = 'SI' | 'NO'

type InicioJornadaChecklistFormProps = {
  sucursal?: string
  idTecnico?: number
  nombreTecnico?: string
  onRegistered?: () => void
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const InicioJornadaChecklistForm = ({ sucursal, idTecnico, nombreTecnico, onRegistered }: InicioJornadaChecklistFormProps) => {
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [capacitado, setCapacitado] = useState<SiNo>('NO')
  const [charla, setCharla] = useState<SiNo>('NO')
  const [botiquin, setBotiquin] = useState<SiNo>('NO')
  const [extintor, setExtintor] = useState<SiNo>('NO')
  const [equipoEpp, setEquipoEpp] = useState<SiNo>('NO')
  const [estadoEpp, setEstadoEpp] = useState<SiNo>('NO')
  const [apr, setApr] = useState<SiNo>('NO')
  const [escalera, setEscalera] = useState<SiNo>('NO')
  const [anclaje, setAnclaje] = useState<SiNo>('NO')
  const [imagen, setImagen] = useState('')
  const [nombreImagen, setNombreImagen] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const elegirImagenInputRef = useRef<HTMLInputElement | null>(null)
  const tomarFotoInputRef = useRef<HTMLInputElement | null>(null)

  const registrarMutation = useMutation({
    mutationFn: () =>
      registrarInicioJornada({
        fechaVencimiento,
        capacitado,
        charla,
        botiquin,
        extintor,
        equipoEpp,
        estadoEpp,
        apr,
        escalera,
        anclaje,
        imagen,
        sucursal,
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Inicio de jornada registrado correctamente.')
      onRegistered?.()
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo registrar inicio de jornada.'))
    },
  })

  const handleImageChange = async (file: File | null) => {
    if (!file) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImagen(dataUrl)
      setNombreImagen(file.name || 'imagen.jpg')
    } catch {
      setError('No se pudo leer la imagen.')
    }
  }

  const handleSubmit = () => {
    if (!fechaVencimiento || !imagen) {
      setFeedback(null)
      setError('Fecha de vencimiento e imagen son obligatorios.')
      return
    }
    registrarMutation.mutate()
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-500">ID Tecnico: {idTecnico ?? '-'}</p>
      <p className="text-sm text-slate-500">Nombre tecnico: {nombreTecnico?.trim() || '-'}</p>
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

      <Field label="Encargado (Supervisor)">
        <input className="input-base bg-slate-100" value="Asignado automaticamente por conformacion diaria" readOnly />
      </Field>

      <Field label="Fecha de vencimiento extintor">
        <input className="input-base" type="date" value={fechaVencimiento} onChange={(event) => setFechaVencimiento(event.target.value)} />
      </Field>

      <Field label="¿Están capacitados y cuentan con curso de trabajo en Alturas?">
        <select className="input-base" value={capacitado} onChange={(event) => setCapacitado(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Reciben una charla semanal de Seguridad?">
        <select className="input-base" value={charla} onChange={(event) => setCharla(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Cuentan con botiquín de primeros auxilios?">
        <select className="input-base" value={botiquin} onChange={(event) => setBotiquin(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Cuentan con extintor de incendios?">
        <select className="input-base" value={extintor} onChange={(event) => setExtintor(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Cuentan con su equipo de protección personal EPP?">
        <select className="input-base" value={equipoEpp} onChange={(event) => setEquipoEpp(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Está en buen estado el EPP?">
        <select className="input-base" value={estadoEpp} onChange={(event) => setEstadoEpp(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Realizan un análisis preliminar del riesgo APR?">
        <select className="input-base" value={apr} onChange={(event) => setApr(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Las escaleras que utilizan se encuentran en buen estado?">
        <select className="input-base" value={escalera} onChange={(event) => setEscalera(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="¿Al momento de trabajar en altura se aseguran a un punto de anclaje?">
        <select className="input-base" value={anclaje} onChange={(event) => setAnclaje(event.target.value as SiNo)}>
          <option value="SI">SI</option>
          <option value="NO">NO</option>
        </select>
      </Field>
      <Field label="Foto de perfil con su equipo">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => elegirImagenInputRef.current?.click()}>
              Elegir imagen
            </Button>
            <Button type="button" variant="secondary" onClick={() => tomarFotoInputRef.current?.click()}>
              Tomar foto
            </Button>
          </div>
          <input
            ref={elegirImagenInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
          />
          <input
            ref={tomarFotoInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
          />
          <div className="text-xs text-slate-500">{nombreImagen ? `Imagen cargada: ${nombreImagen}` : 'Sin imagen seleccionada.'}</div>
        </div>
      </Field>

      <div className="mt-1 flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={registrarMutation.isPending}>
          {registrarMutation.isPending ? 'Guardando...' : 'Registrar inicio de jornada'}
        </Button>
      </div>
    </div>
  )
}

export default InicioJornadaChecklistForm
