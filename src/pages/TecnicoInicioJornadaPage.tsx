import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { cerrarJornada, fetchCierreJornadaEstado, fetchInicioJornadaEstado, registrarInicioJornada } from '../api/inicioJornadaApi'
import { useAuth } from '../context/AuthContext'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'

type SiNo = 'SI' | 'NO'

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const TecnicoInicioJornadaPage = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { usuario, defaultPrivatePath, roleId, roleName } = useAuth()
  const roleNormalized = roleName.trim().toLowerCase()
  const isTecnico = roleId === 8 || roleNormalized === 'tecnico'

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
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [codigoCliente, setCodigoCliente] = useState('')
  const [danoMaterial, setDanoMaterial] = useState<SiNo>('NO')
  const [observacionMaterial, setObservacionMaterial] = useState('')
  const [danoPersona, setDanoPersona] = useState<SiNo>('NO')
  const [observacionPersona, setObservacionPersona] = useState('')
  const [novedadesTrabajo, setNovedadesTrabajo] = useState<SiNo>('NO')
  const [observacionNovedades, setObservacionNovedades] = useState('')
  const [ubicacionGeoRef, setUbicacionGeoRef] = useState('')
  const normalizeOnlyDigits = (value: string): string => value.replace(/\D+/g, '')

  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-tecnico-inicio-jornada-page'],
    queryFn: fetchSucursales,
    staleTime: 5 * 60 * 1000,
  })

  const loginSucursal = useMemo(() => {
    const idSucursal = usuario?.idSucursal
    const sucursales = sucursalesQuery.data?.data ?? []
    if (!idSucursal || sucursales.length === 0) return undefined
    const found = sucursales.find((item) => Number(item.idSucursal) === Number(idSucursal))
    return found?.sucursal?.trim() || undefined
  }, [sucursalesQuery.data, usuario?.idSucursal])

  const estadoQuery = useQuery({
    queryKey: ['tecnico-inicio-jornada', 'estado', loginSucursal || 'auto'],
    queryFn: () => fetchInicioJornadaEstado(loginSucursal),
  })

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
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Inicio de jornada registrado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['tecnico-inicio-jornada', 'estado'] })
      const fallback = defaultPrivatePath === '/tecnico/inicio-jornada' ? '/GestionOTs/lista' : defaultPrivatePath
      setTimeout(() => navigate(fallback, { replace: true }), 250)
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo registrar inicio de jornada.'))
    },
  })

  const cierreEstadoQuery = useQuery({
    queryKey: ['tecnico-inicio-jornada', 'cierre-estado'],
    queryFn: fetchCierreJornadaEstado,
  })

  const cierreMutation = useMutation({
    mutationFn: () =>
      cerrarJornada({
        codigoCliente: normalizeOnlyDigits(codigoCliente),
        danoMaterial,
        observacionMaterial: danoMaterial === 'SI' ? observacionMaterial : undefined,
        danoPersona,
        observacionPersona: danoPersona === 'SI' ? observacionPersona : undefined,
        novedadesTrabajo,
        observacionNovedades: novedadesTrabajo === 'SI' ? observacionNovedades : undefined,
        ubicacionGeoRef,
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Cierre de jornada registrado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['tecnico-inicio-jornada', 'cierre-estado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo registrar cierre de jornada.'))
    },
  })

  const handleImageChange = async (file: File | null) => {
    if (!file) return
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImagen(dataUrl)
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

  const handleCerrarJornada = () => {
    const codigoSoloNumeros = normalizeOnlyDigits(codigoCliente)
    if (!codigoSoloNumeros || !ubicacionGeoRef.trim()) {
      setFeedback(null)
      setError('Codigo cliente y ubicacion son obligatorios para cierre.')
      return
    }
    if (danoMaterial === 'SI' && !observacionMaterial.trim()) {
      setFeedback(null)
      setError('Debes completar observacion de dano material.')
      return
    }
    if (danoPersona === 'SI' && !observacionPersona.trim()) {
      setFeedback(null)
      setError('Debes completar observacion de dano persona.')
      return
    }
    if (novedadesTrabajo === 'SI' && !observacionNovedades.trim()) {
      setFeedback(null)
      setError('Debes completar observacion de novedades.')
      return
    }
    cierreMutation.mutate()
  }

  if (!isTecnico) {
    return (
      <div className="bento-page">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Este formulario es solo para tecnicos.
        </div>
      </div>
    )
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Inicio de Jornada - Trabajo en Alturas</h2>
        <p className="text-sm text-slate-500">Debes completar este checklist antes de iniciar actividades.</p>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

      <FormCard title="Datos generales" description={`ID Tecnico: ${estadoQuery.data?.idTecnico ?? usuario?.idUsuario ?? '-'}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Encargado (Supervisor)">
            <input className="input-base bg-slate-100" value="Asignado automaticamente por conformacion diaria" readOnly />
          </Field>
          <Field label="Fecha de vencimiento extintor">
            <input className="input-base" type="date" value={fechaVencimiento} onChange={(event) => setFechaVencimiento(event.target.value)} />
          </Field>
        </div>
      </FormCard>

      <FormCard title="Checklist obligatorio" description="Responde SI o NO en cada punto.">
        <div className="grid gap-4 md:grid-cols-2">
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
            <input className="input-base" type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)} />
            {imagen ? <p className="mt-2 text-xs text-emerald-700">Imagen cargada.</p> : null}
          </Field>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={handleSubmit} disabled={registrarMutation.isPending}>
            {registrarMutation.isPending ? 'Guardando...' : 'Registrar inicio de jornada'}
          </Button>
        </div>
      </FormCard>

      {cierreEstadoQuery.data?.requiereCierre ? (
        <FormCard title="Cierre de jornada" description="Completa este formulario para cerrar tu jornada del dia.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Codigo cliente">
              <input
                className="input-base"
                value={codigoCliente}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={20}
                onChange={(event) => setCodigoCliente(normalizeOnlyDigits(event.target.value))}
              />
            </Field>
            <Field label="Ubicacion georeferenciada">
              <input className="input-base" value={ubicacionGeoRef} onChange={(event) => setUbicacionGeoRef(event.target.value)} />
            </Field>
            <Field label="Dano material">
              <select className="input-base" value={danoMaterial} onChange={(event) => setDanoMaterial(event.target.value as SiNo)}>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </Field>
            <Field label="Dano persona">
              <select className="input-base" value={danoPersona} onChange={(event) => setDanoPersona(event.target.value as SiNo)}>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </Field>
            <Field label="Novedades de trabajo">
              <select className="input-base" value={novedadesTrabajo} onChange={(event) => setNovedadesTrabajo(event.target.value as SiNo)}>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
              </select>
            </Field>
            {danoMaterial === 'SI' ? (
              <Field label="Observacion dano material">
                <input className="input-base" value={observacionMaterial} onChange={(event) => setObservacionMaterial(event.target.value)} />
              </Field>
            ) : null}
            {danoPersona === 'SI' ? (
              <Field label="Observacion dano persona">
                <input className="input-base" value={observacionPersona} onChange={(event) => setObservacionPersona(event.target.value)} />
              </Field>
            ) : null}
            {novedadesTrabajo === 'SI' ? (
              <Field label="Observacion novedades">
                <input className="input-base" value={observacionNovedades} onChange={(event) => setObservacionNovedades(event.target.value)} />
              </Field>
            ) : null}
          </div>
          <div className="mt-4">
            <Button type="button" onClick={handleCerrarJornada} disabled={cierreMutation.isPending}>
              {cierreMutation.isPending ? 'Guardando cierre...' : 'Registrar cierre de jornada'}
            </Button>
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}

export default TecnicoInicioJornadaPage
