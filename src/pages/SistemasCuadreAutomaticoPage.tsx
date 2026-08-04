import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { ejecutarCuadreAutomatico, fetchCuadreAutomaticoPreview, type CuadreAutomaticoResultado } from '../api/cuadreTecnicoApi'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().slice(0, 10)

const normalizeRole = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')

const quantity = (value: unknown): string => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed.toLocaleString('es-BO', { maximumFractionDigits: 2 }) : '0'
}

const statusClass = (estado: string): string => {
  const normalized = normalizeRole(estado)
  if (normalized === 'registrado' || normalized === 'listo') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (normalized === 'omitido') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (normalized === 'error') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

const SistemasCuadreAutomaticoPage = () => {
  const { usuario } = useAuth()
  const [fecha, setFecha] = useState(today)
  const [idSucursal, setIdSucursal] = useState(String(usuario?.idSucursal && usuario.idSucursal > 0 ? usuario.idSucursal : ''))
  const [resultado, setResultado] = useState<CuadreAutomaticoResultado[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSistemas = normalizeRole(usuario?.rol) === 'sistemas' || normalizeRole(usuario?.nombre) === 'sistemas'

  const sucursalesQuery = useQuery({
    queryKey: ['sucursales'],
    queryFn: fetchSucursales,
  })

  const previewQuery = useQuery({
    queryKey: ['cuadre-automatico-preview', fecha, idSucursal],
    queryFn: () => fetchCuadreAutomaticoPreview({ fecha, idSucursal: Number(idSucursal) }),
    enabled: isSistemas && Number(idSucursal) > 0,
    retry: false,
    staleTime: 0,
  })

  const ejecutarMutation = useMutation({
    mutationFn: () => ejecutarCuadreAutomatico({ fecha, idSucursal: Number(idSucursal) }),
    onSuccess: (data) => {
      setResultado(data.rutas ?? [])
      setError(null)
    },
    onError: (err) => {
      setResultado(null)
      setError(getApiErrorMessage(err, 'No se pudo ejecutar el cuadre automatico.'))
    },
  })

  const rutas = resultado ?? previewQuery.data?.rutas ?? []
  const resumen = useMemo(() => {
    const base = resultado ? null : previewQuery.data?.resumen
    if (base) return base
    return rutas.reduce<Record<string, number>>(
      (acc, row) => {
        acc.total += 1
        const estado = normalizeRole(row.estado)
        if (estado === 'registrado') acc.registrados += 1
        else if (estado === 'listo') acc.listos += 1
        else if (estado === 'omitido') acc.omitidos += 1
        else if (estado === 'error') acc.errores += 1
        return acc
      },
      { total: 0, registrados: 0, listos: 0, omitidos: 0, errores: 0 }
    )
  }, [previewQuery.data?.resumen, resultado, rutas])

  const handleExecute = () => {
    setError(null)
    setResultado(null)
    if (!idSucursal) {
      setError('Selecciona una sucursal.')
      return
    }
    const ok = window.confirm(`Ejecutar cuadre automatico para ${fecha}?`)
    if (ok) ejecutarMutation.mutate()
  }

  if (!isSistemas) {
    return (
      <FormCard title="Cuadre automatico" description="Acceso restringido.">
        <p className="text-sm font-semibold text-red-600">Solo el usuario sistemas puede ejecutar este proceso.</p>
      </FormCard>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Cuadre automatico</h2>
        <p className="text-sm text-slate-600">Ejecuta el proceso legacy de cuadres automaticos por fecha y sucursal.</p>
      </div>

      <FormCard title="Parametros">
        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end">
          <Field label="Fecha">
            <input className="input-base bg-white" type="date" value={fecha} onChange={(event) => { setFecha(event.target.value); setResultado(null) }} />
          </Field>
          <Field label="Sucursal">
            <select className="input-base bg-white" value={idSucursal} onChange={(event) => { setIdSucursal(event.target.value); setResultado(null) }}>
              <option value="">{sucursalesQuery.isLoading ? 'Cargando sucursales...' : 'Selecciona sucursal'}</option>
              {(sucursalesQuery.data?.data ?? []).map((sucursal) => (
                <option key={sucursal.idSucursal} value={String(sucursal.idSucursal)}>{sucursal.sucursal}</option>
              ))}
            </select>
          </Field>
          <Button type="button" onClick={handleExecute} disabled={ejecutarMutation.isPending || !idSucursal}>
            {ejecutarMutation.isPending ? 'Ejecutando...' : 'Ejecutar cuadre'}
          </Button>
        </div>
        {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {previewQuery.isError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getApiErrorMessage(previewQuery.error, 'No se pudo cargar el preview de rutas.')}
          </div>
        ) : null}
      </FormCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Rutas</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{quantity(resumen.total)}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase text-emerald-700">Listas</p>
          <p className="mt-1 text-2xl font-black text-emerald-800">{quantity(resumen.listos)}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase text-blue-700">Registradas</p>
          <p className="mt-1 text-2xl font-black text-blue-800">{quantity(resumen.registrados)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase text-amber-700">Omitidas</p>
          <p className="mt-1 text-2xl font-black text-amber-800">{quantity(resumen.omitidos)}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase text-red-700">Errores</p>
          <p className="mt-1 text-2xl font-black text-red-800">{quantity(resumen.errores)}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-bold text-slate-900">{resultado ? 'Resultado de ejecucion' : 'Preview de rutas'}</h3>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-3">Ruta</th>
                <th className="px-3 py-3">Vendedor</th>
                <th className="px-3 py-3 text-right">OT</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Mensaje</th>
                <th className="px-3 py-3 text-right">Cuadre</th>
              </tr>
            </thead>
            <tbody>
              {previewQuery.isLoading && !resultado ? (
                <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={6}>Consultando rutas...</td></tr>
              ) : previewQuery.isError && !resultado ? (
                <tr><td className="px-3 py-8 text-center text-red-600" colSpan={6}>No se pudo consultar rutas.</td></tr>
              ) : rutas.length ? rutas.map((row, index) => (
                <tr key={`${row.idRuta ?? 'ruta'}-${index}`} className="odd:bg-white even:bg-slate-50">
                  <td className="px-3 py-3 font-semibold text-slate-800">{row.idRuta} - {row.ruta}</td>
                  <td className="px-3 py-3 text-slate-700">{row.vendedor ?? '-'}</td>
                  <td className="px-3 py-3 text-right font-semibold">{quantity(row.cantidadOt)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.estado)}`}>{row.estado}</span>
                  </td>
                  <td className="min-w-[260px] px-3 py-3 text-slate-700">{row.mensaje || '-'}</td>
                  <td className="px-3 py-3 text-right font-semibold">{row.idCuadre ?? '-'}</td>
                </tr>
              )) : (
                <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={6}>Sin rutas pendientes para la fecha seleccionada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default SistemasCuadreAutomaticoPage
