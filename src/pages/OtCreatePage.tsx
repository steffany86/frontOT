import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { createOt } from '../api/otApi'
import type { OtCreatePayload, OtCreateResult } from '../types/ot'
import { useSessionStore } from '../store/sessionStore'
import {
  fetchCatalogSucursales,
  fetchEstados,
  fetchRutas,
  fetchTecnicos,
  fetchTipoMaterial,
  fetchTiposServicio,
  type CatalogItem,
} from '../api/catalogApi'

type FieldErrors = Partial<Record<keyof OtCreatePayload, string>>

const ROLE_SUPERVISOR_ID = 9
const ROLE_TECNICO_ID = 8
const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = String(value).trim().toLowerCase()
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()

const readValue = (row: CatalogItem, keys: string[]): unknown => {
  const normalizedKeys = keys.map(normalizeKey)
  const rowEntries = Object.entries(row)
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [entryKey, entryValue] of rowEntries) {
    if (!normalizedKeys.includes(normalizeKey(entryKey))) continue
    if (entryValue !== undefined && entryValue !== null && entryValue !== '') return entryValue
  }
  return undefined
}

const readString = (row: CatalogItem, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const mapOptions = (items: CatalogItem[], idKeys: string[], labelKeys: string[]): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readValue(item, idKeys)
      if (id === undefined || id === null || id === '') return null
      const label = readString(item, labelKeys)
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const parseNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const OtCreatePage = () => {
  const session = useSessionStore((state) => state.session)
  const roleId = session?.idRol
  const roleName = normalizeText(session?.rol ?? '')
  const isSupervisor = roleId === ROLE_SUPERVISOR_ID || roleName === 'supervisor'
  const isTecnico = roleId === ROLE_TECNICO_ID || roleName === 'tecnico'

  const [idUsuario, setIdUsuario] = useState(isTecnico && session?.idUsuario ? String(session.idUsuario) : '')
  const [idRuta, setIdRuta] = useState('')
  const [idTipoServicio, setIdTipoServicio] = useState('')
  const [idTipoMaterial, setIdTipoMaterial] = useState('')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [idEstado, setIdEstado] = useState('')
  const [tieneObservacion, setTieneObservacion] = useState(false)
  const [observacion, setObservacion] = useState('')
  const [idSucursal, setIdSucursal] = useState(session?.idSucursal ? String(session.idSucursal) : '')
  const [nombreCliente, setNombreCliente] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const resolvedUserId = useMemo(() => {
    if (isTecnico && session?.idUsuario) return session.idUsuario
    return parseNumber(idUsuario)
  }, [idUsuario, isTecnico, session?.idUsuario])

  const tecnicosQuery = useQuery({
    queryKey: ['catalogos-tecnicos'],
    queryFn: fetchTecnicos,
    enabled: isSupervisor,
  })
  const tecnicos = useMemo(() => tecnicosQuery.data ?? [], [tecnicosQuery.data])

  const rutasQuery = useQuery({
    queryKey: ['catalogos-rutas', resolvedUserId ?? 'all'],
    queryFn: () => fetchRutas(resolvedUserId ?? undefined),
  })
  const rutas = useMemo(() => rutasQuery.data ?? [], [rutasQuery.data])

  const tiposServicioQuery = useQuery({
    queryKey: ['catalogos-tipo-servicio'],
    queryFn: fetchTiposServicio,
  })
  const tiposServicio = useMemo(() => tiposServicioQuery.data ?? [], [tiposServicioQuery.data])

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados'],
    queryFn: fetchEstados,
  })
  const estados = useMemo(() => estadosQuery.data ?? [], [estadosQuery.data])

  const sucursalesQuery = useQuery({
    queryKey: ['catalogos-sucursales'],
    queryFn: fetchCatalogSucursales,
  })
  const sucursales = useMemo(() => sucursalesQuery.data ?? [], [sucursalesQuery.data])

  const tipoServicioId = useMemo(() => parseNumber(idTipoServicio), [idTipoServicio])

  const tipoMaterialQuery = useQuery({
    queryKey: ['catalogos-tipo-material', tipoServicioId ?? 'none'],
    queryFn: () => fetchTipoMaterial(tipoServicioId ?? 0),
    enabled: Boolean(tipoServicioId),
  })
  const tiposMaterial = useMemo(() => tipoMaterialQuery.data ?? [], [tipoMaterialQuery.data])

  const tecnicoOptions = useMemo(
    () =>
      mapOptions(
        tecnicos,
        ['idUsuario', 'IdUsuario', 'Id_Vendedor', 'id_vendedor', 'idTecnico', 'Id_Tecnico', 'id', 'Id'],
        ['nombre', 'Nombre', 'usuario', 'Usuario', 'tecnico', 'Tecnico']
      ),
    [tecnicos]
  )
  const rutaOptions = useMemo(
    () =>
      mapOptions(
        rutas,
        ['idRuta', 'IdRuta', 'Id_Ruta', 'id_ruta', 'id', 'Id'],
        ['ruta', 'Ruta', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [rutas]
  )
  const tipoServicioOptions = useMemo(
    () =>
      mapOptions(
        tiposServicio,
        ['idTipoServicio', 'IdTipoServicio', 'Id_TipoServicio', 'id_tipo_servicio', 'id', 'Id'],
        ['tipoServicio', 'TipoServicio', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [tiposServicio]
  )
  const estadoOptions = useMemo(
    () =>
      mapOptions(
        estados,
        ['idEstado', 'IdEstado', 'Id_Estado', 'id_estado', 'id', 'Id'],
        ['estado', 'Estado', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [estados]
  )
  const sucursalOptions = useMemo(
    () =>
      mapOptions(
        sucursales,
        ['idSucursal', 'IdSucursal', 'Id_Sucursal', 'id_sucursal', 'id', 'Id'],
        ['sucursal', 'Sucursal', 'nombre', 'Nombre']
      ),
    [sucursales]
  )
  const tipoMaterialOptions = useMemo(
    () =>
      mapOptions(
        tiposMaterial,
        ['idTipoMaterial', 'IdTipoMaterial', 'Id_TipoMaterial', 'id_tipo_material', 'id', 'Id'],
        ['tipoMaterial', 'TipoMaterial', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [tiposMaterial]
  )

  useEffect(() => {
    if (isTecnico && session?.idUsuario) {
      setIdUsuario(String(session.idUsuario))
    }
    if (!idSucursal && session?.idSucursal) {
      setIdSucursal(String(session.idSucursal))
    }
  }, [idSucursal, isTecnico, session?.idSucursal, session?.idUsuario])

  useEffect(() => {
    setIdRuta('')
  }, [resolvedUserId])

  useEffect(() => {
    setIdTipoMaterial('')
  }, [idTipoServicio])

  const mutation = useMutation({
    mutationFn: createOt,
    onSuccess: (data) => {
      const { idVenta, ordenTrabajo } = data as OtCreateResult
      setSubmitError(null)
      if (idVenta && ordenTrabajo) {
        setSuccess(`OT creada. Id Venta: ${idVenta} | Nro OT: ${ordenTrabajo}`)
        return
      }
      if (idVenta) {
        setSuccess(`OT creada. Id Venta: ${idVenta}`)
        return
      }
      setSuccess('OT creada correctamente.')
    },
    onError: (err) => {
      setSuccess(null)
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; code?: string } | undefined
        if (payload?.message) {
          setSubmitError(payload.message)
          return
        }
      }
      setSubmitError('No se pudo crear la OT. Verifica los datos.')
    },
  })

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}
    const ruta = parseNumber(idRuta)
    if (ruta === null) nextErrors.idRuta = 'Ruta requerida.'

    const tipo = parseNumber(idTipoServicio)
    if (tipo === null) nextErrors.idTipoServicio = 'Tipo de servicio requerido.'

    if (resolvedUserId === null) nextErrors.idUsuario = 'Tecnico requerido.'

    if (tieneObservacion && !observacion.trim()) {
      nextErrors.observacion = 'Observacion requerida.'
    }

    return nextErrors
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(null)
    setSubmitError(null)
    const validation = validate()
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    const payload: OtCreatePayload = {
      idUsuario: resolvedUserId ?? 0,
      idRuta: Number(idRuta),
      idTipoServicio: Number(idTipoServicio),
      codigoCliente: parseNumber(codigoCliente) ?? undefined,
      idEstado: parseNumber(idEstado) ?? undefined,
      observacion: tieneObservacion ? observacion.trim() : undefined,
      tieneObservacion,
      idSucursal: parseNumber(idSucursal) ?? undefined,
      nombreCliente: nombreCliente.trim() || undefined,
    }

    mutation.mutate(payload)
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Crear OT</h2>
        <p className="text-sm text-slate-500">
          {isSupervisor ? 'Puedes crear OT para cualquier tecnico.' : isTecnico ? 'Solo puedes crear OT para ti.' : 'Crear OT.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormCard title="Datos principales" description="Completa la cabecera de la OT.">
          <div className="grid gap-4 md:grid-cols-2">
            {isSupervisor ? (
              <Field label="Tecnico" error={errors.idUsuario}>
                <select
                  className="input-base"
                  value={idUsuario}
                  onChange={(event) => setIdUsuario(event.target.value)}
                  disabled={tecnicosQuery.isLoading}
                >
                  <option value="">
                    {tecnicosQuery.isLoading ? 'Cargando tecnicos...' : 'Selecciona tecnico'}
                  </option>
                  {tecnicoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Tecnico asignado">
                <input className="input-base" value={session?.nombre ?? 'Tecnico'} disabled />
              </Field>
            )}

            <Field label="Ruta" error={errors.idRuta}>
              <select
                className="input-base"
                value={idRuta}
                onChange={(event) => setIdRuta(event.target.value)}
                disabled={rutasQuery.isLoading}
              >
                <option value="">
                  {rutasQuery.isLoading ? 'Cargando rutas...' : 'Selecciona ruta'}
                </option>
                {rutaOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de servicio" error={errors.idTipoServicio}>
              <select
                className="input-base"
                value={idTipoServicio}
                onChange={(event) => setIdTipoServicio(event.target.value)}
                disabled={tiposServicioQuery.isLoading}
              >
                <option value="">
                  {tiposServicioQuery.isLoading ? 'Cargando servicios...' : 'Selecciona servicio'}
                </option>
                {tipoServicioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de material">
              <select
                className="input-base"
                value={idTipoMaterial}
                onChange={(event) => setIdTipoMaterial(event.target.value)}
                disabled={!tipoServicioId || tipoMaterialQuery.isLoading}
              >
                <option value="">
                  {!tipoServicioId
                    ? 'Selecciona tipo de servicio primero'
                    : tipoMaterialQuery.isLoading
                      ? 'Cargando materiales...'
                      : 'Selecciona tipo de material'}
                </option>
                {tipoMaterialOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Estado">
              <select
                className="input-base"
                value={idEstado}
                onChange={(event) => setIdEstado(event.target.value)}
                disabled={estadosQuery.isLoading}
              >
                <option value="">{estadosQuery.isLoading ? 'Cargando estados...' : 'Selecciona estado'}</option>
                {estadoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sucursal">
              <select
                className="input-base"
                value={idSucursal}
                onChange={(event) => setIdSucursal(event.target.value)}
                disabled={sucursalesQuery.isLoading}
              >
                <option value="">
                  {sucursalesQuery.isLoading ? 'Cargando sucursales...' : 'Selecciona sucursal'}
                </option>
                {sucursalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Codigo Cliente">
              <input className="input-base" value={codigoCliente} onChange={(event) => setCodigoCliente(event.target.value)} />
            </Field>
            <Field label="Nombre Cliente">
              <input className="input-base" value={nombreCliente} onChange={(event) => setNombreCliente(event.target.value)} />
            </Field>
          </div>
        </FormCard>

        <FormCard
          title="Observacion"
          description="Marca si la OT tiene observacion para enviar el detalle."
          actions={
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={tieneObservacion}
                onChange={(event) => setTieneObservacion(event.target.checked)}
              />
              Tiene observacion
            </label>
          }
        >
          <Field label="Observacion" error={errors.observacion} hint="Obligatorio si activas la opcion.">
            <textarea
              className="input-base h-24 resize-none"
              value={observacion}
              onChange={(event) => setObservacion(event.target.value)}
              disabled={!tieneObservacion}
            />
          </Field>
        </FormCard>

        {submitError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{submitError}</div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Crear OT'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default OtCreatePage
