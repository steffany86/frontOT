import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import { fetchOtModificablesHoy } from '../api/otApi'
import { getApiErrorMessage } from '../services/httpClient'
import { useAuth } from '../context/AuthContext'

const normalizeRole = (value?: string): string =>
  (value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\s_]+/g, '')

const formatDateTime = (value: string): string => {
  if (!value) return '-'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('es-BO')
}

const ModificarOT = () => {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const role = normalizeRole(usuario?.rol)
  const allowed = usuario?.idRol === 8 || role === 'tecnico' || role === 'sistemas' || role === 'backofficev'

  const query = useQuery({
    queryKey: ['ot-modificar-hoy'],
    queryFn: fetchOtModificablesHoy,
    enabled: allowed,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  if (!allowed) {
    return null
  }

  const rows = query.data ?? []

  return (
    <div className="bento-page space-y-5">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Modificar OT</h2>
        <p className="text-sm text-slate-500">OT finalizadas hoy por FechaHoraDetalle. Solo materiales instalados no serializados.</p>
      </div>

      {query.isError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{getApiErrorMessage(query.error, 'No se pudieron cargar las OT.')}</div> : null}

      <FormCard title={`Finalizadas de hoy (${rows.length})`} description="Solo se muestran OT del grupo propietario de la sesión.">
        {query.isLoading ? <p className="text-sm text-slate-500">Cargando OT finalizadas...</p> : null}
        {!query.isLoading && rows.length === 0 ? <p className="text-sm text-slate-500">No hay OT finalizadas hoy para tu grupo.</p> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((ot) => (
            <article key={ot.idVenta} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-900">Cliente {ot.codigoCliente ?? '-'}</p>
                  <h3 className="text-xs font-bold uppercase text-slate-500">
                    OT {ot.ordenTrabajo || ot.idVenta}
                    {ot.tor ? <span className="ml-2 text-sky-700">· TOR {ot.tor}</span> : null}
                  </h3>
                  <p className="text-sm font-semibold text-slate-700">{ot.grupo || 'Grupo sin nombre'}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Finalizada</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">FechaHoraDetalle: {formatDateTime(ot.fechaHoraDetalle)}</p>
              <p className="mt-1 text-xs text-slate-500">Materiales editables: {ot.materiales.length}</p>
              {ot.bloqueo ? <p className="mt-2 text-xs font-semibold text-amber-700">{ot.bloqueo}</p> : null}
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => navigate('/GestionOTs/ModificarOTDetalle', { state: { idVenta: ot.idVenta } })}
              >
                Ver materiales
              </Button>
            </article>
          ))}
        </div>
      </FormCard>
    </div>
  )
}

export default ModificarOT
