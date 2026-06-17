import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import {
  asignarCentralSupervisor,
  asignarCentralTecnico,
  cambiarColaboradorBackupCentral,
  cambiarSupervisorMasivoCentral,
  crearCentralGrupo,
  fetchCentralGrupos,
  fetchCentralSupervisores,
  fetchCentralTecnicos,
  marcarSupervisorAusenteCentral,
  restaurarSupervisorCentral,
} from '../api/centralGruposApi'
import { useAuth } from '../context/AuthContext'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'

const CentralGruposPage = () => {
  const queryClient = useQueryClient()
  const { roleName, usuario } = useAuth()

  const [nombreGrupo, setNombreGrupo] = useState('')
  const [idGrupoSupervisor, setIdGrupoSupervisor] = useState('')
  const [idSupervisor, setIdSupervisor] = useState('')
  const [idGrupoTecnico, setIdGrupoTecnico] = useState('')
  const [idTecnico, setIdTecnico] = useState('')

  const [openCrearModal, setOpenCrearModal] = useState(false)
  const [openSupervisorModal, setOpenSupervisorModal] = useState(false)
  const [openTecnicoModal, setOpenTecnicoModal] = useState(false)
  const [openBackupModal, setOpenBackupModal] = useState(false)
  const [openCambioSupervisorModal, setOpenCambioSupervisorModal] = useState(false)
  const [idGrupoBackup, setIdGrupoBackup] = useState('')
  const [idTecnicoBackup, setIdTecnicoBackup] = useState('')
  const [supervisoresExpandido, setSupervisoresExpandido] = useState<string[]>([])
  const [idSupervisorOrigen, setIdSupervisorOrigen] = useState('')
  const [idSupervisorDestino, setIdSupervisorDestino] = useState('')
  const [modoCambioSupervisor, setModoCambioSupervisor] = useState<'todos' | 'especificos'>('todos')
  const [gruposSeleccionadosCambio, setGruposSeleccionadosCambio] = useState<string[]>([])
  const [supervisorEdicionNombre, setSupervisorEdicionNombre] = useState('')
  const [backupMode, setBackupMode] = useState<'ausente' | 'cambiar'>('ausente')

  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const normalizedRole = roleName.trim().toLowerCase().replace(/[\s_]+/g, '')
  const canManageGroups = ['central', 'backoffice', 'backofficev', 'backup', 'sistemas', 'admin'].includes(normalizedRole)

  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-central-grupos'],
    queryFn: fetchSucursales,
    enabled: canManageGroups,
    staleTime: 5 * 60 * 1000,
  })

  const loginSucursal = useMemo(() => {
    const idSucursal = usuario?.idSucursal
    const sucursales = sucursalesQuery.data?.data ?? []
    if (!idSucursal || sucursales.length === 0) return undefined
    const found = sucursales.find((item) => Number(item.idSucursal) === Number(idSucursal))
    const sucursal = found?.sucursal?.trim()
    return sucursal || undefined
  }, [sucursalesQuery.data, usuario?.idSucursal])

  const gruposQuery = useQuery({
    queryKey: ['central-grupos', 'listado', loginSucursal || 'auto'],
    queryFn: () => fetchCentralGrupos(loginSucursal),
    enabled: canManageGroups,
  })

  const supervisoresQuery = useQuery({
    queryKey: ['central-grupos', 'supervisores', loginSucursal || 'auto'],
    queryFn: () => fetchCentralSupervisores(loginSucursal),
    enabled: canManageGroups,
  })

  const tecnicosQuery = useQuery({
    queryKey: ['central-grupos', 'tecnicos', loginSucursal || 'auto'],
    queryFn: () => fetchCentralTecnicos(loginSucursal),
    enabled: canManageGroups,
  })

  const createMutation = useMutation({
    mutationFn: () => crearCentralGrupo({ nombre: nombreGrupo, sucursal: loginSucursal }),
    onSuccess: () => {
      setNombreGrupo('')
      setOpenCrearModal(false)
      setError(null)
      setFeedback('Grupo creado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo crear el grupo.'))
    },
  })

  const asignarSupervisorMutation = useMutation({
    mutationFn: () =>
      asignarCentralSupervisor({
        idGrupo: Number(idGrupoSupervisor),
        idUsuarioSupervisor: Number(idSupervisor),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenSupervisorModal(false)
      setIdGrupoSupervisor('')
      setIdSupervisor('')
      setError(null)
      setFeedback('Supervisor asignado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo asignar supervisor.'))
    },
  })

  const asignarTecnicoMutation = useMutation({
    mutationFn: () =>
      asignarCentralTecnico({
        idGrupo: Number(idGrupoTecnico),
        idUsuarioTecnico: Number(idTecnico),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenTecnicoModal(false)
      setIdGrupoTecnico('')
      setIdTecnico('')
      setError(null)
      setFeedback('Tecnico asignado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo asignar tecnico.'))
    },
  })


  const marcarAusenteMutation = useMutation({
    mutationFn: () =>
      marcarSupervisorAusenteCentral({
        idGrupo: Number(idGrupoBackup),
        idUsuarioTecnico: Number(idTecnicoBackup),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenBackupModal(false)
      setIdGrupoBackup('')
      setIdTecnicoBackup('')
      setError(null)
      setFeedback('Supervisor marcado como ausente y colaborador temporal asignado.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo marcar supervisor ausente.'))
    },
  })

  const cambiarColaboradorMutation = useMutation({
    mutationFn: () =>
      cambiarColaboradorBackupCentral({
        idGrupo: Number(idGrupoBackup),
        idUsuarioTecnico: Number(idTecnicoBackup),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenBackupModal(false)
      setIdGrupoBackup('')
      setIdTecnicoBackup('')
      setError(null)
      setFeedback('Colaborador temporal actualizado.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo cambiar colaborador temporal.'))
    },
  })

  const restaurarSupervisorMutation = useMutation({
    mutationFn: (grupoId: string) =>
      restaurarSupervisorCentral({
        idGrupo: Number(grupoId),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Supervisor restaurado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo restaurar supervisor.'))
    },
  })


  const cambiarSupervisorMasivoMutation = useMutation({
    mutationFn: async () => {
      const origen = supervisores.find((s) => s.idUsuarioSupervisor === idSupervisorOrigen)
      const destino = supervisores.find((s) => s.idUsuarioSupervisor === idSupervisorDestino)
      if (!origen || !destino) {
        throw new Error('Selecciona supervisor origen y supervisor destino.')
      }
      const gruposOrigen = grupos.filter((g) => (g.supervisor || '').trim().toLowerCase() === origen.supervisorACargo.trim().toLowerCase())
      const targetIds =
        modoCambioSupervisor === 'todos'
          ? gruposOrigen.map((g) => g.idGrupo)
          : gruposSeleccionadosCambio.filter((id) => gruposOrigen.some((g) => g.idGrupo === id))

      if (targetIds.length === 0) {
        throw new Error('No hay grupos para transferir.')
      }
      const result = await cambiarSupervisorMasivoCentral({
        idSupervisorOrigen: Number(origen.idUsuarioSupervisor),
        idSupervisorDestino: Number(destino.idUsuarioSupervisor),
        idGrupos: modoCambioSupervisor === 'todos' ? [] : targetIds.map((id) => Number(id)),
        sucursal: loginSucursal,
      })
      return { total: Number(result.actualizados ?? targetIds.length) }
    },
    onSuccess: (result) => {
      setOpenCambioSupervisorModal(false)
      setSupervisorEdicionNombre('')
      setIdSupervisorOrigen('')
      setIdSupervisorDestino('')
      setModoCambioSupervisor('todos')
      setGruposSeleccionadosCambio([])
      setError(null)
      setFeedback(`Supervisor actualizado en ${result.total} grupo(s).`)
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo cambiar supervisor en los grupos seleccionados.'))
    },
  })

  const grupos = gruposQuery.data ?? []
  const supervisores = supervisoresQuery.data ?? []
  const tecnicos = tecnicosQuery.data ?? []

  const tecnicoAsignadoEnGrupo = useMemo(() => {
    const map = new Map<string, { idGrupo: string; nombreGrupo: string }>()
    for (const grupo of grupos) {
      for (const tecnico of grupo.tecnicos) {
        const tecnicoId = tecnico.idUsuarioTecnico?.trim()
        if (!tecnicoId) continue
        if (!map.has(tecnicoId)) {
          map.set(tecnicoId, { idGrupo: grupo.idGrupo, nombreGrupo: grupo.nombre })
        }
      }
    }
    return map
  }, [grupos])

  const totalTecnicosAsignados = useMemo(
    () => grupos.reduce((acc, grupo) => acc + (grupo.tecnicos?.length ?? 0), 0),
    [grupos]
  )

  const grupoBackupSeleccionado = useMemo(() => grupos.find((g) => g.idGrupo === idGrupoBackup), [grupos, idGrupoBackup])
  const gruposPorSupervisor = useMemo(() => {
    const map = new Map<string, { supervisor: string; grupos: typeof grupos }>()
    for (const grupo of grupos) {
      const supervisor = (grupo.supervisor || 'Sin supervisor').trim() || 'Sin supervisor'
      const key = supervisor.toLowerCase()
      const current = map.get(key)
      if (!current) {
        map.set(key, { supervisor, grupos: [grupo] })
      } else {
        current.grupos.push(grupo)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.supervisor.localeCompare(b.supervisor, 'es', { sensitivity: 'base' }))
  }, [grupos])

  const gruposSupervisorOrigen = useMemo(() => {
    const origen = supervisores.find((s) => s.idUsuarioSupervisor === idSupervisorOrigen)
    if (!origen) return []
    return grupos.filter((g) => (g.supervisor || '').trim().toLowerCase() === origen.supervisorACargo.trim().toLowerCase())
  }, [grupos, supervisores, idSupervisorOrigen])

  const handleCrearGrupo = () => {
    if (!nombreGrupo.trim()) {
      setFeedback(null)
      setError('Nombre de grupo es requerido.')
      return
    }
    createMutation.mutate()
  }

  const handleAsignarSupervisor = () => {
    if (!idGrupoSupervisor || !idSupervisor) {
      setFeedback(null)
      setError('Selecciona grupo y supervisor.')
      return
    }
    asignarSupervisorMutation.mutate()
  }

  const handleAsignarTecnico = () => {
    if (!idGrupoTecnico || !idTecnico) {
      setFeedback(null)
      setError('Selecciona grupo y tecnico.')
      return
    }
    const asignado = tecnicoAsignadoEnGrupo.get(idTecnico)
    if (asignado && asignado.idGrupo !== idGrupoTecnico) {
      setFeedback(null)
      setError(`No se puede, este tecnico esta en otro grupo: ${asignado.nombreGrupo}.`)
      return
    }
    if (asignado && asignado.idGrupo === idGrupoTecnico) {
      setFeedback(null)
      setError('Ese tecnico ya pertenece al grupo seleccionado.')
      return
    }
    asignarTecnicoMutation.mutate()
  }


  const handleAbrirCambiarColaborador = (idGrupo: string) => {
    setBackupMode('cambiar')
    setIdGrupoBackup(idGrupo)
    setIdTecnicoBackup('')
    setOpenBackupModal(true)
  }

  const handleBackupSubmit = () => {
    if (!idGrupoBackup || !idTecnicoBackup) {
      setFeedback(null)
      setError('Selecciona grupo y tecnico temporal.')
      return
    }
    if (backupMode === 'ausente') {
      marcarAusenteMutation.mutate()
      return
    }
    cambiarColaboradorMutation.mutate()
  }

  const handleRestaurarSupervisor = (idGrupo: string, nombreGrupo: string) => {
    const ok = window.confirm(`Se restaurara el supervisor oficial del grupo "${nombreGrupo}". Deseas continuar?`)
    if (!ok) return
    restaurarSupervisorMutation.mutate(idGrupo)
  }


  const toggleGrupoCambio = (idGrupo: string) => {
    setGruposSeleccionadosCambio((current) =>
      current.includes(idGrupo) ? current.filter((id) => id !== idGrupo) : [...current, idGrupo]
    )
  }

  const toggleSupervisorExpandido = (supervisor: string) => {
    const key = supervisor.trim().toLowerCase()
    setSupervisoresExpandido((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    )
  }

  const abrirEditarSupervisor = (supervisor: string) => {
    const found = supervisores.find((s) => s.supervisorACargo.trim().toLowerCase() === supervisor.trim().toLowerCase())
    setSupervisorEdicionNombre(supervisor)
    setIdSupervisorOrigen(found?.idUsuarioSupervisor ?? '')
    setIdSupervisorDestino('')
    setModoCambioSupervisor('todos')
    setGruposSeleccionadosCambio([])
    setOpenCambioSupervisorModal(true)
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head rounded-[28px] border border-[#dbe5fa] bg-white/95 p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <h2>Grupos</h2>
        <p>
          Sucursal activa del login: {loginSucursal ?? 'Cargando...'}.
        </p>
      </div>

      {!canManageGroups ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No tienes permisos para gestionar grupos.
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

      <FormCard
        title="Acciones de grupos"
        description="Gestiona grupos existentes y sus responsables."
      >
        <div className="flex flex-wrap gap-3">
          <Button type="button" className="h-11 rounded-2xl px-5" onClick={() => setOpenSupervisorModal(true)} disabled={!canManageGroups || grupos.length === 0}>
            Asignar grupo existente a supervisor
          </Button>
        </div>
      </FormCard>

      <FormCard title="Lista de grupos y técnicos" description={`Grupos: ${grupos.length} | Técnicos asignados: ${totalTecnicosAsignados}`}>
        {gruposQuery.isLoading ? <p className="text-sm text-slate-500">Cargando grupos...</p> : null}

        {!gruposQuery.isLoading && grupos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin grupos creados.</p>
        ) : null}

        {!gruposQuery.isLoading && grupos.length > 0 ? (
          <div className="grid gap-5">
            {gruposPorSupervisor.map((bloque) => (
              <section
                key={`sup-${bloque.supervisor}`}
                className="overflow-hidden rounded-[24px] border border-[#dbe5fa] bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
              >
                <div className="flex w-full items-center justify-between gap-3 px-5 py-4">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => toggleSupervisorExpandido(bloque.supervisor)}
                  >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Supervisor</p>
                    <h3 className="text-4xl font-extrabold tracking-tight text-[#081a4b]">{bloque.supervisor}</h3>
                    <p className="mt-1 text-sm font-medium text-[#4b628d]">Grupos asignados: {bloque.grupos.length}</p>
                  </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!rounded-full !border-blue-200 !bg-white !px-4 !py-2 !text-xs !font-bold !text-blue-700 hover:!bg-blue-50"
                      onClick={() => abrirEditarSupervisor(bloque.supervisor)}
                    >
                      editar
                    </Button>
                    <button
                      type="button"
                      className="rounded-full bg-[#0b1f52] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#132c6c]"
                      onClick={() => toggleSupervisorExpandido(bloque.supervisor)}
                    >
                      {supervisoresExpandido.includes(bloque.supervisor.trim().toLowerCase()) ? 'Ocultar grupos' : 'Ver grupos'}
                    </button>
                  </div>
                </div>
                {supervisoresExpandido.includes(bloque.supervisor.trim().toLowerCase()) ? (
                <div className="grid gap-4 border-t border-[#e1e9fb] bg-[#f9fbff] px-5 py-5 lg:grid-cols-2">
                  {bloque.grupos.map((grupo) => (
                    <article key={grupo.idGrupo} className="rounded-2xl border border-[#dbe5fa] bg-white p-5 text-slate-900">
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Grupo</p>
                        <h4 className="text-lg font-bold text-slate-900">{grupo.nombre}</h4>
                      </div>
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">#{grupo.idGrupo}</span>
                    </div>
                    {grupo.supervisorAusente ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                        Supervisor ausente. Colaborador temporal: {grupo.tecnicoTemporalBackup ?? 'sin definir'}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    {grupo.tecnicos.length === 0 ? (
                      <p className="text-sm text-slate-500">- Sin integrantes</p>
                    ) : (
                      <ul className="grid gap-2">
                        {grupo.tecnicos.map((tecnico) => (
                          <li key={`${grupo.idGrupo}-${tecnico.idUsuarioTecnico}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                            {tecnico.tecnico}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                    {grupo.supervisorAusente ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleRestaurarSupervisor(grupo.idGrupo, grupo.nombre)}
                        disabled={restaurarSupervisorMutation.isPending}
                      >
                        restaurar
                      </Button>
                    ) : null}
                    {grupo.supervisorAusente ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleAbrirCambiarColaborador(grupo.idGrupo)}
                        disabled={grupo.tecnicos.length === 0}
                      >
                        cambiar colaborador
                      </Button>
                    ) : null}
                  </div>
                </div>
                    </article>
                  ))}
                </div>
                ) : null}
              </section>
            ))}
          </div>
        ) : null}
      </FormCard>

      <Modal
        open={openCrearModal}
        onClose={() => setOpenCrearModal(false)}
        title="Crear grupo"
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenCrearModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCrearGrupo} disabled={createMutation.isPending || !canManageGroups}>
              {createMutation.isPending ? 'Creando...' : 'Crear grupo'}
            </Button>
          </>
        }
      >
        <Field label="Nombre grupo">
          <input
            className="input-base"
            value={nombreGrupo}
            onChange={(event) => setNombreGrupo(event.target.value)}
            placeholder="Ej: Equipo Norte"
          />
        </Field>
      </Modal>

      <Modal
        open={openSupervisorModal}
        onClose={() => setOpenSupervisorModal(false)}
        title="Asignar supervisor"
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenSupervisorModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAsignarSupervisor} disabled={asignarSupervisorMutation.isPending || !canManageGroups}>
              {asignarSupervisorMutation.isPending ? 'Asignando...' : 'Asignar supervisor'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Grupo">
            <select className="input-base" value={idGrupoSupervisor} onChange={(event) => setIdGrupoSupervisor(event.target.value)}>
              <option value="">Selecciona grupo</option>
              {grupos.map((grupo) => (
                <option key={`supervisor-grupo-${grupo.idGrupo}`} value={grupo.idGrupo}>
                  {grupo.nombre} ({grupo.idGrupo})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Supervisor">
            <select className="input-base" value={idSupervisor} onChange={(event) => setIdSupervisor(event.target.value)}>
              <option value="">Selecciona supervisor</option>
              {supervisores.map((sup) => (
                <option key={`supervisor-${sup.idUsuarioSupervisor}`} value={sup.idUsuarioSupervisor}>
                  {sup.supervisorACargo} ({sup.idUsuarioSupervisor})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={openCambioSupervisorModal}
        onClose={() => {
          setOpenCambioSupervisorModal(false)
          setSupervisorEdicionNombre('')
        }}
        title={`Supervisor ausente: ${supervisorEdicionNombre || 'Cambiar supervisor'}`}
        maxWidthClass="max-w-3xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenCambioSupervisorModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => cambiarSupervisorMasivoMutation.mutate()} disabled={cambiarSupervisorMasivoMutation.isPending || !canManageGroups}>
              {cambiarSupervisorMasivoMutation.isPending ? 'Cambiando...' : 'Aplicar cambio'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Supervisor origen (ausente)">
            <select
              className="input-base"
              value={idSupervisorOrigen}
              onChange={(event) => {
                setIdSupervisorOrigen(event.target.value)
                setGruposSeleccionadosCambio([])
              }}
              disabled={Boolean(supervisorEdicionNombre)}
            >
              <option value="">Selecciona supervisor origen</option>
              {supervisores.map((sup) => (
                <option key={`origen-${sup.idUsuarioSupervisor}`} value={sup.idUsuarioSupervisor}>
                  {sup.supervisorACargo} ({sup.idUsuarioSupervisor})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supervisor destino">
            <select className="input-base" value={idSupervisorDestino} onChange={(event) => setIdSupervisorDestino(event.target.value)}>
              <option value="">Selecciona supervisor destino</option>
              {supervisores
                .filter((sup) => sup.idUsuarioSupervisor !== idSupervisorOrigen)
                .map((sup) => (
                  <option key={`destino-${sup.idUsuarioSupervisor}`} value={sup.idUsuarioSupervisor}>
                    {sup.supervisorACargo} ({sup.idUsuarioSupervisor})
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <div className="mt-3 grid gap-3">
          <Field label="Modo de transferencia">
            <select
              className="input-base"
              value={modoCambioSupervisor}
              onChange={(event) => setModoCambioSupervisor(event.target.value as 'todos' | 'especificos')}
            >
              <option value="todos">Todos los grupos del supervisor origen</option>
              <option value="especificos">Solo grupos especificos</option>
            </select>
          </Field>

          {modoCambioSupervisor === 'especificos' ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-700">Selecciona grupos del supervisor origen</p>
              {gruposSupervisorOrigen.length === 0 ? (
                <p className="text-sm text-slate-500">Sin grupos disponibles.</p>
              ) : (
                <div className="grid gap-2">
                  {gruposSupervisorOrigen.map((grupo) => (
                    <label key={`chk-${grupo.idGrupo}`} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={gruposSeleccionadosCambio.includes(grupo.idGrupo)}
                        onChange={() => toggleGrupoCambio(grupo.idGrupo)}
                      />
                      <span>
                        {grupo.nombre} ({grupo.idGrupo})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={openBackupModal}
        onClose={() => setOpenBackupModal(false)}
        title={backupMode === 'ausente' ? 'Supervisor ausente' : 'Cambiar colaborador temporal'}
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenBackupModal(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleBackupSubmit}
              disabled={marcarAusenteMutation.isPending || cambiarColaboradorMutation.isPending || !canManageGroups}
            >
              {marcarAusenteMutation.isPending || cambiarColaboradorMutation.isPending
                ? 'Guardando...'
                : backupMode === 'ausente'
                  ? 'Guardar ausente'
                  : 'Guardar colaborador'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Grupo">
            <select className="input-base" value={idGrupoBackup} onChange={(event) => setIdGrupoBackup(event.target.value)}>
              <option value="">Selecciona grupo</option>
              {grupos.map((grupo) => (
                <option key={`backup-grupo-${grupo.idGrupo}`} value={grupo.idGrupo}>
                  {grupo.nombre} ({grupo.idGrupo})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tecnico temporal" hint="Solo se muestran tecnicos asignados al grupo seleccionado.">
            <select className="input-base" value={idTecnicoBackup} onChange={(event) => setIdTecnicoBackup(event.target.value)}>
              <option value="">Selecciona tecnico</option>
              {(grupoBackupSeleccionado?.tecnicos ?? []).map((tec) => (
                <option key={`backup-tecnico-${tec.idUsuarioTecnico}`} value={tec.idUsuarioTecnico}>
                  {tec.tecnico} ({tec.idUsuarioTecnico})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={openTecnicoModal}
        onClose={() => setOpenTecnicoModal(false)}
        title="Asignar tecnico"
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenTecnicoModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAsignarTecnico} disabled={asignarTecnicoMutation.isPending || !canManageGroups}>
              {asignarTecnicoMutation.isPending ? 'Asignando...' : 'Asignar tecnico'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Grupo">
            <select className="input-base" value={idGrupoTecnico} onChange={(event) => setIdGrupoTecnico(event.target.value)}>
              <option value="">Selecciona grupo</option>
              {grupos.map((grupo) => (
                <option key={`tecnico-grupo-${grupo.idGrupo}`} value={grupo.idGrupo}>
                  {grupo.nombre} ({grupo.idGrupo})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tecnico" hint="Un tecnico solo puede pertenecer a un grupo activo.">
            <select className="input-base" value={idTecnico} onChange={(event) => setIdTecnico(event.target.value)}>
              <option value="">Selecciona tecnico</option>
              {tecnicos.map((tec) => {
                const grupoActual = tecnicoAsignadoEnGrupo.get(tec.idTecnico)
                const disabled = Boolean(grupoActual && grupoActual.idGrupo !== idGrupoTecnico)
                return (
                  <option key={`tecnico-${tec.idTecnico}`} value={tec.idTecnico} disabled={disabled}>
                    {tec.tecnico} ({tec.idTecnico}){grupoActual ? ` - ya asignado a ${grupoActual.nombreGrupo}` : ''}
                  </option>
                )
              })}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}

export default CentralGruposPage
