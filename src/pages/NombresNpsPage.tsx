import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faFilter, faPen, faRotate, faSearch, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons'
import { actualizarNombreNpsManual, fetchNombresNps, obtenerNombresNpsSucursal } from '../api/nombresNpsApi'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import { getApiErrorMessage } from '../services/httpClient'
import type { NombreNpsSucursal, NombreNpsVendedor } from '../types/nombresNps'

const SUCURSAL_ORDER = ['SantaCruz', 'Santa_Cruz', 'Tarija', 'Montero']

const sortSucursales = (items: NombreNpsSucursal[]): NombreNpsSucursal[] => {
  return [...items].sort((a, b) => {
    const ia = SUCURSAL_ORDER.findIndex((item) => item.toLowerCase() === a.sucursal.toLowerCase())
    const ib = SUCURSAL_ORDER.findIndex((item) => item.toLowerCase() === b.sucursal.toLowerCase())
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
}

const formatSucursal = (value: string): string => {
  const normalized = value.replace(/_/g, ' ').trim()
  if (normalized.toLowerCase() === 'santacruz') return 'Santa Cruz'
  return normalized || '-'
}

const scoreLabel = (value?: number): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return `${Math.round(value * 100)}%`
}

type SucursalSectionProps = {
  data: NombreNpsSucursal
  showOnlyMissing: boolean
  onToggleMissing: () => void
  onObtener: () => void
  onEditar: (row: NombreNpsVendedor, value: string) => void
  isUpdating: boolean
  savingKey?: string
}

const SucursalSection = ({ data, showOnlyMissing, onToggleMissing, onObtener, onEditar, isUpdating, savingKey }: SucursalSectionProps) => {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('')

  const rows = useMemo(() => {
    const base = showOnlyMissing ? data.rows.filter((item) => item.estado !== 'match') : data.rows
    return [...base].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [data.rows, showOnlyMissing])

  const startEdit = (row: NombreNpsVendedor) => {
    setEditingKey(`${row.idSucursal}-${row.idVendedor}`)
    setDraftValue(row.nombreNps || row.sugeridoNombreNps || '')
  }

  return (
    <FormCard
      title={formatSucursal(data.sucursal)}
      description={`${data.total} vendedores | ${data.conMatch} con match | ${data.sinMatch} sin match`}
      actions={
        <>
          <Button type="button" variant={showOnlyMissing ? 'primary' : 'secondary'} onClick={onToggleMissing} className="h-10 px-3">
            <FontAwesomeIcon icon={faFilter} />
            <span>Sin match</span>
          </Button>
          <Button type="button" onClick={onObtener} disabled={isUpdating} className="h-10 px-3">
            <FontAwesomeIcon icon={faSearch} />
            <span>{isUpdating ? 'Buscando...' : 'Obtener nombre NPS'}</span>
          </Button>
        </>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="w-24 px-3 py-2">ID</th>
              <th className="min-w-[260px] px-3 py-2">Nombre vendedor</th>
              <th className="min-w-[260px] px-3 py-2">Nombre NPS</th>
              <th className="w-28 px-3 py-2">Match</th>
              <th className="w-32 px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row: NombreNpsVendedor) => {
              const isMissing = row.estado !== 'match'
              const rowKey = `${row.idSucursal}-${row.idVendedor}`
              const isEditing = editingKey === rowKey
              const isSaving = savingKey === rowKey
              return (
                <tr key={rowKey} className={isMissing ? 'bg-rose-50/80' : 'hover:bg-slate-50'}>
                  <td className="px-3 py-2 font-semibold text-slate-700">{row.idVendedor}</td>
                  <td className="px-3 py-2 text-slate-800">{row.nombre}</td>
                  <td className={`px-3 py-2 font-medium ${isMissing ? 'text-rose-700' : 'text-slate-900'}`}>
                    {isEditing ? (
                      <div className="flex min-w-[320px] items-center gap-2">
                        <input
                          className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                          disabled={isSaving || !draftValue.trim()}
                          title="Guardar nombre NPS"
                          onClick={() => {
                            onEditar(row, draftValue.trim())
                            setEditingKey(null)
                          }}
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600"
                          title="Cancelar"
                          onClick={() => setEditingKey(null)}
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex min-w-[260px] items-center justify-between gap-3">
                        <span>{row.nombreNps || row.sugeridoNombreNps || '-'}</span>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                          title="Editar nombre NPS"
                          onClick={() => startEdit(row)}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{scoreLabel(row.score)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                        isMissing ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isMissing ? 'Sin match' : 'Match'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 bg-white px-4 py-8 text-sm text-slate-500">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>No hay vendedores para mostrar.</span>
          </div>
        ) : null}
      </div>
    </FormCard>
  )
}

const NombresNpsPage = () => {
  const queryClient = useQueryClient()
  const [missingOnly, setMissingOnly] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | undefined>(undefined)

  const nombresQuery = useQuery({
    queryKey: ['backoffice', 'nombres-nps'],
    queryFn: fetchNombresNps,
    staleTime: 120_000,
  })

  const obtenerMutation = useMutation({
    mutationFn: obtenerNombresNpsSucursal,
    onMutate: () => {
      setError(null)
      setSuccess(null)
    },
    onSuccess: (result) => {
      queryClient.setQueryData<NombreNpsSucursal[]>(['backoffice', 'nombres-nps'], (current) => {
        const base = current ?? []
        const found = base.some((item) => item.idSucursal === result.idSucursal)
        if (!found) return sortSucursales([...base, result])
        return sortSucursales(base.map((item) => (item.idSucursal === result.idSucursal ? result : item)))
      })
      setSuccess(`${formatSucursal(result.sucursal)}: ${result.actualizados} nombres actualizados, ${result.sinMatch} sin match.`)
    },
    onError: (mutationError) => {
      setError(getApiErrorMessage(mutationError, 'No se pudo obtener nombres NPS.'))
    },
  })

  const editarMutation = useMutation({
    mutationFn: actualizarNombreNpsManual,
    onMutate: (payload) => {
      setError(null)
      setSuccess(null)
      setSavingKey(`${payload.sucursal}-${payload.idVendedor}`)
    },
    onSuccess: (result) => {
      queryClient.setQueryData<NombreNpsSucursal[]>(['backoffice', 'nombres-nps'], (current) => {
        const base = current ?? []
        return base.map((sucursal) => {
          if (sucursal.idSucursal !== result.idSucursal) return sucursal
          let conMatch = 0
          let sinMatch = 0
          const rows = sucursal.rows.map((row) => {
            if (row.idVendedor !== result.idVendedor) {
              if (row.estado === 'match') conMatch += 1
              else sinMatch += 1
              return row
            }
            conMatch += 1
            return {
              ...row,
              nombreNps: result.nombreNps,
              nombreNpsActual: result.nombreNps,
              sugeridoNombreNps: result.nombreNps,
              estado: 'match',
              score: 1,
            }
          })
          return { ...sucursal, conMatch, sinMatch, rows }
        })
      })
      setSuccess(`Nombre NPS actualizado para vendedor ${result.idVendedor}.`)
    },
    onError: (mutationError) => {
      setError(getApiErrorMessage(mutationError, 'No se pudo actualizar el nombre NPS.'))
    },
    onSettled: () => setSavingKey(undefined),
  })

  const sucursales = useMemo(() => sortSucursales(nombresQuery.data ?? []), [nombresQuery.data])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Nombres NPS</h2>
          <p className="text-sm text-slate-500">Santa Cruz, Tarija y Montero.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => nombresQuery.refetch()} disabled={nombresQuery.isFetching}>
          <FontAwesomeIcon icon={faRotate} />
          <span>{nombresQuery.isFetching ? 'Actualizando...' : 'Actualizar'}</span>
        </Button>
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      {nombresQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Cargando nombres...</div>
      ) : null}

      {nombresQuery.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {getApiErrorMessage(nombresQuery.error, 'No se pudo cargar nombres NPS.')}
        </div>
      ) : null}

      <div className="space-y-4">
        {sucursales.map((sucursal) => (
          <SucursalSection
            key={sucursal.idSucursal}
            data={sucursal}
            showOnlyMissing={Boolean(missingOnly[sucursal.idSucursal])}
            onToggleMissing={() => setMissingOnly((prev) => ({ ...prev, [sucursal.idSucursal]: !prev[sucursal.idSucursal] }))}
            onObtener={() => obtenerMutation.mutate(sucursal.idSucursal)}
            onEditar={(row, value) =>
              editarMutation.mutate({
                sucursal: row.idSucursal,
                idVendedor: row.idVendedor,
                nombreNps: value,
              })
            }
            isUpdating={obtenerMutation.isPending && obtenerMutation.variables === sucursal.idSucursal}
            savingKey={savingKey}
          />
        ))}
      </div>
    </div>
  )
}

export default NombresNpsPage
