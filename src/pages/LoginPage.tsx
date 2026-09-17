import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowRight,
  faClipboardList,
  faEye,
  faEyeSlash,
  faHeadset,
  faLocationDot,
  faMapLocationDot,
  faRightToBracket,
  faShieldHalved,
  faUser,
  faWrench,
} from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Modal from '../components/common/Modal'
import { useAuth } from '../context/AuthContext'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage, isMaintenanceError } from '../services/httpClient'
import { fetchBackendVersion } from '../api/versionApi'

const formatFechaBoliviana = (isoOrValue: string) => new Date(isoOrValue).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })

const formatFechaBackend = (fechaCompilacion: string | null | undefined) => {
  if (!fechaCompilacion) return null
  const date = new Date(`${fechaCompilacion.replace(' ', 'T')}-04:00`)
  if (Number.isNaN(date.getTime())) return null
  return formatFechaBoliviana(date.toISOString())
}

const LoginPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping, signIn, defaultPrivatePath, mustChangePassword } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [idSucursal, setIdSucursal] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)

  const sucursalesQuery = useQuery({
    queryKey: ['sucursales'],
    queryFn: fetchSucursales,
  })
  const sucursales = sucursalesQuery.data?.data ?? []

  const backendVersionQuery = useQuery({
    queryKey: ['backend-version'],
    queryFn: fetchBackendVersion,
    staleTime: 300_000,
    retry: false,
  })
  const backendFecha = formatFechaBackend(backendVersionQuery.data?.fechaCompilacion)

  const mutation = useMutation({
    mutationFn: signIn,
    onError: (err) => {
      if (isMaintenanceError(err)) {
        setMaintenanceMessage(getApiErrorMessage(err, 'CAMBIOS DE SISTEMAS EN PROCESO'))
        setError(null)
        return
      }
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        const payload = err.response?.data as { code?: string; message?: string } | undefined
        const text = `${payload?.code ?? ''} ${payload?.message ?? ''}`.toLowerCase()
        if (text.includes('sucursal')) {
          setError('No tienes acceso a esa sucursal.')
          return
        }
        setError('Usuario y/o Password incorrecto.')
        return
      }
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError('Selecciona una sucursal valida.')
        return
      }
      setError(getApiErrorMessage(err, 'No se pudo iniciar sesión.'))
    },
  })

  useEffect(() => {
    if (isAuthenticated && !isBootstrapping) {
      navigate(mustChangePassword ? '/cambiar-password' : defaultPrivatePath, { replace: true })
    }
  }, [defaultPrivatePath, isAuthenticated, isBootstrapping, mustChangePassword, navigate])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMaintenanceMessage(null)
    if (!idSucursal) {
      setError('Selecciona una sucursal antes de continuar.')
      return
    }
    mutation.mutate({ usuario, password, idSucursal: Number(idSucursal) })
  }

  const features = [
    { icon: faWrench, title: 'Instalaciones', description: 'Registra y gestiona instalaciones en campo con facilidad.' },
    { icon: faHeadset, title: 'Soporte e incidencias', description: 'Atiende y da seguimiento a incidencias de clientes.' },
    { icon: faClipboardList, title: 'Órdenes de trabajo', description: 'Consulta y administra órdenes asignadas en campo.' },
    { icon: faMapLocationDot, title: 'Cobertura por sucursal', description: 'Revisa la cobertura y disponibilidad de servicios por sucursal.' },
  ]

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8faff] px-4 py-6 lg:px-6 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f8faff]/45 via-[#f5f8ff]/35 to-[#eef4ff]/45" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.02)_1px,transparent_0)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/ImangeFondoLogin.png')] bg-cover bg-[0%_center] bg-no-repeat opacity-[0.62]" />

      <div className="relative mx-auto w-full max-w-[1280px] p-0 lg:p-0">
        <div className="mb-6 flex flex-col items-center text-center lg:hidden">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1440ad] text-2xl text-white shadow-[0_12px_26px_rgba(37,99,235,0.35)]">
            <FontAwesomeIcon icon={faShieldHalved} />
          </span>
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#10245a]">
            Acceso Técnico <span className="text-[#1d4ed8]">Tigo Hogar</span>
          </h1>
          <p className="mt-1.5 max-w-xs text-sm text-[#60739b]">Plataforma interna para técnicos y operadores</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="hidden rounded-[24px] bg-transparent lg:order-1 lg:block lg:p-10">
            <div className="flex items-center gap-3">
              <img src="/LogoMakiropng.png" alt="Tigo" className="h-14 w-auto" />
              <div className="border-l border-[#d6e0f6] pl-4">
                <p className="text-sm font-semibold leading-tight text-[#102a64]">Plataforma Técnica</p>
                <p className="text-xs font-medium text-[#4f6698]">Tigo Bolivia</p>
              </div>
            </div>

            <h1 className="mt-8 max-w-[420px] text-[56px] font-extrabold leading-[1.04] tracking-[-0.02em] text-[#10245a]">
              Acceso Técnico
              <span className="block text-[#1d4ed8]">Tigo Hogar</span>
            </h1>
            <p className="mt-4 max-w-[390px] text-[15px] leading-relaxed text-[#60739b]">
              Plataforma interna para técnicos y operadores. Gestiona instalaciones, incidencias y operaciones en campo de forma eficiente.
            </p>
            <div className="mt-6 h-1 w-16 rounded-full bg-[#2563eb]" />

            <div className="mt-10 grid gap-2.5 md:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="min-h-[94px] rounded-[14px] border border-[#dbe5fa] bg-white/35 p-3 shadow-[0_6px_14px_rgba(37,99,235,0.07)]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dbe6ff] bg-[#eef4ff] text-xs text-[#2563eb]">
                      <FontAwesomeIcon icon={feature.icon} />
                    </span>
                    <span className="mt-1 text-sm text-[#163e97]">
                      <FontAwesomeIcon icon={faArrowRight} />
                    </span>
                  </div>
                  <h3 className="mt-2 text-[15px] font-bold leading-tight text-[#162c60]">{feature.title}</h3>
                  <p className="mt-1 text-xs leading-snug text-[#5d729d]">{feature.description}</p>
                </article>
              ))}
            </div>

          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#dbe4f9] bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.08)] lg:order-2 lg:rounded-[24px] lg:bg-white/94 lg:p-10">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] lg:hidden" />
            <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-5 sm:p-7 lg:p-0">
              <div className="mb-2 text-center lg:hidden">
                <h2 className="text-base font-extrabold text-[#0f2454]">Ingresa tus credenciales</h2>
              </div>

              <div className="mb-6 hidden items-center gap-4 lg:flex">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eaf1ff] text-2xl text-[#1d4ed8]">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#1d4ed8]">Inicio de sesión</p>
                  <h2 className="text-xl font-extrabold leading-[1.2] tracking-[-0.01em] text-[#0f2454]">Acceso para técnicos</h2>
                  <p className="mt-1 text-xs text-[#687da6]">Ingresa tus credenciales corporativas</p>
                </div>
              </div>

              <Field label="Sucursal">
                <div className="relative">
                  <FontAwesomeIcon icon={faLocationDot} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5f76a5]" />
                  <select className="input-base bg-white pl-11" value={idSucursal} onChange={(event) => setIdSucursal(event.target.value)} disabled={sucursalesQuery.isLoading || mutation.isPending}>
                    <option value="">{sucursalesQuery.isLoading ? 'Cargando sucursales...' : 'Selecciona tu sucursal'}</option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.idSucursal} value={String(sucursal.idSucursal)}>{sucursal.sucursal}</option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Usuario">
                <div className="relative">
                  <FontAwesomeIcon icon={faUser} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5f76a5]" />
                  <input className="input-base bg-white pl-11" value={usuario} onChange={(event) => setUsuario(event.target.value)} placeholder="Ingresa tu usuario" disabled={mutation.isPending} />
                </div>
              </Field>

              <Field label="Contraseña">
                <div className="relative">
                  <FontAwesomeIcon icon={faShieldHalved} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5f76a5]" />
                  <input className="input-base bg-white pl-11 pr-12" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" disabled={mutation.isPending} />
                  <button type="button" className="absolute inset-y-0 right-0 flex items-center px-4 text-[#4c6697] transition hover:text-[#1d4ed8] disabled:cursor-not-allowed disabled:text-slate-300" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword((prev) => !prev)} disabled={mutation.isPending}>
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </Field>

              {sucursalesQuery.isError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">No se pudieron cargar las sucursales. Verifica la conexión.</div> : null}
              {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}

              <label className="inline-flex items-center gap-2 pt-1 text-sm font-medium text-[#657ca8]">
                <input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} className="h-4 w-4 rounded border-[#b8c9ec] text-[#1d4ed8]" />
                Recordarme en este dispositivo
              </label>

              <Button type="submit" disabled={mutation.isPending} className="mt-1 h-14 w-full rounded-2xl bg-[#0f4fe3] text-lg font-semibold hover:bg-[#0a43c8]">
                <FontAwesomeIcon icon={faRightToBracket} />
                {mutation.isPending ? 'Validando...' : 'Iniciar sesion'}
              </Button>

            </form>
          </section>
        </div>

        <div className="pt-4 text-center text-xs text-[#6f82aa] sm:pt-3 sm:text-sm">© 2024 Tigo Bolivia S.A. | Uso exclusivo para personal autorizado</div>
        <div className="pt-1 text-center text-[10px] text-[#a7b3cf] sm:text-xs">
          Version Front: {formatFechaBoliviana(__BUILD_TIME__)} &nbsp;|&nbsp; Back: {backendFecha ?? (backendVersionQuery.isLoading ? 'cargando...' : 'no disponible')}
        </div>
      </div>
      <Modal
        open={Boolean(maintenanceMessage)}
        title="CAMBIOS EN PROCESO"
        onClose={() => setMaintenanceMessage(null)}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-3 text-center">
          <p className="text-xl font-black uppercase tracking-wide text-red-600">CAMBIOS EN PROCESO</p>
          <p className="text-sm font-semibold text-slate-700">{maintenanceMessage || 'CAMBIOS DE SISTEMAS EN PROCESO'}</p>
          <p className="text-xs text-slate-500">Intenta nuevamente cuando sistemas termine los cambios.</p>
        </div>
      </Modal>
    </div>
  )
}

export default LoginPage
