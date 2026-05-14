import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import Button from '../common/Button'
import Field from '../common/Field'
import Header from './Header'
import Modal from '../common/Modal'
import Sidebar from './Sidebar'
import { cerrarJornada, fetchCierreJornadaEstado } from '../../api/inicioJornadaApi'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../services/httpClient'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openCierreModal, setOpenCierreModal] = useState(false)
  const [codigoCliente, setCodigoCliente] = useState('')
  const [danoMaterial, setDanoMaterial] = useState<'SI' | 'NO'>('NO')
  const [observacionMaterial, setObservacionMaterial] = useState('')
  const [danoPersona, setDanoPersona] = useState<'SI' | 'NO'>('NO')
  const [observacionPersona, setObservacionPersona] = useState('')
  const [novedadesTrabajo, setNovedadesTrabajo] = useState<'SI' | 'NO'>('NO')
  const [observacionNovedades, setObservacionNovedades] = useState('')
  const [ubicacionGeoRef, setUbicacionGeoRef] = useState('')
  const [ubicacionResolviendo, setUbicacionResolviendo] = useState(false)
  const [cierreError, setCierreError] = useState<string | null>(null)
  const { roleId, roleName } = useAuth()
  const queryClient = useQueryClient()
  const roleNormalized = roleName.trim().toLowerCase()
  const isTecnico = roleId === 8 || roleNormalized === 'tecnico'

  const cierreEstadoQuery = useQuery({
    queryKey: ['tecnico-inicio-jornada', 'cierre-estado'],
    queryFn: fetchCierreJornadaEstado,
    enabled: isTecnico,
    refetchInterval: 30_000,
  })

  const cierreMutation = useMutation({
    mutationFn: () =>
      cerrarJornada({
        codigoCliente,
        danoMaterial,
        observacionMaterial: danoMaterial === 'SI' ? observacionMaterial : undefined,
        danoPersona,
        observacionPersona: danoPersona === 'SI' ? observacionPersona : undefined,
        novedadesTrabajo,
        observacionNovedades: novedadesTrabajo === 'SI' ? observacionNovedades : undefined,
        ubicacionGeoRef,
      }),
    onSuccess: () => {
      setCierreError(null)
      setOpenCierreModal(false)
      setCodigoCliente('')
      setObservacionMaterial('')
      setObservacionPersona('')
      setObservacionNovedades('')
      setUbicacionGeoRef('')
      queryClient.invalidateQueries({ queryKey: ['tecnico-inicio-jornada', 'cierre-estado'] })
    },
    onError: (error) => {
      setCierreError(getApiErrorMessage(error, 'No se pudo registrar cierre de jornada.'))
    },
  })

  const handleCerrarJornada = () => {
    if (!codigoCliente.trim() || !ubicacionGeoRef.trim()) {
      setCierreError('Codigo cliente y ubicacion son obligatorios.')
      return
    }
    if (danoMaterial === 'SI' && !observacionMaterial.trim()) {
      setCierreError('Debes completar observacion de dano material.')
      return
    }
    if (danoPersona === 'SI' && !observacionPersona.trim()) {
      setCierreError('Debes completar observacion de dano persona.')
      return
    }
    if (novedadesTrabajo === 'SI' && !observacionNovedades.trim()) {
      setCierreError('Debes completar observacion de novedades.')
      return
    }
    setCierreError(null)
    cierreMutation.mutate()
  }

  const normalizeOnlyDigits = (value: string): string => value.replace(/\D+/g, '')

  const resolverUbicacionAltaPrecision = () => {
    if (!navigator.geolocation) {
      setCierreError('Tu navegador no soporta geolocalizacion.')
      return
    }
    setUbicacionResolviendo(true)
    setCierreError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const acc = position.coords.accuracy
        setUbicacionGeoRef(`${lat.toFixed(7)},${lng.toFixed(7)} (±${Math.round(acc)}m)`)
        setUbicacionResolviendo(false)
      },
      (error) => {
        const msg = error.code === 1
          ? 'Permiso de ubicacion denegado.'
          : error.code === 2
            ? 'No se pudo determinar tu ubicacion.'
            : 'Tiempo de espera agotado al obtener ubicacion.'
        setCierreError(msg)
        setUbicacionResolviendo(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  const abrirModalCierre = () => {
    setOpenCierreModal(true)
    resolverUbicacionAltaPrecision()
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden lg:grid lg:grid-cols-[17rem_1fr]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <div className="px-4 pt-4 lg:px-7 lg:pt-6">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <main className="bento-main min-h-0 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
      {isTecnico && cierreEstadoQuery.data?.requiereCierre ? (
        <button
          type="button"
          onClick={abrirModalCierre}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700"
        >
          Cierre de jornada
        </button>
      ) : null}
      <Modal
        open={openCierreModal}
        onClose={() => setOpenCierreModal(false)}
        title="Cierre de jornada"
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenCierreModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCerrarJornada} disabled={cierreMutation.isPending}>
              {cierreMutation.isPending ? 'Guardando...' : 'Registrar cierre'}
            </Button>
          </>
        }
      >
        {cierreError ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{cierreError}</div> : null}
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
            <div className="space-y-2">
              <input className="input-base bg-slate-100" value={ubicacionGeoRef} readOnly />
              <Button
                type="button"
                variant="secondary"
                onClick={resolverUbicacionAltaPrecision}
                disabled={ubicacionResolviendo}
              >
                {ubicacionResolviendo ? 'Obteniendo ubicacion...' : 'Actualizar ubicacion'}
              </Button>
            </div>
          </Field>
          <Field label="Dano material">
            <select className="input-base" value={danoMaterial} onChange={(event) => setDanoMaterial(event.target.value as 'SI' | 'NO')}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Dano persona">
            <select className="input-base" value={danoPersona} onChange={(event) => setDanoPersona(event.target.value as 'SI' | 'NO')}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Novedades de trabajo">
            <select className="input-base" value={novedadesTrabajo} onChange={(event) => setNovedadesTrabajo(event.target.value as 'SI' | 'NO')}>
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
      </Modal>
    </div>
  )
}

export default MainLayout
