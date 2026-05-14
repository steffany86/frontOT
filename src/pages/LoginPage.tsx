import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import { useAuth } from '../context/AuthContext'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'

const LoginPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping, signIn, defaultPrivatePath, mustChangePassword } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [idSucursal, setIdSucursal] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sucursalesQuery = useQuery({
    queryKey: ['sucursales'],
    queryFn: fetchSucursales,
  })
  const sucursales = sucursalesQuery.data?.data ?? []

  const mutation = useMutation({
    mutationFn: signIn,
    onError: (err) => {
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
      setError(getApiErrorMessage(err, 'No se pudo iniciar sesion.'))
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
    if (!idSucursal) {
      setError('Selecciona una sucursal antes de continuar.')
      return
    }
    mutation.mutate({ usuario, password, idSucursal: Number(idSucursal) })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-16 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-12">
          <div className="glass-panel relative overflow-hidden p-8 lg:col-span-7 lg:p-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-600 to-cyan-400" />
            <span className="hidden items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 sm:inline-flex">
              Plataforma de Operaciones
            </span>
            <h1 className="mt-1 text-3xl font-semibold leading-tight text-slate-900 sm:mt-4 lg:text-4xl">
              <span className="sm:hidden">Bienvenido a Tigo Star</span>
              <span className="hidden sm:inline">Bienvenido a TigoStar</span>
            </h1>
            <p className="mt-3 hidden max-w-xl text-sm text-slate-600 lg:text-base sm:block">
              Controla ordenes de trabajo, materiales y cargos de usuario en un solo lugar.
            </p>

            <div className="mt-7 hidden gap-4 md:grid-cols-2 sm:grid">
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">Acceso seguro</p>
                <p className="mt-2 text-sm text-slate-600">La sesion se gestiona con token y expiracion automatica.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">Modulos integrados</p>
                <p className="mt-2 text-sm text-slate-600">OT, supervision, cuadrillas y llamadas de atencion.</p>
              </div>
            </div>

            <div className="mt-6 hidden gap-3 sm:grid-cols-3 sm:grid">
              <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-slate-900">24/7</p>
                <p className="text-xs text-slate-500">Disponibilidad</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-slate-900">1</p>
                <p className="text-xs text-slate-500">Panel centralizado</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-slate-900">100%</p>
                <p className="text-xs text-slate-500">Flujo operativo</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass-panel relative flex flex-col gap-5 p-7 sm:p-8 lg:col-span-5 lg:p-9"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-brand-600 to-cyan-500" />
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Iniciar sesion</h2>
              <p className="text-sm text-slate-500">Ingresa con tu usuario corporativo.</p>
            </div>
            <Field label="Sucursal">
              <select
                className="input-base"
                value={idSucursal}
                onChange={(event) => setIdSucursal(event.target.value)}
                disabled={sucursalesQuery.isLoading || mutation.isPending}
              >
                <option value="">
                  {sucursalesQuery.isLoading ? 'Cargando sucursales...' : 'Selecciona una sucursal'}
                </option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.idSucursal} value={String(sucursal.idSucursal)}>
                    {sucursal.sucursal}
                  </option>
                ))}
              </select>
            </Field>
            {sucursalesQuery.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                No se pudieron cargar las sucursales. Verifica la conexion.
              </div>
            ) : null}
            <Field label="Usuario">
              <input
                className="input-base"
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
                placeholder="Ej: central"
                disabled={mutation.isPending}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  className="input-base pr-11"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  disabled={mutation.isPending}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                  aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={mutation.isPending}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88M6.7 6.7A12.1 12.1 0 002.5 12s3.5 7 9.5 7a9.8 9.8 0 004.3-.98M17.3 17.3A12.1 12.1 0 0021.5 12s-3.5-7-9.5-7a9.8 9.8 0 00-4.3.98"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </Field>
            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
            <Button type="submit" disabled={mutation.isPending} className="mt-1 w-full">
              {mutation.isPending ? 'Validando...' : 'Ingresar'}
            </Button>

            <p className="text-center text-xs text-slate-500">
              Acceso restringido a personal autorizado.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
