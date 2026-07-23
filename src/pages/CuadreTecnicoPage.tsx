import { useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { fetchCuadreTecnicoActual, registrarCuadreTecnico } from '../api/cuadreTecnicoApi'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../services/httpClient'

const today = () => new Date().toISOString().slice(0, 10)

const CuadreTecnicoPage = () => {
  const { roleId, roleName } = useAuth()
  const queryClient = useQueryClient()
  const isTecnico = roleId === 8 || roleName.trim().toLowerCase() === 'tecnico'
  const [fecha, setFecha] = useState(today)
  const [rutaSeleccionada, setRutaSeleccionada] = useState<number | null>(null)
  const [observacion, setObservacion] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['cuadre-tecnico', fecha],
    queryFn: () => fetchCuadreTecnicoActual(fecha),
    enabled: isTecnico && Boolean(fecha),
  })

  const rutas = query.data?.rutas ?? []
  const ruta = useMemo(
    () => rutas.find((item) => item.idRuta === rutaSeleccionada) ?? rutas[0],
    [rutas, rutaSeleccionada],
  )

  const mutation = useMutation({
    mutationFn: () => registrarCuadreTecnico({ idRuta: ruta.idRuta, fecha, observacion: observacion.trim() || undefined }),
    onSuccess: () => {
      setFeedback('Cuadre registrado correctamente.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['cuadre-tecnico', fecha] })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, 'No se pudo registrar el cuadre.'))
      setFeedback(null)
    },
  })

  if (!isTecnico) {
    return <FormCard title="Cuadre de técnicos" description="Esta opción está disponible únicamente para técnicos."><div /></FormCard>
  }

  return (
    <div className="space-y-5">
      <FormCard title="Cuadre de técnicos" description="Revisa el saldo de tu grupo y registra el cuadre del día.">
        <div className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
          <Field label="Fecha"><input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" type="date" value={fecha} onChange={(event: ChangeEvent<HTMLInputElement>) => { setFecha(event.target.value); setRutaSeleccionada(null); setFeedback(null) }} disabled /></Field>
          <label className="block text-sm font-semibold text-slate-700">
            Grupo
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100" value={ruta?.idRuta ?? ''} onChange={(event) => setRutaSeleccionada(Number(event.target.value))} disabled>
              {rutas.map((item) => <option key={item.idRuta} value={item.idRuta}>{item.ruta}</option>)}
            </select>
          </label>
        </div>
      </FormCard>

      {query.isLoading && <FormCard title="Cargando" description="Consultando saldo y movimientos del grupo..."><div /></FormCard>}
      {query.isError && <FormCard title="No se pudo cargar" description={getApiErrorMessage(query.error, 'Revisa la conexión con el backend.')}><div /></FormCard>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>}

      {ruta && <>
        <FormCard hideHeader>
          <div className="max-h-[60vh] overflow-x-auto overflow-y-auto">
            <table className="min-w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-2">Producto</th><th className="p-2">Saldo</th><th className="p-2">Vendido</th><th className="p-2">Retirado</th><th className="p-2">Sobrante</th><th className="p-2">Total</th></tr></thead><tbody>{ruta.detalle.map((item, index) => <tr key={`${item.idProducto ?? 'producto'}-${index}`} className="border-b border-slate-100"><td className="p-2 font-semibold">{item.producto}</td><td className="p-2">{item.saldo}</td><td className="p-2">{item.vendido}</td><td className="p-2">{item.retirado}</td><td className="p-2">{item.sobrante}</td><td className="p-2">{item.totalVendido}</td></tr>)}</tbody></table>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field label="Observación"><input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={observacion} onChange={(event: ChangeEvent<HTMLInputElement>) => setObservacion(event.target.value)} placeholder="Opcional" /></Field><Button type="button" onClick={() => mutation.mutate()} disabled={!ruta.registroDisponible || mutation.isPending}>{mutation.isPending ? 'Registrando...' : 'Registrar cuadre'}</Button></div>
        </FormCard>
      </>}
    </div>
  )
}

export default CuadreTecnicoPage
