import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faClipboardCheck } from '@fortawesome/free-solid-svg-icons'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import SupervisionPendienteModal from '../components/supervision/SupervisionPendienteModal'
import { fetchSupervisionesPendientes } from '../api/supervisionApi'
import { getApiErrorMessage } from '../services/httpClient'

const BackOfficeSupervisionPage = () => {
  const [modalOpen, setModalOpen] = useState(false)

  const pendientesQuery = useQuery({
    queryKey: ['supervision', 'pendientes-backoffice'],
    queryFn: () => fetchSupervisionesPendientes({ limite: 300 }),
  })

  const pendientes = pendientesQuery.data ?? []

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Supervisiones Pendientes</h2>
          <p className="text-sm text-slate-500">Gestiona las supervisiones agendadas para supervisores.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <FontAwesomeIcon icon={faPlus} />
          Agendar Supervision
        </Button>
      </div>

      <FormCard 
        title="Supervisiones Pendientes Agendadas" 
        description={`Total: ${pendientes.length} supervisiones pendientes`}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          {pendientesQuery.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {getApiErrorMessage(pendientesQuery.error, 'No se pudo cargar las supervisiones pendientes.')}
            </div>
          ) : pendientesQuery.isLoading ? (
            <p className="text-sm text-slate-600">Cargando pendientes...</p>
          ) : pendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FontAwesomeIcon icon={faClipboardCheck} className="mb-3 text-4xl text-amber-300" />
              <p className="text-sm font-medium text-slate-700">No hay supervisiones pendientes agendadas</p>
              <p className="mt-1 text-xs text-slate-500">Haz clic en "Agendar Supervision" para crear una nueva</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pendientes.map((sup) => (
                <div key={sup.idSupervision} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">ID Supervision</p>
                      <p className="text-sm font-bold text-slate-900">{sup.idSupervision}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      PENDIENTE
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-slate-500">Supervisor:</span>{' '}
                      <span className="text-slate-700">{sup.supervisor || sup.idSupervisor}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Tecnico:</span>{' '}
                      <span className="text-slate-700">{sup.tecnicoPrincipal || sup.idTecnicoPrincipal}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-500">Orden Trabajo:</span>{' '}
                      <span className="text-slate-700">{sup.ordenTrabajo}</span>
                    </div>
                    {sup.fechaRegistro && (
                      <div>
                        <span className="font-medium text-slate-500">Fecha:</span>{' '}
                        <span className="text-slate-700">{new Date(sup.fechaRegistro).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormCard>

      <SupervisionPendienteModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          pendientesQuery.refetch()
        }}
      />
    </div>
  )
}

export default BackOfficeSupervisionPage
