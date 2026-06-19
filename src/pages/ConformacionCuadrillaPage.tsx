import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import Tabs from '../components/common/Tabs'
import Table from '../components/common/Table'
import type { Column } from '../components/common/Table'
import type { CatalogItem } from '../api/catalogApi'
import {
  fetchConformacionActividades,
  fetchConformacionAuxiliares,
  fetchConformacionCuadrillaById,
  fetchConformacionCuadrillaConfirmadas,
  fetchConformacionCuadrillaPendientes,
  fetchConformacionDigitadores,
  fetchConformacionGrupos,
  fetchConformacionSalesforce,
  fetchConformacionSucursales,
  fetchConformacionSupervisores,
  fetchConformacionTecnicoDetalle,
  fetchConformacionTecnicos,
  fetchConformacionVehiculos,
  guardarConformacionCuadrillaConfirmada,
  guardarRelacionCuadrilla,
  updateConformacionCuadrilla,
} from '../api/conformacionCuadrillaApi'
import type {
  ConformacionCuadrillaInput,
  ConformacionCuadrillaRecord,
  ConformacionCuadrillaRelacionPayload,
} from '../types/conformacionCuadrilla'
import { formatDate, todayISO } from '../utils/dates'
import { useSessionStore } from '../store/sessionStore'
import { useAuth } from '../context/AuthContext'

type CuadrillaModalMode = 'view' | 'edit'
type CuadrillaListTab = 'general' | 'confirmadas'

type EditableRow = {
  id?: number
  fecha: string
  estado: string
  actividad: string
  idTecnico: string
  cuentaSf: string
  salesforce: string
  habilidad: string
  vehiculo: string
  grupo: string
  almacen: string
  grupoDigitacion: string
  idUsuarioDigitador: string
  digitador: string
  tecnico: string
  idTecnicoAuxiliar: string
  auxiliar: string
  idUsuarioSupervisor: string
  supervisorACargo: string
  sucursal: string
  observacion: string
  idUsuarioRegistra: string
}

type RowIssue = {
  hasIssue: boolean
  idConflict: boolean
  invalidEstado: boolean
  missingFields: string[]
  duplicateVehiculo?: boolean
  duplicateTecnico?: boolean
  duplicateAuxiliar?: boolean
}

type SelectOption = {
  value: string
  label: string
  item: CatalogItem
}

type UpdateTarget = 'web' | 'dbordenres'

type ReassignmentField = 'vehiculo' | 'auxiliar'

type AssignmentTransfer = {
  field: ReassignmentField
  sourceId: number
  sourceRecord: ConformacionCuadrillaRecord
  sourceTarget: UpdateTarget
  sourceGroupLabel: string
  sourceTecnicoLabel: string
  sourceDisplayValue: string
  selectedValue: string
}

type PendingReassignmentPrompt = {
  field: ReassignmentField
  rowIndex: number
  selectedValue: string
  selectedLabel: string
  source: AssignmentTransfer
}

type PendingUpdateItem = {
  id: number
  payload: ConformacionCuadrillaInput
  target: UpdateTarget
}

type EditAssignmentSnapshot = {
  idRuta: number | null
  idTecnicoAuxiliar: string
  auxiliar: string
  idUsuarioDigitador: string
  digitador: string
  sucursal: string
}

type PendingConfirmation =
  {
    mode: 'create'
    payload: { filas: ConformacionCuadrillaInput[] }
    confirmedKeys: string[]
    reassignments?: AssignmentTransfer[]
    updateItems?: PendingUpdateItem[]
  }

const CUADRILLA_LIST_TABS: { id: CuadrillaListTab; label: string }[] = [
  { id: 'general', label: 'General (pendientes)' },
  { id: 'confirmadas', label: 'Confirmadas' },
]

const MENU_NAME_CONFORMACION_CUADRILLAS = 'tsm_conformacioncuadrillas'
const LEGACY_MENU_ID_CONFORMACION_CUADRILLAS = 1
const LEGACY_MENU_ID_CONFORMACION_CUADRILLAS_OLD = 62
const ESTADO_OPTIONS = ['ACTIVO', 'AUSENTE'] as const
const HABILIDAD_OPTIONS = ['RECLAMOS', 'INSTALACION'] as const
const CONFIRMAR_MARCADO_MODAL_TEXT =
  '\u00BFDesea confirmar los datos del marcado de hoy? Esta acci\u00F3n no se podr\u00E1 confirmar nuevamente.'
const detalleApiDisponible = import.meta.env.VITE_CUADRILLA_DETALLE_API_AVAILABLE !== 'false'

const normalizeLookupKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '')
const normalizeMenuPermissionKey = (key: string): string => normalizeLookupKey(key)
const AUXILIAR_NONE_LABEL_KEYS = new Set(['ninguno', 'sinasignar', 'noasignado', 'auxiliarseleccionado', 'seleccionaauxiliar'])
const DIGITADOR_NONE_LABEL_KEYS = new Set(['ninguno', 'sinasignar', 'noasignado', 'digitadorseleccionado', 'seleccionadigitador'])

const normalizeAuxiliarComparableId = (value: string | number | null | undefined): string => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  return String(Math.trunc(parsed))
}

const isAuxiliarNoneLabel = (value: string | null | undefined): boolean => {
  const key = normalizeLookupKey(String(value ?? ''))
  return key === '' || AUXILIAR_NONE_LABEL_KEYS.has(key)
}

const normalizeAuxiliarComparableLabel = (value: string | null | undefined): string => {
  if (isAuxiliarNoneLabel(value)) return ''
  return normalizeLookupKey(String(value ?? ''))
}

const sanitizeAuxiliarLabel = (value: string | null | undefined): string => {
  if (isAuxiliarNoneLabel(value)) return ''
  return String(value ?? '').trim()
}

const normalizeDigitadorComparableId = (value: string | number | null | undefined): string => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  return String(Math.trunc(parsed))
}

const isDigitadorNoneLabel = (value: string | null | undefined): boolean => {
  const key = normalizeLookupKey(String(value ?? ''))
  return key === '' || DIGITADOR_NONE_LABEL_KEYS.has(key)
}

const normalizeDigitadorComparableLabel = (value: string | null | undefined): string => {
  if (isDigitadorNoneLabel(value)) return ''
  return normalizeLookupKey(String(value ?? ''))
}

const sanitizeDigitadorLabel = (value: string | null | undefined): string => {
  if (isDigitadorNoneLabel(value)) return ''
  return String(value ?? '').trim()
}

const normalizeTecnicoComparableId = (value: string | number | null | undefined): string => {
  const parsed = Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  return String(Math.trunc(parsed))
}

const normalizeBranchName = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

const isSucreBranch = (value: string): boolean => normalizeBranchName(value) === 'sucre'
const isSantaCruzBranch = (value: string): boolean => {
  const normalized = normalizeBranchName(value).replace(/[\s_]+/g, '')
  return normalized === 'santacruz' || normalized === 'scz'
}

const toSucursalActiva = (value: string): string => {
  const normalizedValue = value.trim()
  if (!normalizedValue) return ''
  if (isSantaCruzBranch(normalizedValue)) return 'SantaCruz'
  if (isSucreBranch(normalizedValue)) return 'Sucre'
  return normalizedValue
}

const readValue = (row: CatalogItem, keys: string[]): unknown => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  const normalizedMap = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null || value === '') continue
    const normalized = normalizeLookupKey(key)
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, value)
    }
  }
  for (const key of keys) {
    const value = normalizedMap.get(normalizeLookupKey(key))
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const readString = (row: CatalogItem, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') {
    const nestedValue = readValue(value as CatalogItem, [
      'nombre',
      'Nombre',
      'label',
      'Label',
      'descripcion',
      'Descripcion',
      'tecnico',
      'Tecnico',
      'auxiliar',
      'Auxiliar',
      'usuario',
      'Usuario',
      'codigo',
      'Codigo',
      'sucursal',
      'Sucursal',
      'valor',
      'Valor',
    ])
    if (nestedValue === undefined || nestedValue === null) return ''
    return typeof nestedValue === 'string' ? nestedValue : String(nestedValue)
  }
  return typeof value === 'string' ? value : String(value)
}

const mapOptions = (items: CatalogItem[], idKeys: string[], labelKeys: string[]): SelectOption[] => {
  return items
    .map((item) => {
      const id = readValue(item, idKeys)
      const label = readString(item, labelKeys)
      const value = id ?? label
      if (value === undefined || value === null || value === '') return null
      return { value: String(value), label: label || String(value), item }
    })
    .filter((item): item is SelectOption => Boolean(item))
}

const toNumericIdString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return String(parsed)
}

const toOptionalNumber = (value: unknown): number | undefined => {
  const normalized = toNumericIdString(value)
  return normalized ? Number(normalized) : undefined
}

const mapIdOptions = (items: CatalogItem[], idKeys: string[], labelKeys: string[]): SelectOption[] => {
  const mapped = items
    .map((item) => {
      const rawId = readValue(item, idKeys)
      const numericId = toNumericIdString(rawId)
      if (!numericId) return null
      const label = readString(item, labelKeys)
      return { value: numericId, label: label || numericId, item }
    })
    .filter((item): item is SelectOption => Boolean(item))

  const uniqueByValue = new Map<string, SelectOption>()
  for (const option of mapped) {
    if (!uniqueByValue.has(option.value)) {
      uniqueByValue.set(option.value, option)
    }
  }
  return Array.from(uniqueByValue.values())
}

const TECNICO_ID_KEYS = [
  'idTecnico',
  'id_tecnico',
  'idtecnico',
  'IdTecnico',
  'Id_Tecnico',
  'id_vendedor',
  'idvendedor',
  'idVendedor',
  'IdVendedor',
  'Id_Vendedor',
  'id',
  'Id',
]
const TECNICO_LABEL_KEYS = ['tecnico', 'nombrevendedor', 'nombre', 'vendedor', 'Nombre', 'Tecnico', 'Vendedor']
const CUENTA_SF_KEYS = ['cuentaSf', 'CuentaSf', 'cuenta_sf', 'Cuenta_Sf', 'cuentaSF', 'cuenta', 'Cuenta']
const SALESFORCE_KEYS = ['salesforce', 'Salesforce', 'sales_force', 'SalesForce']
const HABILIDAD_KEYS = ['habilidad', 'Habilidad']
const VEHICULO_KEYS = ['vehiculo', 'Vehiculo', 'placa', 'placavehiculo', 'placaVehiculo']
const VEHICULO_VALUE_KEYS = ['idVehiculo', 'IdVehiculo', 'vehiculo', 'Vehiculo', 'placa', 'Placa', 'codigo', 'Codigo', 'id', 'Id']
const VEHICULO_LABEL_KEYS = ['vehiculo', 'Vehiculo', 'placa', 'Placa', 'placavehiculo', 'placaVehiculo', 'descripcion', 'Descripcion', 'nombre', 'Nombre']
const VEHICULO_TECNICO_ID_KEYS = ['idTecnico', 'IdTecnico', 'id_tecnico', 'Id_Tecnico', 'idVendedor', 'IdVendedor', 'id_vendedor', 'Id_Vendedor']
const GRUPO_KEYS = ['grupo', 'Grupo', 'cuadrilla', 'Cuadrilla', 'ruta', 'Ruta', 'Nombre', 'nombre', 'tipo', 'Tipo']
const GRUPO_VALUE_KEYS = ['id_ruta', 'Id_Ruta', 'idruta', 'idRuta', 'IdRuta', 'idGrupo', 'IdGrupo', 'grupo', 'Grupo', 'codigo', 'Codigo', 'id', 'Id']
const GRUPO_LABEL_KEYS = ['cuadrilla', 'Cuadrilla', 'ruta', 'Ruta', 'Nombre', 'nombre', 'grupo', 'Grupo', 'descripcion', 'Descripcion', 'codigo', 'Codigo']
const ALMACEN_KEYS = ['almacen', 'Almacen']
const GRUPO_DIGITACION_KEYS = ['grupoDigitacion', 'GrupoDigitacion', 'grupo_digitacion', 'Grupo_Digitacion', 'almacenTigo', 'AlmacenTigo']
const ACTIVIDAD_VALUE_KEYS = ['idActividad', 'IdActividad', 'actividad', 'Actividad', 'codigo', 'Codigo', 'id', 'Id']
const ACTIVIDAD_LABEL_KEYS = ['actividad', 'Actividad', 'nombre', 'Nombre', 'descripcion', 'Descripcion', 'codigo', 'Codigo']
const AUXILIAR_ID_KEYS = [
  'idTecnicoAuxiliar',
  'IdTecnicoAuxiliar',
  'Id_TecnicoAuxiliar',
  'id_tecnico_auxiliar',
  'id_tecnicoAuxiliar',
  'id_tecnicoauxiliar',
  'idAuxiliar',
  'IdAuxiliar',
  'id_auxiliar',
  'idauxiliar',
  'idtecnicoauxiliar',
  'idTecnico',
  'IdTecnico',
  'id_tecnico',
  'Id_Tecnico',
  'id',
  'Id',
]
const AUXILIAR_LABEL_KEYS = [
  'auxiliar',
  'Auxiliar',
  'tecnicoAuxiliar',
  'TecnicoAuxiliar',
  'nombreTecnicoAuxiliar',
  'NombreTecnicoAuxiliar',
  'nombreAuxiliar',
  'NombreAuxiliar',
  'tecnico',
  'Tecnico',
  'nombre',
  'Nombre',
]
const DIGITADOR_ID_KEYS = [
  'idUsuarioDigitador',
  'IdUsuarioDigitador',
  'Id_UsuarioDigitador',
  'idUsuario_Digitador',
  'IdUsuario_Digitador',
  'id_Usuario_Digitador',
  'id_usuario_digitador',
  'idusuariodigitador',
  'idUsuario',
  'IdUsuario',
  'Id_Usuario',
  'codigo',
  'Codigo',
  'Código',
  'id',
  'Id',
]
const DIGITADOR_LABEL_KEYS = ['digitador', 'Digitador', 'nombre', 'Nombre', 'loggin', 'Loggin', 'usuario', 'Usuario']
const SUPERVISOR_ID_KEYS = [
  'idUsuarioSupervisor',
  'id_usuario_supervisor',
  'idusuariosupervisor',
  'idsupervisor',
  'codigo',
  'Codigo',
  'Código',
  'idUsuario',
  'IdUsuario',
  'Id_Usuario',
  'id',
  'Id',
]
const SUPERVISOR_LABEL_KEYS = ['supervisorACargo', 'supervisor_a_cargo', 'supervisor', 'nombresupervisor', 'nombre', 'Nombre']
const SUCURSAL_VALUE_KEYS = ['sucursal', 'Sucursal', 'nombre', 'Nombre', 'codigo', 'Codigo', 'idSucursal', 'IdSucursal', 'id_sucursal', 'Id_Sucursal']
const SUCURSAL_LABEL_KEYS = ['sucursal', 'Sucursal', 'nombre', 'Nombre', 'codigo', 'Codigo']
const RECORD_ID_KEYS = [
  'id',
  'Id',
  'idConformacionCuadrilla',
  'IdConformacionCuadrilla',
  'id_conformacion_cuadrilla',
  'idCuadrilla',
  'IdCuadrilla',
  'idcuadrilla',
  'idConformacion',
  'IdConformacion',
  'id_conformacion',
]
const RECORD_ID_REGISTRO_KEYS = ['idRegistro', 'IdRegistro', 'id_registro', 'Id_Registro']
const RECORD_ID_RUTA_KEYS = ['idRuta', 'IdRuta', 'id_ruta', 'Id_Ruta', 'idruta']
const RECORD_RUTA_KEYS = ['ruta', 'Ruta']
const RECORD_ID_TECNICO_KEYS = [
  'idTecnico',
  'id_tecnico',
  'idtecnico',
  'IdTecnico',
  'Id_Tecnico',
  'idVendedor',
  'IdVendedor',
  'Id_Vendedor',
  'id_vendedor',
  'idvendedor',
]
const RECORD_ID_DIGITADOR_KEYS = [
  'idUsuarioDigitador',
  'IdUsuarioDigitador',
  'Id_UsuarioDigitador',
  'idUsuario_Digitador',
  'IdUsuario_Digitador',
  'id_Usuario_Digitador',
  'id_usuario_digitador',
  'idusuariodigitador',
  'idUsuario',
  'IdUsuario',
  'Id_Usuario',
]
const RECORD_ID_AUXILIAR_KEYS = [
  'idTecnicoAuxiliar',
  'IdTecnicoAuxiliar',
  'Id_TecnicoAuxiliar',
  'id_tecnicoAuxiliar',
  'id_tecnicoauxiliar',
  'id_tecnico_auxiliar',
  'id_auxiliar',
  'idauxiliar',
  'idtecnicoauxiliar',
  'idAuxiliar',
  'IdAuxiliar',
]
const RECORD_ID_SUPERVISOR_KEYS = [
  'idUsuarioSupervisor',
  'IdUsuarioSupervisor',
  'Id_UsuarioSupervisor',
  'id_usuario_supervisor',
  'idusuariosupervisor',
  'idsupervisor',
  'idUsuario',
  'IdUsuario',
  'Id_Usuario',
]
const RECORD_ID_REGISTRA_KEYS = ['idUsuarioRegistra', 'IdUsuarioRegistra', 'Id_UsuarioRegistra', 'id_usuario_registra', 'idusuarioregistra']
const RECORD_ESTADO_KEYS = ['estado', 'Estado']
const RECORD_ACTIVIDAD_KEYS = ['actividad', 'Actividad', 'tipoactividad', 'TipoActividad', 'tipo_actividad', 'Tipo_Actividad', 'tipo', 'Tipo']
const RECORD_TECNICO_LABEL_KEYS = [
  'tecnico',
  'Tecnico',
  'nombrevendedor',
  'NombreVendedor',
  'vendedor',
  'Vendedor',
  'nombre',
  'Nombre',
  'nombreTecnico',
  'NombreTecnico',
  'tecnicoNombre',
  'TecnicoNombre',
]
const RECORD_AUXILIAR_LABEL_KEYS = [
  'auxiliar',
  'Auxiliar',
  'tecnicoauxiliar',
  'TecnicoAuxiliar',
  'nombretecnicoauxiliar',
  'NombreTecnicoAuxiliar',
  'nombreAuxiliar',
  'NombreAuxiliar',
  'auxiliarNombre',
  'AuxiliarNombre',
]
const RECORD_DIGITADOR_LABEL_KEYS = [
  'digitador',
  'Digitador',
  'nombredigitador',
  'NombreDigitador',
  'usuarioDigitador',
  'UsuarioDigitador',
  'nombreDigitador',
  'digitadorNombre',
  'DigitadorNombre',
]
const RECORD_SUPERVISOR_LABEL_KEYS = [
  'supervisorACargo',
  'SupervisorACargo',
  'supervisor_a_cargo',
  'Supervisor_A_Cargo',
  'supervisor',
  'Supervisor',
  'nombresupervisor',
  'NombreSupervisor',
  'supervisorCargo',
  'SupervisorCargo',
  'usuarioSupervisor',
  'UsuarioSupervisor',
  'NombreSupervisor',
  'nombreSupervisor',
  'Nombre_Supervisor',
]
const RECORD_SUCURSAL_KEYS = ['sucursal', 'Sucursal', 'sucursalCodigo', 'SucursalCodigo']
const RECORD_OBSERVACION_KEYS = ['observacion', 'Observacion']
const RECORD_FECHA_KEYS = ['fecha', 'Fecha', 'fechaTrabajo', 'FechaTrabajo']
const RECORD_FECHA_REGISTRO_KEYS = ['fechaRegistro', 'FechaRegistro', 'fecha_registro', 'Fecha_Registro']
const RECORD_CONFIRMADA_KEYS = ['confirmada', 'Confirmada']
const RECORD_ELIMINADO_KEYS = ['e_eliminado', 'E_Eliminado', 'eliminado', 'Eliminado', 'eEliminado', 'EEliminado']
const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const toISODate = (value?: string): string => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return toLocalISODate(date)
}

type ApiErrorPayload = {
  code?: string
  message?: string
  details?: unknown
}

const compactJson = (value: unknown): string | null => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

const toApiErrorText = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined
    const code = payload?.code?.trim()
    const message = payload?.message?.trim() || error.message?.trim() || fallback
    const details = compactJson(payload?.details)
    if (code && details) return `[${code}] ${message} | details: ${details}`
    if (code) return `[${code}] ${message}`
    if (details) return `${message} | details: ${details}`
    return message
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

const parseNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const parseAuxiliarIdForSave = (value: string): number => {
  const parsed = parseNumber(value)
  return parsed === null ? 0 : parsed
}

const cleanString = (value: string): string => value.trim()

const optionalString = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const buildPayloadRow = (row: EditableRow): ConformacionCuadrillaInput => {
  return {
    fecha: row.fecha,
    estado: mapEstadoForBackend(cleanString(row.estado)),
    actividad: normalizeActividadForBackend(cleanString(row.actividad)),
    idTecnico: parseNumber(row.idTecnico) ?? undefined,
    cuentaSf: optionalString(row.cuentaSf),
    salesforce: optionalString(row.salesforce),
    habilidad: optionalString(normalizeHabilidadValue(row.habilidad)),
    vehiculo: optionalString(row.vehiculo),
    grupo: optionalString(row.grupo),
    almacen: optionalString(row.almacen),
    grupoDigitacion: optionalString(row.grupoDigitacion),
    idUsuarioDigitador: parseNumber(row.idUsuarioDigitador) ?? undefined,
    digitador: optionalString(row.digitador),
    tecnico: optionalString(row.tecnico),
    idTecnicoAuxiliar: parseAuxiliarIdForSave(row.idTecnicoAuxiliar),
    auxiliar: optionalString(row.auxiliar),
    idUsuarioSupervisor: parseNumber(row.idUsuarioSupervisor) ?? undefined,
    supervisorACargo: optionalString(row.supervisorACargo),
    sucursal: optionalString(row.sucursal),
    observacion: optionalString(row.observacion),
    idUsuarioRegistra: parseNumber(row.idUsuarioRegistra) ?? parseNumber(row.idUsuarioSupervisor) ?? undefined,
  }
}

const createEmptyRow = (sessionName?: string, sessionId?: number, sucursal?: string): EditableRow => {
  const baseId = sessionId ? String(sessionId) : ''
  return {
    fecha: todayISO(),
    estado: ESTADO_OPTIONS[0],
    actividad: 'TITULAR',
    idTecnico: '',
    cuentaSf: '',
    salesforce: '',
    habilidad: HABILIDAD_OPTIONS[0],
    vehiculo: '',
    grupo: '',
    almacen: '',
    grupoDigitacion: '',
    idUsuarioDigitador: '',
    digitador: '',
    tecnico: '',
    idTecnicoAuxiliar: '',
    auxiliar: '',
    idUsuarioSupervisor: baseId,
    supervisorACargo: sessionName ?? '',
    sucursal: sucursal ?? '',
    observacion: '',
    idUsuarioRegistra: baseId,
  }
}

const normalizeEstadoValue = (value: string): string => {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'AUSENTE' || normalized === 'INACTIVO') return 'AUSENTE'
  if (normalized === 'ACTIVO') return 'ACTIVO'
  return ESTADO_OPTIONS[0]
}

const mapEstadoForBackend = (value: string): string => {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'ACTIVO') return 'ACTIVO'
  if (normalized === 'INACTIVO' || normalized === 'AUSENTE') return 'AUSENTE'
  return 'ACTIVO'
}

const normalizeActividadForBackend = (value: string): 'TITULAR' | 'BACKUP' => {
  const normalized = value.trim().toUpperCase()
  return normalized === 'BACKUP' ? 'BACKUP' : 'TITULAR'
}

const normalizeHabilidadValue = (value: string): string => {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return ''
  return (HABILIDAD_OPTIONS as readonly string[]).includes(normalized) ? normalized : ''
}

const readRecordId = (row: ConformacionCuadrillaRecord, keys: string[], fallback?: unknown): string => {
  const value = readValue(row as unknown as CatalogItem, keys)
  const nestedRecordId = (source: unknown): string | null => {
    if (!source || typeof source !== 'object') return null
    const nestedValue = readValue(source as CatalogItem, [
      ...keys,
      'id',
      'Id',
      'idTecnico',
      'IdTecnico',
      'idUsuario',
      'IdUsuario',
      'idAuxiliar',
      'IdAuxiliar',
      'value',
      'Value',
    ])
    return toNumericIdString(nestedValue)
  }

  const numeric = toNumericIdString(value) ?? nestedRecordId(value)
  if (numeric) return numeric
  const fallbackNumeric = toNumericIdString(fallback) ?? nestedRecordId(fallback)
  return fallbackNumeric ?? ''
}

const readRecordString = (row: ConformacionCuadrillaRecord, keys: string[], fallback = ''): string => {
  const value = readString(row as unknown as CatalogItem, keys)
  if (value) return value
  return fallback
}

const toBooleanLike = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'si') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  }
  return undefined
}

const readRecordBoolean = (row: ConformacionCuadrillaRecord, keys: string[], fallback?: unknown): boolean | undefined => {
  const value = readValue(row as unknown as CatalogItem, keys)
  const normalized = toBooleanLike(value)
  if (normalized !== undefined) return normalized
  return toBooleanLike(fallback)
}

const isRowEliminado = (row: ConformacionCuadrillaRecord): boolean => {
  const normalized = readRecordBoolean(row, RECORD_ELIMINADO_KEYS, row.e_eliminado ?? row.eEliminado ?? row.eliminado)
  if (normalized !== undefined) return normalized
  return false
}

const normalizeListRecord = (row: ConformacionCuadrillaRecord): ConformacionCuadrillaRecord => {
  const rawId = readValue(row as unknown as CatalogItem, RECORD_ID_KEYS)
  const normalizedId = toNumericIdString(rawId) ?? toNumericIdString(row.id)
  const rawIdRegistro = readValue(row as unknown as CatalogItem, RECORD_ID_REGISTRO_KEYS)
  const normalizedIdRegistro = toNumericIdString(rawIdRegistro) ?? toNumericIdString(row.idRegistro)
  const normalizedIdRuta = toNumericIdString(readValue(row as unknown as CatalogItem, RECORD_ID_RUTA_KEYS)) ?? toNumericIdString(row.idRuta)
  const fecha = toISODate(readRecordString(row, RECORD_FECHA_KEYS, row.fecha ?? '')) || toISODate(row.fecha ?? '') || ''
  const fechaRegistro = readRecordString(row, RECORD_FECHA_REGISTRO_KEYS, row.fechaRegistro ?? '')
  const eliminado = isRowEliminado(row)
  const confirmada = readRecordBoolean(row, RECORD_CONFIRMADA_KEYS, row.confirmada) ?? row.confirmada ?? false
  const idTecnico = toNumericIdString(readValue(row as unknown as CatalogItem, RECORD_ID_TECNICO_KEYS)) ?? toNumericIdString(row.idTecnico)
  const idTecnicoAuxiliar =
    toNumericIdString(readValue(row as unknown as CatalogItem, RECORD_ID_AUXILIAR_KEYS)) ?? toNumericIdString(row.idTecnicoAuxiliar)
  const idUsuarioDigitador =
    toNumericIdString(readValue(row as unknown as CatalogItem, RECORD_ID_DIGITADOR_KEYS)) ?? toNumericIdString(row.idUsuarioDigitador)
  const idUsuarioSupervisor =
    toNumericIdString(readValue(row as unknown as CatalogItem, RECORD_ID_SUPERVISOR_KEYS)) ?? toNumericIdString(row.idUsuarioSupervisor)
  const grupo = readRecordString(row, GRUPO_KEYS, row.grupo ?? '')
  const tecnicoRaw = readRecordString(row, RECORD_TECNICO_LABEL_KEYS, row.tecnico ?? '')
  const tecnico = normalizeLookupKey(tecnicoRaw) === normalizeLookupKey(grupo) ? '' : tecnicoRaw
  const resolvedId = toOptionalNumber(normalizedId ?? row.id)
  const resolvedIdRegistro = toOptionalNumber(normalizedIdRegistro ?? row.idRegistro)
  return {
    ...row,
    id: resolvedId,
    idRegistro: resolvedIdRegistro,
    idRuta: normalizedIdRuta ? Number(normalizedIdRuta) : row.idRuta,
    ruta: readRecordString(row, RECORD_RUTA_KEYS, row.ruta ?? ''),
    grupo,
    fecha,
    fechaRegistro,
    estado: readRecordString(row, RECORD_ESTADO_KEYS, row.estado ?? ''),
    actividad: readRecordString(row, RECORD_ACTIVIDAD_KEYS, row.actividad ?? ''),
    idTecnico: toOptionalNumber(idTecnico) ?? row.idTecnico,
    tecnico,
    idTecnicoAuxiliar: toOptionalNumber(idTecnicoAuxiliar) ?? row.idTecnicoAuxiliar,
    auxiliar: readRecordString(row, RECORD_AUXILIAR_LABEL_KEYS, row.auxiliar ?? ''),
    idUsuarioDigitador: toOptionalNumber(idUsuarioDigitador) ?? row.idUsuarioDigitador,
    digitador: readRecordString(row, RECORD_DIGITADOR_LABEL_KEYS, row.digitador ?? ''),
    idUsuarioSupervisor: toOptionalNumber(idUsuarioSupervisor) ?? row.idUsuarioSupervisor,
    supervisorACargo: readRecordString(row, RECORD_SUPERVISOR_LABEL_KEYS, row.supervisorACargo ?? ''),
    cuentaSf: readRecordString(row, CUENTA_SF_KEYS, row.cuentaSf ?? ''),
    salesforce: readRecordString(row, SALESFORCE_KEYS, row.salesforce ?? ''),
    vehiculo: readRecordString(row, VEHICULO_KEYS, row.vehiculo ?? ''),
    sucursal: readRecordString(row, RECORD_SUCURSAL_KEYS, row.sucursal ?? ''),
    observacion: readRecordString(row, RECORD_OBSERVACION_KEYS, row.observacion ?? ''),
    confirmada,
    e_eliminado: eliminado,
    eEliminado: eliminado,
    eliminado,
  }
}

const toEditableRow = (row: ConformacionCuadrillaRecord): EditableRow => {
  const resolvedFecha = toISODate(readRecordString(row, RECORD_FECHA_KEYS, row.fecha ?? '')) || toISODate(row.fecha ?? '') || todayISO()
  const resolvedEstado = normalizeEstadoValue(readRecordString(row, RECORD_ESTADO_KEYS, row.estado ?? ESTADO_OPTIONS[0]))
  const resolvedActividad = readRecordString(row, RECORD_ACTIVIDAD_KEYS, row.actividad ?? '')
  const resolvedGrupo = readRecordString(row, GRUPO_KEYS, row.grupo ?? '')
  const resolvedTecnicoRaw = readRecordString(row, RECORD_TECNICO_LABEL_KEYS, row.tecnico ?? '')
  const resolvedTecnico = normalizeLookupKey(resolvedTecnicoRaw) === normalizeLookupKey(resolvedGrupo) ? '' : resolvedTecnicoRaw
  const resolvedAuxiliarId = normalizeAuxiliarComparableId(readRecordId(row, RECORD_ID_AUXILIAR_KEYS, row.idTecnicoAuxiliar))
  const resolvedAuxiliar = sanitizeAuxiliarLabel(readRecordString(row, RECORD_AUXILIAR_LABEL_KEYS, row.auxiliar ?? ''))
  const resolvedDigitadorId = normalizeDigitadorComparableId(readRecordId(row, RECORD_ID_DIGITADOR_KEYS, row.idUsuarioDigitador))
  const resolvedDigitador = sanitizeDigitadorLabel(readRecordString(row, DIGITADOR_LABEL_KEYS, row.digitador ?? ''))
  const resolvedId = getRecordRealId(row) ?? toOptionalNumber(row.id) ?? row.id
  return {
    id: resolvedId,
    fecha: resolvedFecha,
    estado: resolvedEstado,
    actividad: resolvedActividad,
    idTecnico: readRecordId(row, RECORD_ID_TECNICO_KEYS, row.idTecnico),
    cuentaSf: readRecordString(row, CUENTA_SF_KEYS, row.cuentaSf ?? ''),
    salesforce: readRecordString(row, SALESFORCE_KEYS, row.salesforce ?? ''),
    habilidad: normalizeHabilidadValue(readRecordString(row, HABILIDAD_KEYS, row.habilidad ?? '')),
    vehiculo: readRecordString(row, VEHICULO_KEYS, row.vehiculo ?? ''),
    grupo: resolvedGrupo,
    almacen: readRecordString(row, ALMACEN_KEYS, row.almacen ?? ''),
    grupoDigitacion: readRecordString(row, GRUPO_DIGITACION_KEYS, row.grupoDigitacion ?? ''),
    idUsuarioDigitador: resolvedDigitadorId,
    digitador: resolvedDigitador,
    tecnico: resolvedTecnico,
    idTecnicoAuxiliar: resolvedAuxiliarId,
    auxiliar: resolvedAuxiliar,
    idUsuarioSupervisor: readRecordId(row, RECORD_ID_SUPERVISOR_KEYS, row.idUsuarioSupervisor),
    supervisorACargo: readRecordString(row, RECORD_SUPERVISOR_LABEL_KEYS, row.supervisorACargo ?? ''),
    sucursal: readRecordString(row, RECORD_SUCURSAL_KEYS, row.sucursal ?? ''),
    observacion: readRecordString(row, RECORD_OBSERVACION_KEYS, row.observacion ?? ''),
    idUsuarioRegistra: readRecordId(row, RECORD_ID_REGISTRA_KEYS, row.idUsuarioRegistra),
  }
}

const isBlank = (value: string): boolean => value.trim() === ''

const pickValue = (preferred: string, fallback: string): string => {
  return isBlank(preferred) ? fallback : preferred
}

const mergeEditableRows = (base: EditableRow, detail: EditableRow): EditableRow => {
  return {
    ...detail,
    estado: pickValue(detail.estado, base.estado),
    actividad: pickValue(detail.actividad, base.actividad),
    idTecnico: pickValue(detail.idTecnico, base.idTecnico),
    cuentaSf: pickValue(detail.cuentaSf, base.cuentaSf),
    salesforce: pickValue(detail.salesforce, base.salesforce),
    habilidad: pickValue(detail.habilidad, base.habilidad),
    vehiculo: pickValue(detail.vehiculo, base.vehiculo),
    grupo: pickValue(detail.grupo, base.grupo),
    almacen: pickValue(detail.almacen, base.almacen),
    grupoDigitacion: pickValue(detail.grupoDigitacion, base.grupoDigitacion),
    idUsuarioDigitador: pickValue(detail.idUsuarioDigitador, base.idUsuarioDigitador),
    digitador: pickValue(detail.digitador, base.digitador),
    tecnico: pickValue(detail.tecnico, base.tecnico),
    idTecnicoAuxiliar: pickValue(detail.idTecnicoAuxiliar, base.idTecnicoAuxiliar),
    auxiliar: pickValue(detail.auxiliar, base.auxiliar),
    idUsuarioSupervisor: pickValue(detail.idUsuarioSupervisor, base.idUsuarioSupervisor),
    supervisorACargo: pickValue(detail.supervisorACargo, base.supervisorACargo),
    sucursal: pickValue(detail.sucursal, base.sucursal),
    observacion: pickValue(detail.observacion, base.observacion),
    idUsuarioRegistra: pickValue(detail.idUsuarioRegistra, base.idUsuarioRegistra),
  }
}

const getRowIssues = (row: EditableRow): RowIssue => {
  const missingFields: string[] = []
  if (!row.estado.trim()) missingFields.push('estado')
  if (!row.actividad.trim()) missingFields.push('actividad')
  if (parseNumber(row.idTecnico) === null) missingFields.push('idTecnico')
  if (parseNumber(row.idUsuarioSupervisor) === null) missingFields.push('idUsuarioSupervisor')
  if (!row.sucursal.trim()) missingFields.push('sucursal')
  if (parseNumber(row.idUsuarioRegistra) === null) missingFields.push('idUsuarioRegistra')

  const idTecnico = (String(row.idTecnico ?? '')).trim()
  const idAux = normalizeAuxiliarComparableId(row.idTecnicoAuxiliar)
  const idDigitador = (String(row.idUsuarioDigitador ?? '')).trim()
  const idConflict =
    (idTecnico !== '' && idAux !== '' && idTecnico === idAux) ||
    (idTecnico !== '' && idDigitador !== '' && idTecnico === idDigitador)
  const rawEstado = row.estado.trim().toUpperCase()
  const invalidEstado = rawEstado !== '' && rawEstado !== 'ACTIVO' && rawEstado !== 'AUSENTE'

  const hasIssue = missingFields.length > 0 || idConflict || invalidEstado
  return { hasIssue, idConflict, invalidEstado, missingFields }
}

const resolveEstadoForList = (row: ConformacionCuadrillaRecord): string => {
  const rawEstado = readRecordString(row, RECORD_ESTADO_KEYS, row.estado ?? '').trim().toUpperCase()
  if (rawEstado === 'AUSENTE' || rawEstado === 'INACTIVO') return 'AUSENTE'
  if (rawEstado === 'ACTIVO') return 'ACTIVO'
  if (isRowEliminado(row)) return 'AUSENTE'
  return rawEstado || 'ACTIVO'
}

const toVisualLabel = (value: string | undefined | null, emptyLabel: string): string => {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : emptyLabel
}

const buildConfirmadasVersionKey = (row: ConformacionCuadrillaRecord): string | null => {
  const fecha = toISODate(row.fecha ?? undefined)
  const sucursal = normalizeLookupKey(String(row.sucursal ?? ''))
  const tecnicoId = String(row.idTecnico ?? '').trim()
  if (tecnicoId) return `f:${fecha}|t:${tecnicoId}|s:${sucursal}`

  const tecnico = normalizeLookupKey(String(row.tecnico ?? ''))
  if (tecnico) return `f:${fecha}|tl:${tecnico}|s:${sucursal}`

  const grupo = normalizeLookupKey(String(row.grupo ?? ''))
  const vehiculo = normalizeLookupKey(String(row.vehiculo ?? ''))
  if (grupo || vehiculo) return `f:${fecha}|g:${grupo}|v:${vehiculo}|s:${sucursal}`

  return null
}

const getRecordSelectionKey = (row: ConformacionCuadrillaRecord): string => {
  const idReal = getRecordRealId(row)
  if (idReal !== null) return `id:${idReal}`
  const fecha = toISODate(row.fecha ?? undefined)
  const tecnicoId = readRecordId(row, RECORD_ID_TECNICO_KEYS, row.idTecnico)
  const tecnico = (row.tecnico ?? '').trim().toLowerCase()
  const sucursal = (row.sucursal ?? '').trim().toLowerCase()
  return [fecha, tecnicoId || tecnico, sucursal].join('|')
}

const buildLocalConfirmedSignature = (row: ConformacionCuadrillaRecord): string => {
  const normalized = normalizeListRecord(row)
  return buildConfirmadasVersionKey(normalized) ?? getRecordSelectionKey(normalized)
}

const getRecordRealId = (row: ConformacionCuadrillaRecord): number | null => {
  const idRealCandidate = row.idRegistro ?? row.id ?? row.Id
  const parsed = toOptionalNumber(idRealCandidate)
  if (parsed === undefined || parsed <= 0) return null
  return parsed
}

const getRecordRutaId = (row: ConformacionCuadrillaRecord): number | null => {
  const idRutaCandidate =
    readValue(row as unknown as CatalogItem, RECORD_ID_RUTA_KEYS) ??
    row.idRuta ??
    row.id ??
    row.Id
  const parsed = toOptionalNumber(idRutaCandidate)
  if (parsed === undefined || parsed <= 0) return null
  return parsed
}

const normalizeComparableLabel = (value: string | undefined | null): string => {
  return String(value ?? '').trim()
}

const buildEditAssignmentSnapshotFromRecord = (record: ConformacionCuadrillaRecord): EditAssignmentSnapshot => {
  return {
    idRuta: getRecordRutaId(record),
    idTecnicoAuxiliar: normalizeAuxiliarComparableId(readRecordId(record, RECORD_ID_AUXILIAR_KEYS, record.idTecnicoAuxiliar)),
    auxiliar: normalizeAuxiliarComparableLabel(readRecordString(record, RECORD_AUXILIAR_LABEL_KEYS, record.auxiliar ?? '')),
    idUsuarioDigitador: normalizeDigitadorComparableId(readRecordId(record, RECORD_ID_DIGITADOR_KEYS, record.idUsuarioDigitador)),
    digitador: normalizeDigitadorComparableLabel(readRecordString(record, RECORD_DIGITADOR_LABEL_KEYS, record.digitador ?? '')),
    sucursal: normalizeComparableLabel(readRecordString(record, RECORD_SUCURSAL_KEYS, record.sucursal ?? '')),
  }
}

const buildEditAssignmentSnapshotFromRow = (
  row: EditableRow,
  fallbackIdRuta: number | null,
  fallbackSucursal: string
): EditAssignmentSnapshot => {
  return {
    idRuta: fallbackIdRuta,
    idTecnicoAuxiliar: normalizeAuxiliarComparableId(row.idTecnicoAuxiliar),
    auxiliar: normalizeAuxiliarComparableLabel(row.auxiliar),
    idUsuarioDigitador: normalizeDigitadorComparableId(row.idUsuarioDigitador),
    digitador: normalizeDigitadorComparableLabel(row.digitador),
    sucursal: normalizeComparableLabel(row.sucursal || fallbackSucursal),
  }
}

const ConformacionCuadrillaPage = () => {
  const { menuIds, menusAsignados } = useAuth()
  const session = useSessionStore((state) => state.session)
  const loginSucursalId = useMemo(() => {
    if (session?.idSucursal === undefined || session?.idSucursal === null) return ''
    const parsed = Number(session.idSucursal)
    if (!Number.isFinite(parsed) || parsed <= 0) return ''
    return String(parsed)
  }, [session?.idSucursal])
  const todayValue = todayISO()
  const currentUserRegistraId = useMemo(() => {
    if (session?.idUsuario === undefined || session?.idUsuario === null) return ''
    const parsed = Number(session.idUsuario)
    return Number.isFinite(parsed) ? String(parsed) : ''
  }, [session?.idUsuario])
  const queryClient = useQueryClient()
  const assignedMenuNameSet = useMemo(() => {
    const names = new Set<string>()
    for (const menu of menusAsignados) {
      if (!menu?.nombre) continue
      names.add(normalizeMenuPermissionKey(menu.nombre))
    }
    return names
  }, [menusAsignados])
  const hasMenuPermission = (menuName: string, legacyMenuIds: number[] = []): boolean => {
    if (assignedMenuNameSet.has(normalizeMenuPermissionKey(menuName))) {
      return true
    }
    return legacyMenuIds.some((idMenu) => menuIds.includes(idMenu))
  }
  const canViewCuadrillas = hasMenuPermission(MENU_NAME_CONFORMACION_CUADRILLAS, [
    LEGACY_MENU_ID_CONFORMACION_CUADRILLAS,
    LEGACY_MENU_ID_CONFORMACION_CUADRILLAS_OLD,
  ])
  const canAsignarTecnicoGrupo = canViewCuadrillas
  const canVerDatosTecnico = canViewCuadrillas
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<CuadrillaModalMode>('view')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingLoadId, setEditingLoadId] = useState<number | null>(null)
  const [gridRows, setGridRows] = useState<EditableRow[]>(() => [createEmptyRow(session?.nombre, session?.idUsuario)])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showStrictValidation, setShowStrictValidation] = useState(false)
  const [selectedConfirmKeys, setSelectedConfirmKeys] = useState<string[]>([])
  const [activeDetailConfirmKey, setActiveDetailConfirmKey] = useState<string | null>(null)
  const [editInitialSnapshot, setEditInitialSnapshot] = useState<EditAssignmentSnapshot | null>(null)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
  const [pendingReassignmentPrompt, setPendingReassignmentPrompt] = useState<PendingReassignmentPrompt | null>(null)
  const [approvedReassignments, setApprovedReassignments] = useState<AssignmentTransfer[]>([])
  const [sessionDraftByKey, setSessionDraftByKey] = useState<Record<string, ConformacionCuadrillaRecord>>({})
  const [sessionReassignmentsByKey, setSessionReassignmentsByKey] = useState<Record<string, AssignmentTransfer[]>>({})
  const [isResolvingReassignments, setIsResolvingReassignments] = useState(false)
  const [activeTab, setActiveTab] = useState<CuadrillaListTab>('general')
  const [showAllVehiculos, setShowAllVehiculos] = useState(false)
  const [listSearchInput, setListSearchInput] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [filterFecha, setFilterFecha] = useState<string>(todayValue)
  const [filterSucursal, setFilterSucursal] = useState<string>('')
  const [filterLimite] = useState<string>('200')
  const [showListFilters, setShowListFilters] = useState(false)
  const catalogSucursal = toSucursalActiva(filterSucursal)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setListSearch(listSearchInput.trim())
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [listSearchInput])

  const limitNumber = useMemo(() => {
    const parsed = Number(filterLimite)
    if (!Number.isFinite(parsed) || parsed <= 0) return 50
    return Math.min(parsed, 200)
  }, [filterLimite])

  const digitadoresQuery = useQuery({
    queryKey: ['catalogos-digitadores-conformacion-web', catalogSucursal],
    queryFn: () => fetchConformacionDigitadores(catalogSucursal || undefined),
    enabled: canViewCuadrillas,
  })
  const supervisoresQuery = useQuery({
    queryKey: ['catalogos-supervisores-conformacion-web', catalogSucursal],
    queryFn: () => fetchConformacionSupervisores(catalogSucursal || undefined),
    enabled: canViewCuadrillas,
  })
  const salesforceCatalogQuery = useQuery({
    queryKey: ['catalogos-salesforce-conformacion-web', catalogSucursal],
    queryFn: () => fetchConformacionSalesforce(catalogSucursal || undefined),
    enabled: canViewCuadrillas,
  })
  const sucursalesQuery = useQuery({
    queryKey: ['catalogos-sucursales-conformacion'],
    queryFn: fetchConformacionSucursales,
    enabled: canViewCuadrillas,
  })
  const gruposQuery = useQuery({
    queryKey: ['catalogos-grupos-conformacion-filtros', catalogSucursal, limitNumber],
    queryFn: () =>
      fetchConformacionGrupos({
        sucursal: catalogSucursal || undefined,
        limit: limitNumber,
      }),
    enabled: canViewCuadrillas,
  })
  const actividadesQuery = useQuery({
    queryKey: ['catalogos-actividades-conformacion-web', catalogSucursal],
    queryFn: () => fetchConformacionActividades(catalogSucursal || undefined),
    enabled: canViewCuadrillas,
  })
  const auxiliaresQuery = useQuery({
    queryKey: ['catalogos-auxiliares-conformacion-web', catalogSucursal],
    queryFn: () => fetchConformacionAuxiliares(catalogSucursal || undefined),
    enabled: canViewCuadrillas,
  })

  const auxiliares = useMemo(() => auxiliaresQuery.data ?? [], [auxiliaresQuery.data])
  const digitadores = useMemo(() => digitadoresQuery.data ?? [], [digitadoresQuery.data])
  const supervisores = useMemo(() => supervisoresQuery.data ?? [], [supervisoresQuery.data])
  const salesforceCatalog = useMemo(() => salesforceCatalogQuery.data ?? [], [salesforceCatalogQuery.data])
  const sucursales = useMemo(() => sucursalesQuery.data ?? [], [sucursalesQuery.data])
  const grupos = useMemo(() => gruposQuery.data ?? [], [gruposQuery.data])
  const actividades = useMemo(() => actividadesQuery.data ?? [], [actividadesQuery.data])

  const sucursalOptions = useMemo(() => mapOptions(sucursales, SUCURSAL_VALUE_KEYS, SUCURSAL_LABEL_KEYS), [sucursales])
  const loginSucursal = useMemo(() => {
    if (!loginSucursalId) return ''
    const byValue = sucursalOptions.find((option) => option.value === loginSucursalId)
    if (byValue) return byValue.value
    const byRowId = sucursalOptions.find((option) => {
      const id = readValue(option.item, ['idSucursal', 'IdSucursal', 'id_sucursal', 'Id_Sucursal'])
      return toNumericIdString(id) === loginSucursalId
    })
    return byRowId?.value ?? ''
  }, [loginSucursalId, sucursalOptions])
  const loginSucursalLabel = useMemo(
    () => sucursalOptions.find((option) => option.value === loginSucursal)?.label ?? '',
    [loginSucursal, sucursalOptions]
  )
  const defaultSucursal = useMemo(() => {
    if (loginSucursalId) {
      const byRowId = sucursalOptions.find((option) => {
        const id = readValue(option.item, ['idSucursal', 'IdSucursal', 'id_sucursal', 'Id_Sucursal'])
        return toNumericIdString(id) === loginSucursalId
      })
      if (byRowId?.value) return byRowId.value
    }
    return sucursalOptions[0]?.value ?? ''
  }, [loginSucursalId, sucursalOptions])
  const selectedSucursalLabel = useMemo(
    () => sucursalOptions.find((option) => option.value === filterSucursal)?.label ?? '',
    [filterSucursal, sucursalOptions]
  )
  const filterSucursalApi = useMemo(() => {
    const byId = sucursalOptions.find((option) => option.value === filterSucursal)?.label
    const fallback = (filterSucursal || '').trim()
    return (byId || fallback || '').trim()
  }, [filterSucursal, sucursalOptions])
  const sucursalActiva = useMemo(() => toSucursalActiva(filterSucursalApi), [filterSucursalApi])
  const tecnicosQuery = useQuery({
    queryKey: ['catalogos-tecnicos-conformacion-web', sucursalActiva],
    queryFn: () => fetchConformacionTecnicos(sucursalActiva || undefined),
    enabled: canViewCuadrillas,
  })
  const tecnicos = useMemo(() => tecnicosQuery.data ?? [], [tecnicosQuery.data])
  const tecnicoOptions = useMemo(() => mapIdOptions(tecnicos, TECNICO_ID_KEYS, TECNICO_LABEL_KEYS), [tecnicos])
  const salesforceOptions = useMemo(() => {
    const byKey = new Map<string, { salesforce: string; cuentaSf: string }>()
    for (const item of salesforceCatalog) {
      const salesforce = readString(item, SALESFORCE_KEYS).trim()
      const cuentaSf = readString(item, CUENTA_SF_KEYS).trim()
      const keySource = salesforce || cuentaSf
      const key = normalizeLookupKey(keySource)
      if (!key) continue
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, { salesforce: salesforce || keySource, cuentaSf })
        continue
      }
      if (!existing.salesforce && salesforce) existing.salesforce = salesforce
      if (!existing.cuentaSf && cuentaSf) existing.cuentaSf = cuentaSf
    }
    return Array.from(byKey.values()).sort((a, b) => a.salesforce.localeCompare(b.salesforce))
  }, [salesforceCatalog])
  const cuentaSfBySalesforce = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of salesforceOptions) {
      const key = normalizeLookupKey(option.salesforce)
      if (!key) continue
      map.set(key, option.cuentaSf)
    }
    return map
  }, [salesforceOptions])
  const salesforceByCuentaSf = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of salesforceOptions) {
      const cuentaKey = normalizeLookupKey(option.cuentaSf)
      const salesforceValue = option.salesforce.trim()
      if (!cuentaKey || !salesforceValue) continue
      if (!map.has(cuentaKey)) {
        map.set(cuentaKey, salesforceValue)
      }
    }
    return map
  }, [salesforceOptions])

  useEffect(() => {
    if (salesforceByCuentaSf.size === 0) return
    setGridRows((rows) => {
      let changed = false
      const nextRows = rows.map((row) => {
        const salesforceRaw = (row.salesforce || '').trim()
        const cuentaRaw = (row.cuentaSf || '').trim()
        if (!salesforceRaw || !cuentaRaw) return row
        const salesforceKey = normalizeLookupKey(salesforceRaw)
        const cuentaKey = normalizeLookupKey(cuentaRaw)
        if (!salesforceKey || salesforceKey !== cuentaKey) return row
        const mappedSalesforce = salesforceByCuentaSf.get(cuentaKey)
        if (!mappedSalesforce || mappedSalesforce.trim() === salesforceRaw) return row
        changed = true
        return {
          ...row,
          salesforce: mappedSalesforce,
        }
      })
      return changed ? nextRows : rows
    })
  }, [salesforceByCuentaSf])
  const auxiliarOptions = useMemo(
    () =>
      mapIdOptions(auxiliares, AUXILIAR_ID_KEYS, AUXILIAR_LABEL_KEYS).filter(
        (option) => normalizeAuxiliarComparableId(option.value) !== '' && !isAuxiliarNoneLabel(option.label)
      ),
    [auxiliares]
  )
  const digitadorOptions = useMemo(
    () =>
      mapIdOptions(digitadores, DIGITADOR_ID_KEYS, DIGITADOR_LABEL_KEYS).filter(
        (option) => normalizeDigitadorComparableId(option.value) !== '' && !isDigitadorNoneLabel(option.label)
      ),
    [digitadores]
  )
  const supervisorOptions = useMemo(() => mapIdOptions(supervisores, SUPERVISOR_ID_KEYS, SUPERVISOR_LABEL_KEYS), [supervisores])
  const selectedInitialSource = useMemo(
    () => (isSucreBranch(sucursalActiva) ? 'DB_SUCRE' : 'U_TECNICOS'),
    [sucursalActiva]
  )
  const gruposOptions = useMemo(() => mapOptions(grupos, GRUPO_VALUE_KEYS, GRUPO_LABEL_KEYS), [grupos])
  const actividadOptions = useMemo(() => mapOptions(actividades, ACTIVIDAD_VALUE_KEYS, ACTIVIDAD_LABEL_KEYS), [actividades])
  const selectedTecnicoIds = useMemo(() => {
    const unique = new Set<number>()
    gridRows.forEach((row) => {
      const tecnicoId = parseNumber(row.idTecnico)
      if (tecnicoId !== null) unique.add(tecnicoId)
    })
    return Array.from(unique)
  }, [gridRows])
  const vehiculosPorTecnicoQuery = useQuery({
    queryKey: ['catalogos-vehiculos-conformacion-web', sucursalActiva],
    queryFn: async () => {
      const items = await fetchConformacionVehiculos({ sucursal: sucursalActiva || undefined })
      return items
    },
    enabled: canViewCuadrillas,
  })
  const vehiculosTodosQuery = useQuery({
    queryKey: ['catalogos-vehiculos-conformacion-web-todos', sucursalActiva, showAllVehiculos],
    queryFn: async () => {
      const items = await fetchConformacionVehiculos({
        sucursal: sucursalActiva || undefined,
        filtro: '%',
      })
      return items
    },
    enabled: canViewCuadrillas && showAllVehiculos,
  })
  const vehiculoOptionsGlobal = useMemo(
    () =>
      mapOptions(
        (showAllVehiculos ? vehiculosTodosQuery.data : vehiculosPorTecnicoQuery.data) ?? [],
        VEHICULO_VALUE_KEYS,
        VEHICULO_LABEL_KEYS
      ),
    [showAllVehiculos, vehiculosPorTecnicoQuery.data, vehiculosTodosQuery.data]
  )
  const vehiculosPorTecnico = useMemo(() => {
    const rows = vehiculosPorTecnicoQuery.data
    if (!rows) return {}
    const grouped: Record<string, CatalogItem[]> = {}
    rows.forEach((item) => {
      const tecnicoId = normalizeTecnicoComparableId(readValue(item, VEHICULO_TECNICO_ID_KEYS) as string | number | null | undefined)
      if (!tecnicoId) return
      if (!grouped[tecnicoId]) grouped[tecnicoId] = []
      grouped[tecnicoId].push(item)
    })
    // Keep keys for selected tecnicos even if they do not have vehiculos vinculados.
    selectedTecnicoIds.forEach((idTecnico) => {
      const key = String(idTecnico)
      if (!grouped[key]) grouped[key] = []
    })
    return grouped
  }, [selectedTecnicoIds, vehiculosPorTecnicoQuery.data])
  const vehiculoOptionsByTecnico = useMemo(() => {
    const entries = Object.entries(vehiculosPorTecnico).map(([tecnicoId, items]) => [
      tecnicoId,
      mapOptions(items, VEHICULO_VALUE_KEYS, VEHICULO_LABEL_KEYS),
    ] as const)
    return new Map<string, SelectOption[]>(entries)
  }, [vehiculosPorTecnico])

  useEffect(() => {
    const preferredSucursal = filterSucursal || loginSucursal || defaultSucursal
    const preferredSucursalLabel =
      sucursalOptions.find((option) => option.value === preferredSucursal)?.label || selectedSucursalLabel || loginSucursalLabel
    const preferredSucursalApi = toSucursalActiva(preferredSucursalLabel || preferredSucursal)
    setGridRows((current) =>
      current.map((row) => ({
        ...row,
        fecha: todayValue,
        estado: normalizeEstadoValue(row.estado),
        habilidad: normalizeHabilidadValue(row.habilidad),
        sucursal: preferredSucursalApi || row.sucursal,
      }))
    )
    if (preferredSucursal) {
      setFilterSucursal((current) => current || preferredSucursal)
    }
  }, [defaultSucursal, filterSucursal, loginSucursal, loginSucursalLabel, selectedSucursalLabel, sucursalOptions, todayValue])

  useEffect(() => {
    if (!currentUserRegistraId) return
    setGridRows((current) =>
      current.map((row) => ({ ...row, idUsuarioRegistra: currentUserRegistraId }))
    )
  }, [currentUserRegistraId])

  const tecnicoById = useMemo(() => new Map(tecnicoOptions.map((option) => [option.value, option])), [tecnicoOptions])
  const auxiliarById = useMemo(() => new Map(auxiliarOptions.map((option) => [option.value, option])), [auxiliarOptions])
  const digitadorById = useMemo(() => new Map(digitadorOptions.map((option) => [option.value, option])), [digitadorOptions])
  const supervisorById = useMemo(() => new Map(supervisorOptions.map((option) => [option.value, option])), [supervisorOptions])
  const auxiliarByLabel = useMemo(
    () => new Map(auxiliarOptions.map((option) => [normalizeLookupKey(option.label), option])),
    [auxiliarOptions]
  )
  const digitadorByLabel = useMemo(
    () => new Map(digitadorOptions.map((option) => [normalizeLookupKey(option.label), option])),
    [digitadorOptions]
  )
  const supervisorByLabel = useMemo(
    () => new Map(supervisorOptions.map((option) => [normalizeLookupKey(option.label), option])),
    [supervisorOptions]
  )
  const grupoByValue = useMemo(() => new Map(gruposOptions.map((option) => [option.value, option])), [gruposOptions])
  const grupoByLabel = useMemo(() => new Map(gruposOptions.map((option) => [option.label, option])), [gruposOptions])
  const actividadByValue = useMemo(() => new Map(actividadOptions.map((option) => [option.value, option])), [actividadOptions])

  const hydrateActorFields = (row: EditableRow): EditableRow => {
    let changed = false
    const next: EditableRow = { ...row }

    const hydrateByIdThenLabel = (
      idValue: string,
      labelValue: string,
      byId: Map<string, SelectOption>,
      byLabel: Map<string, SelectOption>,
      setId: (value: string) => void,
      setLabel: (value: string) => void
    ) => {
      if (idValue) {
        const option = byId.get(idValue)
        if ((!labelValue || !labelValue.trim()) && option?.label) {
          setLabel(option.label)
          changed = true
        }
        return
      }
      if (labelValue && labelValue.trim()) {
        const option = byLabel.get(normalizeLookupKey(labelValue))
        if (option?.value) {
          setId(option.value)
          if (!labelValue.trim()) {
            setLabel(option.label)
          }
          changed = true
        }
      }
    }

    hydrateByIdThenLabel(
      next.idTecnicoAuxiliar,
      next.auxiliar,
      auxiliarById,
      auxiliarByLabel,
      (value) => {
        next.idTecnicoAuxiliar = value
      },
      (value) => {
        next.auxiliar = value
      }
    )
    hydrateByIdThenLabel(
      next.idUsuarioDigitador,
      next.digitador,
      digitadorById,
      digitadorByLabel,
      (value) => {
        next.idUsuarioDigitador = value
      },
      (value) => {
        next.digitador = value
      }
    )
    hydrateByIdThenLabel(
      next.idUsuarioSupervisor,
      next.supervisorACargo,
      supervisorById,
      supervisorByLabel,
      (value) => {
        next.idUsuarioSupervisor = value
      },
      (value) => {
        next.supervisorACargo = value
      }
    )

    return changed ? next : row
  }

  useEffect(() => {
    if (!modalOpen) return
    setGridRows((current) => {
      let changedAny = false
      const next = current.map((row) => {
        const hydrated = hydrateActorFields(row)
        if (hydrated !== row) changedAny = true
        return hydrated
      })
      return changedAny ? next : current
    })
  }, [modalOpen, auxiliarById, auxiliarByLabel, digitadorById, digitadorByLabel, supervisorById, supervisorByLabel])

  const resolveTecnicoListLabel = (row: ConformacionCuadrillaRecord): string => {
    const direct = readRecordString(row, RECORD_TECNICO_LABEL_KEYS, row.tecnico ?? '')
    return toVisualLabel(direct, 'Sin tecnico')
  }
  const resolveTecnicoEditableLabel = (row: EditableRow | null | undefined): string => {
    return toVisualLabel(row?.tecnico, 'Sin tecnico')
  }
  const buildRowTecnicoPrefix = (rowIndex: number, tecnicoLabel: string): string => {
    return `Fila ${rowIndex + 1} | Tecnico: ${tecnicoLabel}`
  }
  const resolveHabilidadListLabel = (row: ConformacionCuadrillaRecord): string => {
    const direct = readRecordString(row, ['habilidad', 'Habilidad'], row.habilidad ?? '')
    return toVisualLabel(direct, 'Ninguno')
  }
  const resolveCuentaSfListLabel = (row: ConformacionCuadrillaRecord): string => {
    const direct = readRecordString(row, CUENTA_SF_KEYS, row.cuentaSf ?? '')
    return toVisualLabel(direct, 'Ninguno')
  }
  const resolveSalesforceListLabel = (row: ConformacionCuadrillaRecord): string => {
    const direct = readRecordString(row, SALESFORCE_KEYS, row.salesforce ?? '')
    const cuenta = readRecordString(row, CUENTA_SF_KEYS, row.cuentaSf ?? '')
    const directKey = normalizeLookupKey(direct)
    const cuentaKey = normalizeLookupKey(cuenta)
    if (directKey && cuentaKey && directKey === cuentaKey) {
      const mappedSalesforce = salesforceByCuentaSf.get(cuentaKey)
      if (mappedSalesforce) {
        return toVisualLabel(mappedSalesforce, 'Ninguno')
      }
    }
    return toVisualLabel(direct, 'Ninguno')
  }
  const resolveConfirmadaRegistroIdLabel = (row: ConformacionCuadrillaRecord): string => {
    const idFromRecord =
      toNumericIdString(readValue(row as unknown as CatalogItem, RECORD_ID_KEYS)) ??
      toNumericIdString(readValue(row as unknown as CatalogItem, RECORD_ID_REGISTRO_KEYS)) ??
      toNumericIdString(row.id) ??
      toNumericIdString(row.idRegistro)
    return idFromRecord ?? 'N/D'
  }
  const resolveConfirmadaFechaLabel = (row: ConformacionCuadrillaRecord): string => {
    const fechaRegistroRaw = readRecordString(row, RECORD_FECHA_REGISTRO_KEYS, row.fechaRegistro ?? '')
    const fechaRaw = readRecordString(row, RECORD_FECHA_KEYS, row.fecha ?? '')
    const fechaRegistro = toISODate(fechaRegistroRaw)
    const fecha = toISODate(fechaRaw)
    if (fechaRegistro) return fechaRegistro
    if (fecha) return fecha
    return 'N/D'
  }
  const isRecordInConfirmadasDate = (row: ConformacionCuadrillaRecord, targetDate: string): boolean => {
    const fechaTrabajo = toISODate(row.fecha ?? undefined)
    const fechaRegistro = toISODate(row.fechaRegistro ?? undefined)
    if (fechaTrabajo) return fechaTrabajo === targetDate
    if (fechaRegistro) return fechaRegistro === targetDate
    return false
  }
  const selectedFechaFiltro = toISODate(filterFecha) || todayValue
  const generalFechaFiltro = todayValue
  const confirmadasFechaFiltro = activeTab === 'confirmadas' ? selectedFechaFiltro : todayValue
  const fechaFiltroForList = activeTab === 'confirmadas' ? confirmadasFechaFiltro : generalFechaFiltro
  const listQuery = useQuery({
    queryKey: [
      'conformacion-cuadrilla-tab-list',
      activeTab,
      sucursalActiva,
      fechaFiltroForList ?? '',
      listSearch,
      limitNumber,
    ],
    queryFn: () => {
      const params = {
        sucursal: sucursalActiva || undefined,
        fecha: fechaFiltroForList,
        q: listSearch || undefined,
        limite: limitNumber,
      }
      if (activeTab === 'general') return fetchConformacionCuadrillaPendientes(params)
      if (activeTab === 'confirmadas') return fetchConformacionCuadrillaConfirmadas(params)
      return fetchConformacionCuadrillaPendientes(params)
    },
    enabled: canViewCuadrillas,
  })
  const pendientesTotalQuery = useQuery({
    queryKey: ['conformacion-cuadrilla-tab-total', 'general', sucursalActiva, generalFechaFiltro ?? '', '', limitNumber],
    queryFn: () =>
      fetchConformacionCuadrillaPendientes({
        sucursal: sucursalActiva || undefined,
        fecha: generalFechaFiltro,
        limite: limitNumber,
      }),
    enabled: canViewCuadrillas,
  })
  const confirmadasTotalQuery = useQuery({
    queryKey: ['conformacion-cuadrilla-tab-total', 'confirmadas', sucursalActiva, confirmadasFechaFiltro, '', limitNumber],
    queryFn: () =>
      fetchConformacionCuadrillaConfirmadas({
        sucursal: sucursalActiva || undefined,
        fecha: confirmadasFechaFiltro,
        limite: limitNumber,
      }),
    enabled: canViewCuadrillas,
  })
  const sortByRegistroDesc = (rows: ConformacionCuadrillaRecord[]): ConformacionCuadrillaRecord[] => {
    return rows.sort((a, b) => {
      const aEstado = a.confirmada ? 'Confirmada' : resolveEstadoForList(a)
      const bEstado = b.confirmada ? 'Confirmada' : resolveEstadoForList(b)
      const aIsActivo = aEstado === 'ACTIVO' ? 0 : 1
      const bIsActivo = bEstado === 'ACTIVO' ? 0 : 1
      if (aIsActivo !== bIsActivo) return aIsActivo - bIsActivo
      const left = a.fechaRegistro ?? a.fecha ?? ''
      const right = b.fechaRegistro ?? b.fecha ?? ''
      return right.localeCompare(left)
    })
  }
  const confirmedDbTodaySignatureSet = useMemo(() => {
    const rows = (confirmadasTotalQuery.data ?? [])
      .map(normalizeListRecord)
      .filter((row) => row.confirmada === true && isRecordInConfirmadasDate(row, confirmadasFechaFiltro))
    return new Set(rows.map((row) => buildLocalConfirmedSignature(row)))
  }, [confirmadasFechaFiltro, confirmadasTotalQuery.data])

  const isConfirmedInDbToday = (row: ConformacionCuadrillaRecord): boolean => {
    const normalized = normalizeListRecord(row)
    return confirmedDbTodaySignatureSet.has(buildLocalConfirmedSignature(normalized))
  }
  const isRecordLockedForReassignment = (row: ConformacionCuadrillaRecord): boolean => {
    const normalized = normalizeListRecord(row)
    return normalized.confirmada === true || isConfirmedInDbToday(normalized)
  }

  const listDataForValidation = useMemo(() => {
    const normalized = (listQuery.data ?? []).map(normalizeListRecord)
    const filtered = normalized.filter((row) => {
      if (activeTab === 'confirmadas') {
        return row.confirmada === true && isRecordInConfirmadasDate(row, confirmadasFechaFiltro)
      }
      return row.confirmada !== true && !isRowEliminado(row) && !isConfirmedInDbToday(row)
    })
    return filtered.map((row) => {
      const key = getRecordSelectionKey(row)
      return sessionDraftByKey[key] ?? row
    })
  }, [activeTab, confirmadasFechaFiltro, confirmedDbTodaySignatureSet, listQuery.data, sessionDraftByKey])
  const confirmedRowsForConflictValidation = useMemo(() => {
    const rows = (confirmadasTotalQuery.data ?? [])
      .map(normalizeListRecord)
      .filter((row) => row.confirmada === true && isRecordInConfirmadasDate(row, confirmadasFechaFiltro) && !isRowEliminado(row))

    const sorted = sortByRegistroDesc([...rows])
    const seen = new Set<string>()
    const deduped: ConformacionCuadrillaRecord[] = []
    for (const row of sorted) {
      const versionKey = buildConfirmadasVersionKey(row) ?? getRecordSelectionKey(row)
      if (seen.has(versionKey)) continue
      seen.add(versionKey)
      deduped.push(row)
    }
    return deduped
  }, [confirmadasFechaFiltro, confirmadasTotalQuery.data])
  const recordsForConflictValidation = useMemo(() => {
    const merged = [...listDataForValidation, ...confirmedRowsForConflictValidation]
    const seen = new Set<string>()
    const unique: ConformacionCuadrillaRecord[] = []
    for (const row of merged) {
      const key = getRecordSelectionKey(row)
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(sessionDraftByKey[key] ?? row)
    }
    return unique
  }, [confirmedRowsForConflictValidation, listDataForValidation, sessionDraftByKey])
  const vehiculoOptionsAll = useMemo(() => {
    const byValue = new Map<string, SelectOption>()
    for (const option of vehiculoOptionsGlobal) {
      const key = String(option.value ?? '').trim().toUpperCase()
      if (!key) continue
      if (!byValue.has(key)) {
        byValue.set(key, option)
      }
    }
    return Array.from(byValue.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [vehiculoOptionsGlobal])
  const tecnicoActivoIdSet = useMemo(() => {
    const ids = new Set<string>()
    for (const record of recordsForConflictValidation) {
      const tecnicoId = toNumericIdString(readRecordId(record, RECORD_ID_TECNICO_KEYS, record.idTecnico))
      if (tecnicoId) ids.add(tecnicoId)
    }
    for (const row of gridRows) {
      const tecnicoId = toNumericIdString(row.idTecnico)
      if (tecnicoId) ids.add(tecnicoId)
    }
    return ids
  }, [gridRows, recordsForConflictValidation])
  const listData = useMemo(() => {
    const sorted = sortByRegistroDesc([...listDataForValidation])
    if (activeTab === 'confirmadas') {
      // El backend puede devolver historial (versiones). Conservamos solo la más reciente por cuadrilla.
      const seen = new Set<string>()
      const deduped: ConformacionCuadrillaRecord[] = []
      for (const row of sorted) {
        const versionKey = buildConfirmadasVersionKey(row)
        if (!versionKey) {
          deduped.push(row)
          continue
        }
        if (seen.has(versionKey)) continue
        seen.add(versionKey)
        deduped.push(row)
      }
      return deduped
    }
    if (activeTab !== 'general') return sorted
    // En General no ocultamos filas por compartir grupo o vehiculo.
    // Solo eliminamos duplicados exactos por clave de registro.
    const seen = new Set<string>()
    const deduped: ConformacionCuadrillaRecord[] = []
    for (const row of sorted) {
      const key = getRecordSelectionKey(row)
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(row)
    }
    return deduped
  }, [activeTab, listDataForValidation])
  const totalPendientes = useMemo(() => {
    const items = (pendientesTotalQuery.data ?? [])
      .map(normalizeListRecord)
      .filter((row) => !isRowEliminado(row) && row.confirmada !== true && !isConfirmedInDbToday(row))
    return items.length
  }, [confirmedDbTodaySignatureSet, pendientesTotalQuery.data])
  const totalConfirmadas = useMemo(() => {
    const items = (confirmadasTotalQuery.data ?? [])
      .map(normalizeListRecord)
      .filter((row) => row.confirmada === true && isRecordInConfirmadasDate(row, confirmadasFechaFiltro))
    return items.length
  }, [confirmadasFechaFiltro, confirmadasTotalQuery.data])
  const visibleListData = useMemo(() => {
    const query = listSearch.trim().toLowerCase()
    if (!query) return listData
    return listData.filter((row) => {
      const text = [
        row.fecha,
        row.estado,
        row.actividad,
        row.tecnico,
        row.auxiliar,
        row.digitador,
        row.supervisorACargo,
        row.vehiculo,
        row.grupo,
        row.sucursal,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ')
      return text.includes(query)
    })
  }, [listData, listSearch])
  const [page, setPage] = useState<number>(1)
  const pageSize = 50
  const totalPages = Math.max(1, Math.ceil(visibleListData.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [visibleListData, listSearch, filterFecha, filterSucursal, activeTab])

  const pagedVisibleData = useMemo(() => {
    const start = (page - 1) * pageSize
    return visibleListData.slice(start, start + pageSize)
  }, [visibleListData, page])
  const totalGeneral = totalPendientes + totalConfirmadas
  const sucursalActivaLabel = sucursalActiva || selectedSucursalLabel || loginSucursalLabel || 'Sin sucursal'
  const fechaActivaLabel = useMemo(() => {
    const activeFecha = activeTab === 'confirmadas' ? confirmadasFechaFiltro : generalFechaFiltro
    if (activeFecha === todayValue) return `${todayValue} (hoy)`
    return activeFecha
  }, [activeTab, confirmadasFechaFiltro, generalFechaFiltro, todayValue])
  const activeTabLabel = useMemo(
    () => CUADRILLA_LIST_TABS.find((tab) => tab.id === activeTab)?.label ?? 'General (pendientes)',
    [activeTab]
  )
  const canEditInActiveTab = activeTab === 'general'
  const canConfirmInActiveTab = activeTab !== 'confirmadas'
  const selectedRowsForConfirm = useMemo(() => {
    const selectedSet = new Set(selectedConfirmKeys)
    return visibleListData.filter((row) => selectedSet.has(getRecordSelectionKey(row)))
  }, [visibleListData, selectedConfirmKeys])

  useEffect(() => {
    setSelectedConfirmKeys([])
  }, [activeTab])

  useEffect(() => {
    const availableKeys = new Set(visibleListData.map(getRecordSelectionKey))
    setSelectedConfirmKeys((current) => current.filter((key) => availableKeys.has(key)))
  }, [visibleListData])

  const listDescription = `${activeTabLabel}: ${visibleListData.length}.`

  const isViewMode = modalMode === 'view'
  const isLocalViewMode = isViewMode && editingId === null
  const isReadOnlyMode = isViewMode || !canAsignarTecnicoGrupo
  const activeDetailDate = toISODate(gridRows[0]?.fecha)
  const isActiveDetailDateBeforeToday = Boolean(activeDetailDate) && activeDetailDate < todayValue
  const pastDateEditError = isActiveDetailDateBeforeToday
    ? `No se puede editar una cuadrilla con fecha ${formatDate(activeDetailDate) || activeDetailDate} porque es anterior a hoy (${formatDate(todayValue) || todayValue}).`
    : ''

  const resetDraft = () => {
    setEditingId(null)
    setEditInitialSnapshot(null)
    setShowStrictValidation(false)
    setShowAllVehiculos(false)
    setGridRows([createEmptyRow(session?.nombre, session?.idUsuario, sucursalActiva || selectedSucursalLabel || loginSucursalLabel)])
  }

  const handleOpenDetalle = (row: ConformacionCuadrillaRecord) => {
    const key = getRecordSelectionKey(row)
    const sessionDraft = sessionDraftByKey[key]
    const sourceRow = sessionDraft ?? row
    const idRegistro = getRecordRealId(row)
    const preloadedRow = applyMandatoryRowRules(toEditableRow(sourceRow))
    const detailDate = toISODate(preloadedRow.fecha)
    const isPastDate = Boolean(detailDate) && detailDate < todayValue
    const canOpenDirectEdit = canAsignarTecnicoGrupo && canEditInActiveTab && !isPastDate

    setSubmitError(null)
    setSuccess(null)
    setPendingConfirmation(null)
    setPendingReassignmentPrompt(null)
    setApprovedReassignments([])
    setShowAllVehiculos(false)
    setModalMode(canOpenDirectEdit ? 'edit' : 'view')
    setModalOpen(true)
    setShowStrictValidation(false)
    setActiveDetailConfirmKey(key)
    setEditingId(idRegistro)
    setEditingLoadId(null)
    setEditInitialSnapshot(buildEditAssignmentSnapshotFromRecord(normalizeListRecord(sourceRow)))
    setGridRows([preloadedRow])

    if (!canOpenDirectEdit && isPastDate) {
      setSubmitError(
        `No se puede editar una cuadrilla con fecha ${formatDate(detailDate) || detailDate} porque es anterior a hoy (${formatDate(todayValue) || todayValue}).`
      )
    }
  }

  const handleRefreshDetalle = async () => {
    if (!detalleApiDisponible) {
      setSubmitError('Detalle remoto deshabilitado por configuracion. Se muestra vista local.')
      return
    }
    if (editingId === null) {
      setSubmitError('Este registro no tiene id real para refresco remoto.')
      return
    }
    const baseRow = gridRows[0]
    setSubmitError(null)
    setEditingLoadId(editingId)
    try {
      const detail = await fetchConformacionCuadrillaById(editingId, sucursalActiva || undefined)
      const detailRow = applyMandatoryRowRules(toEditableRow(detail))
      const mergedRow = baseRow ? mergeEditableRows(baseRow, detailRow) : detailRow
      setGridRows([mergedRow])
      const detailSnapshot = buildEditAssignmentSnapshotFromRow(
        mergedRow,
        getRecordRutaId(detail) ?? editInitialSnapshot?.idRuta ?? null,
        sucursalActiva
      )
      setEditInitialSnapshot(detailSnapshot)
    } catch (error) {
      setSubmitError(toApiErrorText(error, 'No se pudo refrescar el detalle de la cuadrilla.'))
    } finally {
      setEditingLoadId(null)
    }
  }

  const handleEnableEdit = () => {
    if (!canAsignarTecnicoGrupo) return
    if (!canEditInActiveTab) {
      setSubmitError('La edicion solo esta habilitada para cuadrillas pendientes o confirmadas.')
      return
    }
    if (isActiveDetailDateBeforeToday) {
      setSubmitError(pastDateEditError)
      return
    }
    setSubmitError(null)
    setSuccess(null)
    setShowStrictValidation(false)
    setModalMode('edit')
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setModalMode('view')
    setShowStrictValidation(false)
    setPendingConfirmation(null)
    setPendingReassignmentPrompt(null)
    setApprovedReassignments([])
    setShowAllVehiculos(false)
    setActiveDetailConfirmKey(null)
    setSubmitError(null)
    resetDraft()
  }

  const handleToggleConfirmRow = (row: ConformacionCuadrillaRecord) => {
    const key = getRecordSelectionKey(row)
    setSelectedConfirmKeys((current) => {
      const willSelect = !current.includes(key)
      setSessionDraftByKey((drafts) => {
        const baseRecord = drafts[key] ?? row
        return {
          ...drafts,
          [key]: normalizeListRecord({
            ...baseRecord,
            estado: willSelect ? 'ACTIVO' : 'AUSENTE',
          }),
        }
      })
      return willSelect ? [...current, key] : current.filter((item) => item !== key)
    })
  }

  const isRowDetailLoading = (row: ConformacionCuadrillaRecord): boolean => {
    const rowId = getRecordRealId(row)
    if (editingLoadId === null || rowId === null) return false
    return editingLoadId === rowId
  }

  const columns: Column<ConformacionCuadrillaRecord>[] = [
    {
      key: 'cuadrilla',
      header: 'Preliminar',
      render: (row) => {
        const selectionKey = getRecordSelectionKey(row)
        const isSelected = selectedConfirmKeys.includes(selectionKey)
        const tecnicoLabel = resolveTecnicoListLabel(row)
        const auxiliarLabel = toVisualLabel(row.auxiliar, 'Sin auxiliar')
        const vehiculoLabel = toVisualLabel(row.vehiculo, 'Sin vehiculo')
        const habilidadLabel = resolveHabilidadListLabel(row)
        const cuentaSfLabel = resolveCuentaSfListLabel(row)
        const salesforceLabel = resolveSalesforceListLabel(row)
        const canToggleActive = canConfirmInActiveTab && canAsignarTecnicoGrupo
        const activeChecked = canConfirmInActiveTab ? isSelected : resolveEstadoForList(row) === 'ACTIVO'
        const rowDetailLoading = isRowDetailLoading(row)
        const registroIdLabel = resolveConfirmadaRegistroIdLabel(row)
        const fechaRegistroLabel = resolveConfirmadaFechaLabel(row)
        return (
          <div className="min-w-[250px] overflow-hidden rounded-2xl border border-slate-300 bg-white text-slate-900">
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-3">
                <div>
                  <span className={`inline-flex rounded-md px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] ${
                    resolveEstadoForList(row) === 'ACTIVO' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {resolveEstadoForList(row) === 'ACTIVO' ? 'Pendiente' : resolveEstadoForList(row)}
                  </span>
                  <p className="mt-2 break-words text-xl font-extrabold uppercase leading-tight text-blue-700">{tecnicoLabel}</p>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.06em] text-slate-600">Lider de cuadrilla</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20c1.4-2.8 4.2-4.2 8-4.2s6.6 1.4 8 4.2" /><circle cx="12" cy="9" r="3.2" /><path d="M8 7.8c.3-2.1 1.8-3.8 4-3.8s3.7 1.7 4 3.8" /><path d="M6.5 12h11" /></svg></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Auxiliar</p>
                  <p className="font-semibold text-slate-800">{auxiliarLabel}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Vehiculo</p>
                  <p className="font-semibold text-blue-700">{vehiculoLabel}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Habilidad</p>
                  <p className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{habilidadLabel}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">CuentaSF</p>
                  <p className="font-medium text-slate-800">{cuentaSfLabel}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Salesforce</p>
                  <p className="text-slate-700">{salesforceLabel}</p>
                </div>
                {activeTab === 'confirmadas' ? <p className="col-span-2 text-xs text-slate-500">ID registro: {registroIdLabel} | Fecha: {fechaRegistroLabel}</p> : null}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span>Activo</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
                  checked={activeChecked}
                  onChange={() => handleToggleConfirmRow(row)}
                  disabled={!canToggleActive}
                />
              </label>
              <Button
                variant="secondary"
                type="button"
                onClick={() => void handleOpenDetalle(row)}
                disabled={rowDetailLoading}
                className="h-10 w-12 rounded-xl border-slate-300 px-0 text-lg text-slate-700"
              >
                {rowDetailLoading ? '...' : '✎'}
              </Button>
            </div>
          </div>
        )
      },
    },
  ]
  const refreshCuadrillaListAfterWrite = async (): Promise<boolean> => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['conformacion-cuadrilla-tab-list'] })
      await queryClient.invalidateQueries({ queryKey: ['conformacion-cuadrilla-tab-total'] })
      return true
    } catch {
      return false
    }
  }

  const finalizeDefinitiveSave = async (confirmedKeys: string[], successMessage: string) => {
    const relatedSourceKeys = new Set<string>()
    for (const key of confirmedKeys) {
      const reassignments = sessionReassignmentsByKey[key] ?? []
      for (const reassignment of reassignments) {
        relatedSourceKeys.add(getRecordSelectionKey(reassignment.sourceRecord))
      }
    }

    if (confirmedKeys.length || relatedSourceKeys.size) {
      setSessionDraftByKey((current) => {
        const next = { ...current }
        for (const key of confirmedKeys) delete next[key]
        for (const key of relatedSourceKeys) delete next[key]
        return next
      })
      setSessionReassignmentsByKey((current) => {
        const next = { ...current }
        for (const key of confirmedKeys) delete next[key]
        return next
      })
    }

    setSubmitError(null)
    setSelectedConfirmKeys([])
    setPendingConfirmation(null)
    setPendingReassignmentPrompt(null)
    setApprovedReassignments([])
    setModalOpen(false)
    setModalMode('view')
    setActiveDetailConfirmKey(null)
    resetDraft()
    const refreshed = await refreshCuadrillaListAfterWrite()
    if (refreshed) {
      setSuccess(`${successMessage} y listado actualizado.`)
    } else {
      setSuccess(successMessage)
      setSubmitError('No se pudo refrescar automaticamente el listado. Recarga la pantalla.')
    }
  }

  const enrichRowsForConfirm = async (rows: ConformacionCuadrillaInput[]): Promise<ConformacionCuadrillaInput[]> => {
    const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0
    const toTecnicoId = (value: unknown): number | null => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return null
      return Math.trunc(parsed)
    }

    const detailCache = new Map<number, Promise<CatalogItem | null>>()
    const resolveDetail = (idTecnico: number): Promise<CatalogItem | null> => {
      const existing = detailCache.get(idTecnico)
      if (existing) return existing
      const req = fetchConformacionTecnicoDetalle(idTecnico, sucursalActiva || undefined)
        .then((detail) => detail)
        .catch(() => null)
      detailCache.set(idTecnico, req)
      return req
    }

    const enrichedRows = await Promise.all(
      rows.map(async (row) => {
        const needsCuenta = !hasText(row.cuentaSf)
        const needsSalesforce = !hasText(row.salesforce)
        if (!needsCuenta && !needsSalesforce) return row

        const tecnicoId = toTecnicoId(row.idTecnico)
        if (!tecnicoId) return row
        const detail = await resolveDetail(tecnicoId)
        if (!detail) return row

        const option = tecnicoById.get(String(tecnicoId))
        const resolved = resolveTecnicoFields(detail, option)
        return {
          ...row,
          cuentaSf: hasText(row.cuentaSf) ? row.cuentaSf : resolved.cuentaSf || row.cuentaSf,
          salesforce: hasText(row.salesforce) ? row.salesforce : resolved.salesforce || row.salesforce,
        }
      })
    )

    const missingIndex = enrichedRows.findIndex((row) => !hasText(row.cuentaSf) || !hasText(row.salesforce))
    if (missingIndex >= 0) {
      const missingRow = enrichedRows[missingIndex]
      const missingTecnicoId = normalizeTecnicoComparableId(missingRow?.idTecnico as string | number | null | undefined)
      const tecnicoFromCatalog = missingTecnicoId ? tecnicoById.get(missingTecnicoId)?.label : ''
      const tecnicoLabel = toVisualLabel(missingRow?.tecnico || tecnicoFromCatalog, 'Sin tecnico')
      throw new Error(
        `Fila ${missingIndex + 1} | Tecnico: ${tecnicoLabel}: no se pudo resolver cuentaSf/salesforce antes de confirmar.`
      )
    }

    return enrichedRows
  }

  const guardarConfirmadaMutation = useMutation({
    mutationFn: async ({
      payload,
    }: {
      payload: { filas: ConformacionCuadrillaInput[] }
      confirmedKeys: string[]
    }) => {
      const enrichedRows = await enrichRowsForConfirm(payload.filas)
      await guardarConformacionCuadrillaConfirmada({ filas: enrichedRows })
    },
    onSuccess: async (_data, variables) => {
      await finalizeDefinitiveSave(
        variables.confirmedKeys ?? [],
        'Cuadrilla confirmada guardada'
      )
    },
    onError: (err) => {
      setPendingConfirmation(null)
      setSuccess(null)
      setSubmitError(toApiErrorText(err, 'No se pudo guardar la conformacion. Verifica los datos.'))
    },
  })

  const rowIssues = useMemo(() => {
    const rows = gridRows.map(applyMandatoryRowRules)
    const baseIssues = rows.map(getRowIssues)
    const vehiculoCount = new Map<string, number>()
    const tecnicoCount = new Map<string, number>()
    const auxiliarCount = new Map<string, number>()
    for (const r of rows) {
      const v = String(r.vehiculo ?? '').trim().toLowerCase()
      if (v) vehiculoCount.set(v, (vehiculoCount.get(v) || 0) + 1)
      const t = String(r.idTecnico ?? '').trim()
      if (t) tecnicoCount.set(t, (tecnicoCount.get(t) || 0) + 1)
      const a = normalizeAuxiliarComparableId(r.idTecnicoAuxiliar)
      if (a) auxiliarCount.set(a, (auxiliarCount.get(a) || 0) + 1)
    }
    return baseIssues.map((issue, idx) => {
      const r = rows[idx]
      const vKey = String(r.vehiculo ?? '').trim().toLowerCase()
      const tKey = String(r.idTecnico ?? '').trim()
      const aKey = normalizeAuxiliarComparableId(r.idTecnicoAuxiliar)
      return {
        ...issue,
        duplicateVehiculo: vKey ? (vehiculoCount.get(vKey) || 0) > 1 : false,
        duplicateTecnico: tKey ? (tecnicoCount.get(tKey) || 0) > 1 : false,
        duplicateAuxiliar: aKey ? (auxiliarCount.get(aKey) || 0) > 1 : false,
      }
    })
  }, [gridRows, sucursalActiva])
  const hasIssues = rowIssues.some((issue) => issue.hasIssue)
  const requiredFieldLabels: Record<string, string> = {
    estado: 'estado',
    actividad: 'actividad',
    idTecnico: 'tecnico',
    idUsuarioSupervisor: 'supervisor',
    sucursal: 'sucursal',
    idUsuarioRegistra: 'usuario registra',
  }
  const formatMissingFields = (fields: string[]): string => fields.map((field) => requiredFieldLabels[field] ?? field).join(', ')

  const preConfirmRequiredLabels: Record<string, string> = {
    vehiculo: 'vehiculo',
    digitador: 'digitador',
    habilidad: 'habilidad',
    grupo: 'grupo',
  }
  const formatPreConfirmMissingFields = (fields: string[]): string =>
    fields.map((field) => preConfirmRequiredLabels[field] ?? field).join(', ')

  const getPreConfirmMissingFields = (row: EditableRow): string[] => {
    const missing: string[] = []
    if (!String(row.vehiculo ?? '').trim()) missing.push('vehiculo')
    if (!String(row.grupo ?? '').trim()) missing.push('grupo')
    if (!String(normalizeHabilidadValue(row.habilidad ?? '')).trim()) missing.push('habilidad')

    const hasDigitadorId = normalizeDigitadorComparableId(row.idUsuarioDigitador) !== ''
    const hasDigitadorLabel = normalizeDigitadorComparableLabel(row.digitador) !== ''
    if (!hasDigitadorId && !hasDigitadorLabel) missing.push('digitador')
    return missing
  }

  const isSameRecordAsDraftRow = (record: ConformacionCuadrillaRecord, row: EditableRow): boolean => {
    const recordId = getRecordRealId(record)
    const draftId = parseNumber(String(row.id ?? ''))
    if (recordId !== null && draftId !== null) {
      return recordId === draftId
    }
    const recordKey = getRecordSelectionKey(record)
    if (activeDetailConfirmKey && recordKey === activeDetailConfirmKey) {
      return true
    }
    return false
  }

const findVehiculoConflictRecord = (
  row: EditableRow,
  options?: { ignoreSelectionKey?: string }
): ConformacionCuadrillaRecord | null => {
  const vehiculoKey = String(row.vehiculo ?? '').trim().toLowerCase()
  const rowTecnicoId = normalizeTecnicoComparableId(row.idTecnico)
  if (!vehiculoKey) return null
  return (
    recordsForConflictValidation.find((record) => {
      const recordKey = getRecordSelectionKey(record)
      if (options?.ignoreSelectionKey && recordKey === options.ignoreSelectionKey) return false
      const recordVehiculoKey = String(record.vehiculo ?? '').trim().toLowerCase()
      if (!recordVehiculoKey || recordVehiculoKey !== vehiculoKey) return false
      if (isSameRecordAsDraftRow(record, row)) return false
      const recordTecnicoId = normalizeTecnicoComparableId(
        readRecordId(record, RECORD_ID_TECNICO_KEYS, record.idTecnico) as string | number | null | undefined
      )
      if (rowTecnicoId && recordTecnicoId && rowTecnicoId === recordTecnicoId) return false
      return true
    }) ?? null
  )
}

  const findAuxiliarConflictRecord = (
    row: EditableRow,
    options?: { ignoreSelectionKey?: string }
  ): ConformacionCuadrillaRecord | null => {
    const auxiliarId = normalizeAuxiliarComparableId(row.idTecnicoAuxiliar)
    const auxiliarLabelKey = normalizeAuxiliarComparableLabel(row.auxiliar)
    if (!auxiliarId && !auxiliarLabelKey) return null
    return (
      recordsForConflictValidation.find((record) => {
        const recordKey = getRecordSelectionKey(record)
        if (options?.ignoreSelectionKey && recordKey === options.ignoreSelectionKey) return false
        const recordAuxiliarId = normalizeAuxiliarComparableId(record.idTecnicoAuxiliar as number | string | null | undefined)
        const recordAuxiliarLabelKey = normalizeAuxiliarComparableLabel(record.auxiliar as string | null | undefined)
        const sameById = auxiliarId !== '' && recordAuxiliarId !== '' && recordAuxiliarId === auxiliarId
        const sameByLabel = auxiliarLabelKey !== '' && recordAuxiliarLabelKey !== '' && recordAuxiliarLabelKey === auxiliarLabelKey
        if (!sameById && !sameByLabel) return false
        if (isSameRecordAsDraftRow(record, row)) return false
        return true
      }) ?? null
    )
  }

  const isReassignmentApproved = (
    field: ReassignmentField,
    selectedValue: string,
    sourceRecord: ConformacionCuadrillaRecord,
    reassignments: AssignmentTransfer[]
  ): boolean => {
    const sourceId = getRecordRealId(sourceRecord)
    if (sourceId === null) return false
    return reassignments.some((item) => {
      if (item.field !== field) return false
      if (item.sourceId !== sourceId) return false
      return item.selectedValue.trim().toLowerCase() === selectedValue.trim().toLowerCase()
    })
  }

  const findFirstVehiculoOccupiedIndex = (
    rows: EditableRow[],
    reassignments: AssignmentTransfer[] = [],
    rowSelectionKeys?: string[]
  ): number => {
    return rows.findIndex((row, index) => {
      const conflict = findVehiculoConflictRecord(row, {
        ignoreSelectionKey: rowSelectionKeys?.[index],
      })
      if (!conflict) return false
      return !isReassignmentApproved('vehiculo', String(row.vehiculo ?? ''), conflict, reassignments)
    })
  }

  const findFirstAuxiliarOccupiedIndex = (
    rows: EditableRow[],
    reassignments: AssignmentTransfer[] = [],
    rowSelectionKeys?: string[]
  ): number => {
    return rows.findIndex((row, index) => {
      const conflict = findAuxiliarConflictRecord(row, {
        ignoreSelectionKey: rowSelectionKeys?.[index],
      })
      if (!conflict) return false
      return !isReassignmentApproved('auxiliar', normalizeAuxiliarComparableId(row.idTecnicoAuxiliar), conflict, reassignments)
    })
  }

  const findFirstAuxiliarTecnicoActivoIndex = (
    rows: EditableRow[],
    tecnicoActivos: Set<string>
  ): number => {
    const tecnicosBloqueados = new Set(tecnicoActivos)
    rows.forEach((row) => {
      const tecnicoId = toNumericIdString(row.idTecnico)
      if (tecnicoId) tecnicosBloqueados.add(tecnicoId)
    })

    return rows.findIndex((row) => {
      const auxiliarId = toNumericIdString(row.idTecnicoAuxiliar)
      if (!auxiliarId || auxiliarId === '0') return false
      const tecnicoId = toNumericIdString(row.idTecnico)
      if (tecnicoId && tecnicoId === auxiliarId) return false
      return tecnicosBloqueados.has(auxiliarId)
    })
  }

  const updateRow = (index: number, updater: (row: EditableRow) => EditableRow) => {
    setGridRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        return updater(row)
      })
    )
  }

  const handleRowChange = (index: number, field: keyof EditableRow, value: string) => {
    updateRow(index, (row) => ({ ...row, [field]: value }))
  }

  function applyMandatoryRowRules(row: EditableRow): EditableRow {
    const nextSucursal = sucursalActiva || row.sucursal
    const fallbackSupervisorId = currentUserRegistraId
    const resolvedSupervisorId = row.idUsuarioSupervisor || fallbackSupervisorId
    const resolvedSupervisorNombre = row.supervisorACargo || session?.nombre || ''
    return {
      ...row,
      fecha: toISODate(row.fecha) || todayISO(),
      estado: normalizeEstadoValue(row.estado),
      habilidad: normalizeHabilidadValue(row.habilidad),
      sucursal: toSucursalActiva(nextSucursal),
      idUsuarioSupervisor: resolvedSupervisorId,
      supervisorACargo: resolvedSupervisorNombre,
      idUsuarioRegistra: row.idUsuarioRegistra || currentUserRegistraId,
    }
  }

  const resolveTecnicoFields = (detail: CatalogItem, option?: SelectOption) => {
    const fallbackItem = option?.item
    const resolveValue = (keys: string[]): string => {
      const value = readString(detail, keys)
      if (value) return value
      if (fallbackItem) {
        const fallbackValue = readString(fallbackItem, keys)
        if (fallbackValue) return fallbackValue
      }
      return ''
    }

    return {
      tecnico: option?.label || resolveValue(TECNICO_LABEL_KEYS),
      cuentaSf: resolveValue(CUENTA_SF_KEYS),
      salesforce: resolveValue(SALESFORCE_KEYS),
      habilidad: normalizeHabilidadValue(resolveValue(HABILIDAD_KEYS)),
      vehiculo: resolveValue(VEHICULO_KEYS),
      grupo: resolveValue(GRUPO_KEYS),
      almacen: resolveValue(ALMACEN_KEYS),
      grupoDigitacion: resolveValue(GRUPO_DIGITACION_KEYS),
    }
  }

  const hasMissingTecnicoFields = (row: EditableRow): boolean => {
    return !row.cuentaSf.trim() || !row.salesforce.trim() || !row.almacen.trim() || !row.grupoDigitacion.trim() || !row.vehiculo.trim()
  }

  useEffect(() => {
    if (!modalOpen) return
    const currentRow = gridRows[0]
    if (!currentRow) return
    if (!hasMissingTecnicoFields(currentRow)) return
    const tecnicoId = parseNumber(currentRow.idTecnico)
    if (tecnicoId === null) return

    let cancelled = false
    const option = tecnicoById.get(String(tecnicoId))
    fetchConformacionTecnicoDetalle(tecnicoId, sucursalActiva || undefined)
      .then((detail) => {
        if (cancelled) return
        const resolved = resolveTecnicoFields(detail, option)
        setGridRows((rows) => {
          if (!rows.length) return rows
          const row = rows[0]
          const merged: EditableRow = {
            ...row,
            tecnico: pickValue(row.tecnico, resolved.tecnico),
            cuentaSf: pickValue(row.cuentaSf, resolved.cuentaSf),
            salesforce: pickValue(row.salesforce, resolved.salesforce),
            habilidad: pickValue(row.habilidad, resolved.habilidad),
            vehiculo: pickValue(row.vehiculo, resolved.vehiculo),
            grupo: pickValue(row.grupo, resolved.grupo),
            almacen: pickValue(row.almacen, resolved.almacen),
            grupoDigitacion: pickValue(row.grupoDigitacion, resolved.grupoDigitacion),
          }
          const changed =
            merged.tecnico !== row.tecnico ||
            merged.cuentaSf !== row.cuentaSf ||
            merged.salesforce !== row.salesforce ||
            merged.habilidad !== row.habilidad ||
            merged.vehiculo !== row.vehiculo ||
            merged.grupo !== row.grupo ||
            merged.almacen !== row.almacen ||
            merged.grupoDigitacion !== row.grupoDigitacion
          if (!changed) return rows
          return [merged, ...rows.slice(1)]
        })
      })
      .catch(() => {
        // Si falla el detalle tecnico, se conserva lo que ya viene en el row.
      })

    return () => {
      cancelled = true
    }
  }, [
    modalOpen,
    sucursalActiva,
    tecnicoById,
    gridRows[0]?.idTecnico,
    gridRows[0]?.cuentaSf,
    gridRows[0]?.salesforce,
    gridRows[0]?.almacen,
    gridRows[0]?.grupoDigitacion,
    gridRows[0]?.vehiculo,
  ])

  const clearApprovedReassignmentsByField = (field: ReassignmentField) => {
    setApprovedReassignments((current) => current.filter((item) => item.field !== field))
  }

  const buildUpdatePayloadFromRow = (row: EditableRow, currentUserId: number, currentSucursal: string): ConformacionCuadrillaInput => {
    const normalizedRow = applyMandatoryRowRules(row)
    const supervisorId = parseNumber(normalizedRow.idUsuarioSupervisor)
    const registraId = parseNumber(normalizedRow.idUsuarioRegistra)
    return {
      ...buildPayloadRow(normalizedRow),
      fecha: toISODate(normalizedRow.fecha) || selectedFechaFiltro || todayISO(),
      estado: mapEstadoForBackend(normalizedRow.estado),
      actividad: normalizeActividadForBackend(cleanString(normalizedRow.actividad)),
      idTecnico: parseNumber(normalizedRow.idTecnico) ?? undefined,
      idUsuarioSupervisor: supervisorId ?? Number(currentUserId),
      sucursal: currentSucursal,
      idUsuarioRegistra: registraId ?? Number(currentUserId),
      idUsuarioDigitador: parseNumber(normalizedRow.idUsuarioDigitador) ?? undefined,
      idTecnicoAuxiliar: parseAuxiliarIdForSave(normalizedRow.idTecnicoAuxiliar),
    }
  }

  const buildReleasePayloadFromRecord = (transfer: AssignmentTransfer): ConformacionCuadrillaInput => {
    const sourceRow = toEditableRow(transfer.sourceRecord)
    const sourceSucursal = toSucursalActiva(sourceRow.sucursal || sucursalActiva)
    const loginUserId = parseNumber(currentUserRegistraId)
    const sourceUserId = parseNumber(sourceRow.idUsuarioRegistra) ?? parseNumber(currentUserRegistraId)
    const payload: ConformacionCuadrillaInput = {
      ...buildPayloadRow(sourceRow),
      fecha: toISODate(sourceRow.fecha) || selectedFechaFiltro || todayISO(),
      estado: mapEstadoForBackend(sourceRow.estado),
      actividad: normalizeActividadForBackend(cleanString(sourceRow.actividad)),
      idTecnico: parseNumber(sourceRow.idTecnico) ?? undefined,
      idUsuarioSupervisor: loginUserId ?? parseNumber(sourceRow.idUsuarioSupervisor) ?? undefined,
      sucursal: sourceSucursal || sucursalActiva,
      idUsuarioRegistra: sourceUserId ?? undefined,
      idUsuarioDigitador: parseNumber(sourceRow.idUsuarioDigitador) ?? undefined,
      idTecnicoAuxiliar: parseAuxiliarIdForSave(sourceRow.idTecnicoAuxiliar),
    }

    if (transfer.field === 'vehiculo') {
      payload.vehiculo = ''
    } else {
      payload.idTecnicoAuxiliar = 0
      payload.auxiliar = ''
    }

    return payload
  }

  const runApprovedReassignments = async (reassignments: AssignmentTransfer[]): Promise<void> => {
    if (!reassignments.length) return
    const groupedBySource = new Map<string, AssignmentTransfer[]>()
    for (const item of reassignments) {
      const key = `${item.sourceTarget}:${item.sourceId}`
      const bucket = groupedBySource.get(key)
      if (bucket) {
        bucket.push(item)
      } else {
        groupedBySource.set(key, [item])
      }
    }

    for (const grouped of groupedBySource.values()) {
      const first = grouped[0]
      if (!first) continue
      const payload = buildReleasePayloadFromRecord(first)
      for (const entry of grouped) {
        if (entry.field === 'vehiculo') {
          payload.vehiculo = ''
        } else {
          payload.idTecnicoAuxiliar = 0
          payload.auxiliar = ''
        }
      }
      await updateConformacionCuadrilla(first.sourceId, payload, { target: first.sourceTarget })
    }
  }

  const upsertApprovedReassignment = (transfer: AssignmentTransfer) => {
    setApprovedReassignments((current) => {
      const filtered = current.filter((item) => item.field !== transfer.field)
      return [...filtered, transfer]
    })
  }

  const handleCancelReassignmentPrompt = () => {
    setPendingReassignmentPrompt(null)
  }

  const handleConfirmReassignmentPrompt = () => {
    if (!pendingReassignmentPrompt) return
    const prompt = pendingReassignmentPrompt
    if (isRecordLockedForReassignment(prompt.source.sourceRecord)) {
      setSubmitError('No se puede reasignar: la cuadrilla origen ya fue confirmada y tiene registro diario para la fecha.')
      return
    }
    upsertApprovedReassignment(prompt.source)
    setSubmitError(null)

    if (prompt.field === 'vehiculo') {
      updateRow(prompt.rowIndex, (row) => ({ ...row, vehiculo: prompt.selectedValue }))
    } else {
      updateRow(prompt.rowIndex, (row) => ({
        ...row,
        idTecnicoAuxiliar: prompt.selectedValue,
        auxiliar: prompt.selectedLabel,
      }))
    }

    setPendingReassignmentPrompt(null)
  }
  const isPendingReassignmentLocked = Boolean(
    pendingReassignmentPrompt && isRecordLockedForReassignment(pendingReassignmentPrompt.source.sourceRecord)
  )

  const handleTecnicoSelect = (index: number, value: string) => {
    const numericValue = parseNumber(value)
    const normalizedValue = numericValue !== null ? String(numericValue) : ''
    const option = tecnicoById.get(normalizedValue)
    const currentAuxiliarId = normalizeAuxiliarComparableId(gridRows[index]?.idTecnicoAuxiliar)
    // Prevent assigning the same tecnico to another cuadrilla (check grid and list)
    if (normalizedValue) {
      if (currentAuxiliarId && currentAuxiliarId === normalizedValue) {
        setSubmitError('El tecnico no puede ser el mismo que el auxiliar.')
        return
      }
      const inGrid = gridRows.some((r, i) => i !== index && String(r.idTecnico ?? '').trim() === normalizedValue)
      const currentGrupo = String(gridRows[index]?.grupo ?? '').trim().toLowerCase()
      const inList = recordsForConflictValidation.some(
        (r) => String(r.idTecnico ?? '').trim() === normalizedValue && String(r.grupo ?? '').trim().toLowerCase() !== currentGrupo
      )
      if (inGrid || inList) {
        setSubmitError('El tecnico ya esta asignado a otra cuadrilla.')
        return
      }
    }
    updateRow(index, (row) => {
      if (!normalizedValue) {
        return {
          ...row,
          idTecnico: '',
          tecnico: '',
          cuentaSf: '',
          salesforce: '',
          habilidad: '',
          vehiculo: '',
          grupo: '',
          almacen: '',
          grupoDigitacion: '',
        }
      }
      const clearedFields = {
        tecnico: '',
        cuentaSf: '',
        salesforce: '',
        habilidad: '',
        vehiculo: '',
        grupo: '',
        almacen: '',
        grupoDigitacion: '',
      }
      const prefill = option ? resolveTecnicoFields(option.item, option) : null
      return {
        ...row,
        idTecnico: normalizedValue,
        ...clearedFields,
        ...(prefill ?? {}),
      }
    })

    if (!normalizedValue) return
    const tecnicoId = Number(normalizedValue)

    fetchConformacionTecnicoDetalle(tecnicoId, sucursalActiva || undefined)
      .then((detail) => {
        updateRow(index, (row) => {
          if (row.idTecnico !== normalizedValue) return row
          const resolved = resolveTecnicoFields(detail, option)
          return {
            ...row,
            ...resolved,
          }
        })
      })
      .catch(() => {
        if (!option) return
        updateRow(index, (row) => {
          if (row.idTecnico !== normalizedValue) return row
          const resolved = resolveTecnicoFields(option.item, option)
          return {
            ...row,
            ...resolved,
          }
        })
      })
  }

  const handleAuxiliarSelect = (index: number, value: string) => {
    const normalizedValue = normalizeAuxiliarComparableId(value)
    const option = normalizedValue ? auxiliarById.get(normalizedValue) : undefined
    const currentTecnicoId = String(gridRows[index]?.idTecnico ?? '').trim()

    if (!normalizedValue) {
      clearApprovedReassignmentsByField('auxiliar')
      updateRow(index, (row) => ({ ...row, idTecnicoAuxiliar: '', auxiliar: '' }))
      return
    }

    if (currentTecnicoId && currentTecnicoId === normalizedValue) {
      setSubmitError('El auxiliar no puede ser el mismo que el tecnico.')
      return
    }

    if (tecnicoActivoIdSet.has(normalizedValue)) {
      setSubmitError('Un tecnico activo no puede asignarse como auxiliar.')
      return
    }

    // Prevent assigning the same auxiliar to another cuadrilla in the draft grid.
    if (normalizedValue) {
      const inGrid = gridRows.some((r, i) => i !== index && normalizeAuxiliarComparableId(r.idTecnicoAuxiliar) === normalizedValue)
      if (inGrid) {
        setSubmitError('El auxiliar ya esta asignado a otra cuadrilla en el borrador actual.')
        return
      }
    }

    const currentRow = gridRows[index]
    if (!currentRow) return
    const nextRow = { ...currentRow, idTecnicoAuxiliar: normalizedValue }
    const conflictRecord = findAuxiliarConflictRecord(nextRow)
    if (conflictRecord) {
      const sourceId = getRecordRealId(conflictRecord)
      if (sourceId === null) {
        setSubmitError('El auxiliar esta asignado a otra cuadrilla y no tiene id editable para reasignacion.')
        return
      }
      const sourceTarget: UpdateTarget = activeTab === 'confirmadas' ? 'dbordenres' : 'web'
      setPendingReassignmentPrompt({
        field: 'auxiliar',
        rowIndex: index,
        selectedValue: normalizedValue,
        selectedLabel: option?.label || '',
        source: {
          field: 'auxiliar',
          sourceId,
          sourceRecord: conflictRecord,
          sourceTarget,
          sourceGroupLabel: toVisualLabel(conflictRecord.grupo, 'Sin grupo'),
          sourceTecnicoLabel: resolveTecnicoListLabel(conflictRecord),
          sourceDisplayValue: toVisualLabel(conflictRecord.auxiliar, 'Sin auxiliar'),
          selectedValue: normalizedValue,
        },
      })
      return
    }

    clearApprovedReassignmentsByField('auxiliar')
    updateRow(index, (row) => ({ ...row, idTecnicoAuxiliar: normalizedValue, auxiliar: sanitizeAuxiliarLabel(option?.label || '') }))
  }

  const handleVehiculoSelect = (index: number, value: string) => {
    const normalizedValue = String(value ?? '').trim()

    if (!normalizedValue) {
      clearApprovedReassignmentsByField('vehiculo')
      updateRow(index, (row) => ({ ...row, vehiculo: '' }))
      return
    }

    // Prevent assigning the same vehiculo to another cuadrilla in the draft grid.
    const inGrid = gridRows.some((r, i) => i !== index && String(r.vehiculo ?? '').trim().toLowerCase() === normalizedValue.toLowerCase())
    if (inGrid) {
      setSubmitError('El vehiculo ya esta asignado a otra cuadrilla en el borrador actual.')
      return
    }

    const currentRow = gridRows[index]
    if (!currentRow) return
    const nextRow = { ...currentRow, vehiculo: normalizedValue }
    const conflictRecord = findVehiculoConflictRecord(nextRow)
    if (conflictRecord) {
      const sourceId = getRecordRealId(conflictRecord)
      if (sourceId === null) {
        setSubmitError('El vehiculo esta asignado a otra cuadrilla y no tiene id editable para reasignacion.')
        return
      }
      const sourceTarget: UpdateTarget = activeTab === 'confirmadas' ? 'dbordenres' : 'web'
      setPendingReassignmentPrompt({
        field: 'vehiculo',
        rowIndex: index,
        selectedValue: normalizedValue,
        selectedLabel: normalizedValue,
        source: {
          field: 'vehiculo',
          sourceId,
          sourceRecord: conflictRecord,
          sourceTarget,
          sourceGroupLabel: toVisualLabel(conflictRecord.grupo, 'Sin grupo'),
          sourceTecnicoLabel: resolveTecnicoListLabel(conflictRecord),
          sourceDisplayValue: toVisualLabel(conflictRecord.vehiculo, 'Sin vehiculo'),
          selectedValue: normalizedValue,
        },
      })
      return
    }

    clearApprovedReassignmentsByField('vehiculo')
    updateRow(index, (row) => ({ ...row, vehiculo: normalizedValue }))
  }

  const handleSalesforceSelect = (index: number, value: string) => {
    const selectedSalesforce = value.trim()
    const mappedCuentaSf = cuentaSfBySalesforce.get(normalizeLookupKey(selectedSalesforce)) ?? ''
    updateRow(index, (row) => ({
      ...row,
      salesforce: selectedSalesforce,
      cuentaSf: selectedSalesforce
        ? mappedCuentaSf || row.cuentaSf
        : '',
    }))
  }

  const handleGrupoSelect = (index: number, value: string) => {
    const option = grupoByValue.get(value)
    updateRow(index, (row) => ({
      ...row,
      grupo: option?.label || value,
      grupoDigitacion: option?.label || row.grupoDigitacion,
    }))
  }

  const handleDigitadorSelect = (index: number, value: string) => {
    const normalizedValue = normalizeDigitadorComparableId(value)
    const option = normalizedValue ? digitadorById.get(normalizedValue) : undefined
    updateRow(index, (row) => {
      if (!normalizedValue) {
        return { ...row, idUsuarioDigitador: '', digitador: '' }
      }
      const next: EditableRow = { ...row, idUsuarioDigitador: normalizedValue, digitador: sanitizeDigitadorLabel(option?.label || '') }
      return next
    })
  }

  const handleSupervisorSelect = (index: number, value: string) => {
    const numericValue = parseNumber(value)
    const normalizedValue = numericValue !== null ? String(numericValue) : ''
    const option = supervisorById.get(normalizedValue)
    updateRow(index, (row) => {
      if (!normalizedValue) {
        return { ...row, idUsuarioSupervisor: '', supervisorACargo: '' }
      }
      const next: EditableRow = {
        ...row,
        idUsuarioSupervisor: normalizedValue,
        supervisorACargo: option?.label || '',
        idUsuarioRegistra: currentUserRegistraId || row.idUsuarioRegistra,
      }
      return next
    })
  }

  const handleReset = () => {
    setSubmitError(null)
    setSuccess(null)
    setPendingConfirmation(null)
    setPendingReassignmentPrompt(null)
    setApprovedReassignments([])
    setShowAllVehiculos(false)
    setShowStrictValidation(false)
    setModalMode('view')
  }

  const openConfirmationModal = (
    payload: { filas: ConformacionCuadrillaInput[] },
    confirmedKeys: string[],
    reassignments?: AssignmentTransfer[],
    updateItems?: PendingUpdateItem[]
  ) => {
    setPendingConfirmation({ mode: 'create', payload, confirmedKeys, reassignments, updateItems })
  }

  const handleCancelPendingConfirmation = () => {
    setPendingConfirmation(null)
  }

  const handleConfirmPendingConfirmation = async () => {
    if (!pendingConfirmation) return
    setSubmitError(null)

    if (pendingConfirmation.reassignments?.length) {
      setIsResolvingReassignments(true)
      try {
        await runApprovedReassignments(pendingConfirmation.reassignments)
      } catch (error) {
        setSubmitError(toApiErrorText(error, 'No se pudo desligar la asignacion actual para completar la reasignacion.'))
        setIsResolvingReassignments(false)
        return
      } finally {
        setIsResolvingReassignments(false)
      }
    }

    const updateItems = pendingConfirmation.updateItems ?? []
    if (updateItems.length) {
      setIsResolvingReassignments(true)
      try {
        for (const item of updateItems) {
          await updateConformacionCuadrilla(item.id, item.payload, { target: item.target })
        }
      } catch (error) {
        setSubmitError(toApiErrorText(error, 'No se pudo actualizar una cuadrilla confirmada.'))
        setIsResolvingReassignments(false)
        return
      } finally {
        setIsResolvingReassignments(false)
      }
    }

    const hasCreates = pendingConfirmation.payload.filas.length > 0
    setApprovedReassignments([])
    if (hasCreates) {
      guardarConfirmadaMutation.mutate({
        payload: pendingConfirmation.payload,
        confirmedKeys: pendingConfirmation.confirmedKeys,
      })
      return
    }

    await finalizeDefinitiveSave(
      pendingConfirmation.confirmedKeys,
      'Cuadrilla confirmada actualizada'
    )
  }

  const handleSubmit = async () => {
    if (!canAsignarTecnicoGrupo) {
      setSubmitError('No tienes permiso para asignar tecnico a grupo (tsm_ConformacionCuadrillas).')
      return
    }
    setShowStrictValidation(true)
    setSubmitError(null)
    setSuccess(null)

    if (hasIssues) {
      const firstIssueIndex = rowIssues.findIndex((issue) => issue.hasIssue)
      const firstIssue = firstIssueIndex >= 0 ? rowIssues[firstIssueIndex] : null
      const firstIssueTecnicoLabel = resolveTecnicoEditableLabel(gridRows[firstIssueIndex])
      const firstIssuePrefix = buildRowTecnicoPrefix(firstIssueIndex, firstIssueTecnicoLabel)
      if (firstIssue && firstIssue.missingFields.length > 0) {
        setSubmitError(`${firstIssuePrefix}: faltan campos requeridos (${formatMissingFields(firstIssue.missingFields)}).`)
      } else if (firstIssue?.duplicateVehiculo) {
        setSubmitError(`${firstIssuePrefix}: el vehiculo ya esta asignado a otra cuadrilla.`)
      } else if (firstIssue?.duplicateTecnico) {
        setSubmitError(`${firstIssuePrefix}: el tecnico ya esta asignado a otra cuadrilla.`)
      } else if (firstIssue?.duplicateAuxiliar) {
        setSubmitError(`${firstIssuePrefix}: el auxiliar ya esta asignado a otra cuadrilla.`)
      } else if (firstIssue?.idConflict) {
        const r = gridRows[firstIssueIndex]
        const idTec = (String(r.idTecnico ?? '')).trim()
        const idAux = normalizeAuxiliarComparableId(r.idTecnicoAuxiliar)
        const idDig = (String(r.idUsuarioDigitador ?? '')).trim()
        if (idTec !== '' && idAux !== '' && idTec === idAux) {
          setSubmitError(`${firstIssuePrefix}: el auxiliar no puede ser el mismo que el tecnico.`)
        } else if (idTec !== '' && idDig !== '' && idTec === idDig) {
          setSubmitError(`${firstIssuePrefix}: el digitador no puede ser el mismo que el tecnico.`)
        } else {
          setSubmitError(`${firstIssuePrefix}: conflicto de IDs en tecnico/auxiliar/digitador.`)
        }
      } else if (firstIssue?.invalidEstado) {
        setSubmitError(`${firstIssuePrefix}: estado invalido. Solo se permite ACTIVO o AUSENTE.`)
      } else {
        setSubmitError('Hay errores en la grilla. Revisa las filas marcadas antes de guardar.')
      }
      return
    }

    if (!sucursalActiva) {
      setSubmitError('Selecciona una sucursal para continuar.')
      return
    }

    const rowsToSubmit = gridRows.map(applyMandatoryRowRules)
    const draftRow = rowsToSubmit[0]
    if (!draftRow) {
      setSubmitError('No se encontro una fila para guardar cambios en la sesion.')
      return
    }
    const missingPreConfirmFields = getPreConfirmMissingFields(draftRow)
    if (missingPreConfirmFields.length > 0) {
      setSubmitError(`Fila 1: faltan campos requeridos (${formatPreConfirmMissingFields(missingPreConfirmFields)}).`)
      return
    }
    const activeReassignments = approvedReassignments.filter((item) => {
      const currentRow = draftRow
      if (!currentRow) return false
      if (editingId !== null && item.sourceId === editingId) return false
      if (item.field === 'vehiculo') {
        return String(currentRow.vehiculo ?? '').trim().toLowerCase() === item.selectedValue.trim().toLowerCase()
      }
      return normalizeAuxiliarComparableId(currentRow.idTecnicoAuxiliar) === normalizeAuxiliarComparableId(item.selectedValue)
    })
    const draftAuxiliarSnapshot = {
      idTecnicoAuxiliar: normalizeAuxiliarComparableId(draftRow.idTecnicoAuxiliar),
      auxiliar: normalizeAuxiliarComparableLabel(draftRow.auxiliar),
    }
    const auxiliarWasChangedInEdit = editInitialSnapshot
      ? draftAuxiliarSnapshot.idTecnicoAuxiliar !== editInitialSnapshot.idTecnicoAuxiliar ||
        draftAuxiliarSnapshot.auxiliar !== editInitialSnapshot.auxiliar
      : true
    const hasAuxiliarReassignment = activeReassignments.some((item) => item.field === 'auxiliar')
    const shouldValidateAuxiliarConflicts = auxiliarWasChangedInEdit || hasAuxiliarReassignment

    const firstVehiculoOccupiedIndex = findFirstVehiculoOccupiedIndex(rowsToSubmit, activeReassignments)
    if (firstVehiculoOccupiedIndex >= 0) {
      const tecnicoLabel = resolveTecnicoEditableLabel(rowsToSubmit[firstVehiculoOccupiedIndex])
      const prefix = buildRowTecnicoPrefix(firstVehiculoOccupiedIndex, tecnicoLabel)
      setSubmitError(`${prefix}: el vehiculo ya esta asignado a otra cuadrilla.`)
      return
    }
    if (modalMode === 'edit' && isActiveDetailDateBeforeToday) {
      setSubmitError(pastDateEditError)
      return
    }
    if (shouldValidateAuxiliarConflicts) {
      const firstAuxiliarOccupiedIndex = findFirstAuxiliarOccupiedIndex(rowsToSubmit, activeReassignments)
      if (firstAuxiliarOccupiedIndex >= 0) {
        const tecnicoLabel = resolveTecnicoEditableLabel(rowsToSubmit[firstAuxiliarOccupiedIndex])
        const prefix = buildRowTecnicoPrefix(firstAuxiliarOccupiedIndex, tecnicoLabel)
        setSubmitError(`${prefix}: el auxiliar ya esta asignado a otra cuadrilla.`)
        return
      }
      const firstAuxiliarTecnicoActivoIndex = findFirstAuxiliarTecnicoActivoIndex(rowsToSubmit, tecnicoActivoIdSet)
      if (firstAuxiliarTecnicoActivoIndex >= 0) {
        const tecnicoLabel = resolveTecnicoEditableLabel(rowsToSubmit[firstAuxiliarTecnicoActivoIndex])
        const prefix = buildRowTecnicoPrefix(firstAuxiliarTecnicoActivoIndex, tecnicoLabel)
        setSubmitError(`${prefix}: un tecnico activo no puede asignarse como auxiliar.`)
        return
      }
    }
    const targetKey = activeDetailConfirmKey
    if (!targetKey) {
      setSubmitError('No se pudo resolver la cuadrilla para guardar cambios en sesion.')
      return
    }

    const targetBaseRecord =
      sessionDraftByKey[targetKey] ??
      listDataForValidation.find((record) => getRecordSelectionKey(record) === targetKey) ??
      listData.find((record) => getRecordSelectionKey(record) === targetKey)
    if (!targetBaseRecord) {
      setSubmitError('No se encontro la cuadrilla en el listado para aplicar cambios.')
      return
    }

    const normalizedBaseRecord = normalizeListRecord(targetBaseRecord)
    const normalizedDraftRecord = normalizeListRecord({
      ...normalizedBaseRecord,
      fecha: toISODate(draftRow.fecha) || normalizedBaseRecord.fecha || todayISO(),
      estado: normalizeEstadoValue(draftRow.estado),
      actividad: normalizeActividadForBackend(cleanString(draftRow.actividad)),
      idTecnico: parseNumber(draftRow.idTecnico) ?? undefined,
      cuentaSf: cleanString(draftRow.cuentaSf),
      salesforce: cleanString(draftRow.salesforce),
      habilidad: normalizeHabilidadValue(draftRow.habilidad),
      vehiculo: cleanString(draftRow.vehiculo),
      grupo: cleanString(draftRow.grupo),
      almacen: cleanString(draftRow.almacen),
      grupoDigitacion: cleanString(draftRow.grupoDigitacion),
      idUsuarioDigitador: parseNumber(draftRow.idUsuarioDigitador) ?? undefined,
      digitador: cleanString(draftRow.digitador),
      tecnico: cleanString(draftRow.tecnico),
      idTecnicoAuxiliar: parseNumber(draftRow.idTecnicoAuxiliar) ?? undefined,
      auxiliar: cleanString(draftRow.auxiliar),
      idUsuarioSupervisor: parseNumber(draftRow.idUsuarioSupervisor) ?? undefined,
      supervisorACargo: cleanString(draftRow.supervisorACargo),
      sucursal: cleanString(sucursalActiva || draftRow.sucursal || normalizedBaseRecord.sucursal || ''),
      observacion: cleanString(draftRow.observacion),
      idUsuarioRegistra:
        parseNumber(draftRow.idUsuarioRegistra) ??
        parseNumber(draftRow.idUsuarioSupervisor) ??
        toOptionalNumber(normalizedBaseRecord.idUsuarioRegistra),
    })
    const idRutaRelacion = getRecordRutaId(normalizedDraftRecord) ?? getRecordRutaId(normalizedBaseRecord)
    const idTecnicoAuxiliarRelacionRaw = parseNumber(draftRow.idTecnicoAuxiliar)
    const idTecnicoAuxiliarRelacion = idTecnicoAuxiliarRelacionRaw ?? 0
    const idUsuarioDigitadorRelacion = parseNumber(draftRow.idUsuarioDigitador)
    const auxiliarRelacion = cleanString(draftRow.auxiliar)
    const digitadorRelacion = cleanString(draftRow.digitador)
    const hasRelacionValues =
      idTecnicoAuxiliarRelacionRaw !== null ||
      auxiliarRelacion !== '' ||
      idUsuarioDigitadorRelacion !== null ||
      digitadorRelacion !== ''
    const recordsByKey = new Map(listDataForValidation.map((record) => [getRecordSelectionKey(record), record]))

    if (activeTab === 'confirmadas') {
      if (editingId === null) {
        setSubmitError('No se pudo resolver el id de la cuadrilla confirmada para actualizar.')
        return
      }
      const currentUserId = parseNumber(currentUserRegistraId)
      if (currentUserId === null) {
        setSubmitError('No se pudo resolver idUsuarioRegistra del usuario actual para actualizar.')
        return
      }

      const updatePayload = buildUpdatePayloadFromRow(draftRow, currentUserId, sucursalActiva)
      setIsResolvingReassignments(true)
      try {
        if (activeReassignments.length) {
          await runApprovedReassignments(activeReassignments)
        }
        await updateConformacionCuadrilla(editingId, updatePayload, { target: 'dbordenres' })
      } catch (error) {
        setSubmitError(toApiErrorText(error, 'No se pudo actualizar la cuadrilla confirmada en BDControlOrdenes.'))
        setIsResolvingReassignments(false)
        return
      } finally {
        setIsResolvingReassignments(false)
      }

      await finalizeDefinitiveSave(
        [targetKey],
        'Cuadrilla confirmada actualizada'
      )
      return
    }

    if (hasRelacionValues) {
      if (idRutaRelacion === null) {
        setSubmitError('No se pudo resolver idRuta para guardar auxiliar/digitador en relacion_cuadrillas.')
        return
      }

      const relationPayload: ConformacionCuadrillaRelacionPayload = {
        idRuta: idRutaRelacion,
        idTecnicoAuxiliar: idTecnicoAuxiliarRelacion,
        auxiliar: auxiliarRelacion || null,
        idUsuarioDigitador: idUsuarioDigitadorRelacion,
        digitador: digitadorRelacion || null,
        sucursal: cleanString(sucursalActiva || draftRow.sucursal || normalizedBaseRecord.sucursal || '') || null,
        activo: true,
      }

      try {
        await guardarRelacionCuadrilla(relationPayload)
      } catch (error) {
        setSubmitError(toApiErrorText(error, 'No se pudo guardar auxiliar/digitador en relacion_cuadrillas.'))
        return
      }
    }

    setSessionDraftByKey((current) => {
      const next = { ...current, [targetKey]: normalizedDraftRecord }
      for (const reassignment of activeReassignments) {
        const sourceKey = getRecordSelectionKey(reassignment.sourceRecord)
        const sourceRecord = next[sourceKey] ?? current[sourceKey] ?? recordsByKey.get(sourceKey) ?? reassignment.sourceRecord
        const normalizedSource = normalizeListRecord(sourceRecord)
        next[sourceKey] = normalizeListRecord(
          reassignment.field === 'vehiculo'
            ? { ...normalizedSource, vehiculo: '' }
            : { ...normalizedSource, idTecnicoAuxiliar: undefined, auxiliar: '' }
        )
      }
      return next
    })
    setSessionReassignmentsByKey((current) => {
      const next = { ...current }
      if (activeReassignments.length) {
        next[targetKey] = activeReassignments
      } else {
        delete next[targetKey]
      }
      return next
    })
    setSelectedConfirmKeys((current) => {
      const nextIsActivo = normalizeEstadoValue(draftRow.estado) === 'ACTIVO'
      if (nextIsActivo) {
        if (current.includes(targetKey)) return current
        return [...current, targetKey]
      }
      return current.filter((key) => key !== targetKey)
    })

    setApprovedReassignments([])
    setPendingReassignmentPrompt(null)
    setPendingConfirmation(null)
    setModalOpen(false)
    setModalMode('view')
    setActiveDetailConfirmKey(null)
    setEditInitialSnapshot(null)
    setSubmitError(null)
    setSuccess('Cambios guardados en sesion.')
    resetDraft()
  }

  const isSaving = guardarConfirmadaMutation.isPending || isResolvingReassignments

  const handleGuardarTodasCuadrillas = async () => {
    if (!canAsignarTecnicoGrupo) {
      setSubmitError('No tienes permiso para asignar tecnico a grupo (tsm_ConformacionCuadrillas).')
      return
    }
    if (!canConfirmInActiveTab) {
      setSubmitError('La pestana Confirmadas no permite confirmar registros.')
      return
    }
    if (selectedRowsForConfirm.length === 0) {
      setSubmitError('Selecciona al menos una cuadrilla con el check para confirmar.')
      return
    }

    setSubmitError(null)
    setSuccess(null)

    const currentUserId = parseNumber(currentUserRegistraId)
    if (currentUserId === null) {
      setSubmitError('No se pudo resolver idUsuarioRegistra del usuario actual.')
      return
    }
    if (!sucursalActiva) {
      setSubmitError('Selecciona una sucursal para continuar.')
      return
    }

    const selectedRows = selectedRowsForConfirm
    const selectedReassignments = selectedRows.flatMap((row) => sessionReassignmentsByKey[getRecordSelectionKey(row)] ?? [])
    const selectedRowKeys = selectedRows.map(getRecordSelectionKey)

    const tecnicoIdByLabel = new Map(
      tecnicoOptions.map((option) => [option.label.trim().toLowerCase(), option.value])
    )
    const rows = selectedRows.map((record) => {
      const row = applyMandatoryRowRules(toEditableRow(record))
      if (!row.idTecnico) {
        const label = (row.tecnico || '').trim().toLowerCase()
        const mappedId = tecnicoIdByLabel.get(label)
        if (mappedId) {
          row.idTecnico = mappedId
        }
      }
      return row
    })
    const issues = rows.map(getRowIssues)
    const firstIssueIndex = issues.findIndex((issue) => issue.hasIssue)
    if (firstIssueIndex >= 0) {
      const firstIssue = issues[firstIssueIndex]
      const firstIssueTecnicoLabel = selectedRows[firstIssueIndex]
        ? resolveTecnicoListLabel(selectedRows[firstIssueIndex])
        : resolveTecnicoEditableLabel(rows[firstIssueIndex])
      const firstIssuePrefix = buildRowTecnicoPrefix(firstIssueIndex, firstIssueTecnicoLabel)
      if (firstIssue.missingFields.length > 0) {
        setSubmitError(`${firstIssuePrefix}: faltan campos requeridos (${formatMissingFields(firstIssue.missingFields)}).`)
      } else if (firstIssue.idConflict) {
        setSubmitError(`${firstIssuePrefix}: el auxiliar no puede ser el mismo tecnico.`)
      } else if (firstIssue.invalidEstado) {
        setSubmitError(`${firstIssuePrefix}: estado invalido. Solo se permite ACTIVO o AUSENTE.`)
      } else {
        setSubmitError('Hay errores en el listado. Revisa las filas antes de guardar.')
      }
      return
    }
    const firstVehiculoOccupiedIndex = findFirstVehiculoOccupiedIndex(rows, selectedReassignments, selectedRowKeys)
    if (firstVehiculoOccupiedIndex >= 0) {
      const tecnicoLabel = selectedRows[firstVehiculoOccupiedIndex]
        ? resolveTecnicoListLabel(selectedRows[firstVehiculoOccupiedIndex])
        : resolveTecnicoEditableLabel(rows[firstVehiculoOccupiedIndex])
      const prefix = buildRowTecnicoPrefix(firstVehiculoOccupiedIndex, tecnicoLabel)
      setSubmitError(`${prefix}: el vehiculo ya esta asignado a otra cuadrilla.`)
      return
    }
    const firstAuxiliarOccupiedIndex = findFirstAuxiliarOccupiedIndex(rows, selectedReassignments, selectedRowKeys)
    if (firstAuxiliarOccupiedIndex >= 0) {
      const tecnicoLabel = selectedRows[firstAuxiliarOccupiedIndex]
        ? resolveTecnicoListLabel(selectedRows[firstAuxiliarOccupiedIndex])
        : resolveTecnicoEditableLabel(rows[firstAuxiliarOccupiedIndex])
      const prefix = buildRowTecnicoPrefix(firstAuxiliarOccupiedIndex, tecnicoLabel)
      setSubmitError(`${prefix}: el auxiliar ya esta asignado a otra cuadrilla.`)
      return
    }
    const firstAuxiliarTecnicoActivoIndex = findFirstAuxiliarTecnicoActivoIndex(rows, tecnicoActivoIdSet)
    if (firstAuxiliarTecnicoActivoIndex >= 0) {
      const tecnicoLabel = selectedRows[firstAuxiliarTecnicoActivoIndex]
        ? resolveTecnicoListLabel(selectedRows[firstAuxiliarTecnicoActivoIndex])
        : resolveTecnicoEditableLabel(rows[firstAuxiliarTecnicoActivoIndex])
      const prefix = buildRowTecnicoPrefix(firstAuxiliarTecnicoActivoIndex, tecnicoLabel)
      setSubmitError(`${prefix}: un tecnico activo no puede asignarse como auxiliar.`)
      return
    }
    const missingPreConfirmIndex = rows.findIndex((row) => getPreConfirmMissingFields(row).length > 0)
    if (missingPreConfirmIndex >= 0) {
      const missing = getPreConfirmMissingFields(rows[missingPreConfirmIndex] ?? createEmptyRow())
      const missingRecord = selectedRows[missingPreConfirmIndex]
      const missingRow = rows[missingPreConfirmIndex]
      const tecnicoLabel = missingRecord
        ? resolveTecnicoListLabel(missingRecord)
        : toVisualLabel(missingRow?.tecnico, 'Sin tecnico')
      setSubmitError(
        `Fila ${missingPreConfirmIndex + 1} | Tecnico: ${tecnicoLabel}: para confirmar el pre-marcado faltan (${formatPreConfirmMissingFields(missing)}).`
      )
      return
    }

    const payloadRows = rows.map((row) => buildUpdatePayloadFromRow(row, currentUserId, sucursalActiva))
    const updateItems: PendingUpdateItem[] = []
    // Al confirmar marcado (boton azul), siempre se crea en BDOrdenes.
    // No se debe convertir en update web por tener un id de ruta/local.
    const createRowsBase: ConformacionCuadrillaInput[] = payloadRows.filter(
      (payload): payload is ConformacionCuadrillaInput => Boolean(payload)
    )
    let createRows: ConformacionCuadrillaInput[] = createRowsBase
    try {
      createRows = await enrichRowsForConfirm(createRowsBase)
    } catch (error) {
      setSubmitError(toApiErrorText(error, 'No se pudo validar la informacion antes de confirmar el marcado.'))
      return
    }

    openConfirmationModal(
      { filas: createRows },
      selectedRows.map(getRecordSelectionKey),
      selectedReassignments,
      updateItems
    )
  }

  const errorMessage = useMemo(() => {
    if (!listQuery.isError) return null
    return toApiErrorText(listQuery.error, 'No se pudo cargar el listado.')
  }, [listQuery.error, listQuery.isError])
  const totalsErrorMessage = useMemo(() => {
    const firstError = pendientesTotalQuery.error ?? confirmadasTotalQuery.error
    if (!firstError) return null
    return toApiErrorText(firstError, 'No se pudo cargar uno o mas totales del tablero.')
  }, [confirmadasTotalQuery.error, pendientesTotalQuery.error])
  const emptyListMessage = useMemo(() => {
    const queryText = listSearch.trim()
    const fechaLabel = activeTab === 'confirmadas' ? confirmadasFechaFiltro : generalFechaFiltro

    if (activeTab === 'confirmadas') {
      if (!sucursalActiva) {
        return 'Selecciona una sucursal para ver cuadrillas confirmadas de BDControlOrdenes.'
      }
      if (queryText) {
        return `No hay cuadrillas confirmadas que coincidan con "${queryText}".`
      }
      return `No hay cuadrillas confirmadas en BDControlOrdenes para ${sucursalActivaLabel} en fecha ${fechaLabel}.`
    }

    if (queryText) {
      return `No hay cuadrillas pendientes que coincidan con "${queryText}".`
    }
    return `No hay cuadrillas pendientes para ${sucursalActivaLabel} en fecha ${fechaLabel}.`
  }, [activeTab, confirmadasFechaFiltro, generalFechaFiltro, listSearch, sucursalActiva, sucursalActivaLabel])
  const hasPendingReassignments = Boolean(pendingConfirmation?.reassignments?.length)

  if (!canViewCuadrillas) {
    return (
      <FormCard title="Conformacion de Cuadrillas" description="No tienes permisos para este modulo.">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Requiere tsm_ConformacionCuadrillas.
        </div>
      </FormCard>
    )
  }

  return (
    <div className="bento-page -mt-2 gap-3 sm:gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Conformación de Cuadrillas</h2>
            <p className="mt-0.5 text-sm font-medium tracking-tight text-slate-600">Gestión de personal en {sucursalActivaLabel}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,0.8fr))] xl:w-[680px]">
            <div className="flex min-h-12 items-center rounded-lg border border-blue-100 bg-slate-50 px-3 text-[11px] font-semibold tracking-wide text-slate-700">
              FECHA ACTIVA: <span className="ml-1 text-blue-700">{fechaActivaLabel}</span>
            </div>
            <div className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-700">Pendientes</p>
              <p className="mt-0.5 text-xl font-extrabold leading-none text-blue-700">{pendientesTotalQuery.isLoading ? '...' : totalPendientes}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-700">Confirmadas</p>
              <p className="mt-0.5 text-xl font-extrabold leading-none text-slate-400">{confirmadasTotalQuery.isLoading ? '...' : totalConfirmadas}</p>
            </div>
            <div className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-700">Total</p>
              <p className="mt-0.5 text-xl font-extrabold leading-none text-slate-900">{pendientesTotalQuery.isLoading || confirmadasTotalQuery.isLoading ? '...' : totalGeneral}</p>
            </div>
          </div>
        </div>
      </section>

      {!canAsignarTecnicoGrupo ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Solo lectura: para asignar tecnico a grupo necesitas tsm_ConformacionCuadrillas.
        </div>
      ) : null}
      {!canVerDatosTecnico ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Ver datos del tecnico bloqueado: requiere tsm_ConformacionCuadrillas.
        </div>
      ) : null}
      {submitError && !modalOpen ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{submitError}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>
      ) : null}
      {totalsErrorMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {totalsErrorMessage}
        </div>
      ) : null}

      <FormCard
        title="Listado"
        description={listDescription}
        hideHeader
        compact
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Tabs items={CUADRILLA_LIST_TABS} activeId={activeTab} onChange={(id) => setActiveTab(id as CuadrillaListTab)} />
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowListFilters((current) => !current)}
              className="w-full sm:w-auto"
            >
              {showListFilters ? 'Ocultar filtros' : 'Filtros'}
            </Button>
            {canConfirmInActiveTab && (isSaving || selectedRowsForConfirm.length > 0) ? (
              <Button
                variant="primary"
                type="button"
                disabled={!canAsignarTecnicoGrupo || isSaving || listQuery.isLoading || !sucursalActiva || selectedRowsForConfirm.length === 0}
                onClick={handleGuardarTodasCuadrillas}
                className="w-full sm:w-auto"
              >
                {isSaving ? 'Guardando...' : `Subir marcado de hoy (${selectedRowsForConfirm.length})`}
              </Button>
            ) : null}
          </div>
        </div>
        {showListFilters ? (
          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
              <span>Fecha</span>
              <input
                className="input-base h-9 border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:ring-sky-200"
                type="date"
                value={activeTab === 'confirmadas' ? selectedFechaFiltro : generalFechaFiltro}
                onChange={(event) => {
                  if (activeTab === 'general') return
                  setFilterFecha(event.target.value || todayValue)
                }}
                disabled={activeTab === 'general'}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
              <span>Buscar</span>
              <input
                className="input-base h-9 border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:ring-sky-200"
                type="text"
                value={listSearchInput}
                onChange={(event) => setListSearchInput(event.target.value)}
                placeholder="Tecnico, auxiliar, digitador, actividad, vehiculo..."
              />
            </label>
            <Button
              variant="secondary"
              type="button"
              className="h-9 xl:self-end"
              onClick={() => {
                if (activeTab === 'confirmadas') {
                  setFilterFecha(todayValue)
                }
                setListSearchInput('')
              }}
              disabled={activeTab === 'confirmadas' ? filterFecha === todayValue && !listSearchInput : !listSearchInput}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : null}
        <div className="mb-4 hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 sm:block">
          {activeTab === 'confirmadas'
            ? 'Origen de Confirmadas: tabla tbl_ConformacionCuadrillaDiario (endpoint /supervisor/conformacion-cuadrilla/confirmadas).'
            : `Origen activo por sucursal: ${selectedInitialSource === 'DB_SUCRE' ? 'DB Sucre' : 'U Tecnicos'}. El listado y catalogos se cargan desde conformacion-cuadrilla-web.`}
        </div>
        {listQuery.isLoading ? (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Cargando listado...</div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {pagedVisibleData.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500">
                  {emptyListMessage}
                </div>
              ) : (
                pagedVisibleData.map((row, index) => {
                  const selectionKey = getRecordSelectionKey(row)
                  const isSelected = selectedConfirmKeys.includes(selectionKey)
                  const rowDetailLoading = isRowDetailLoading(row)
                  const tecnicoLabel = resolveTecnicoListLabel(row)
                  const auxiliarLabel = toVisualLabel(row.auxiliar, 'Sin auxiliar')
                  const vehiculoLabel = toVisualLabel(row.vehiculo, 'Sin vehiculo')
                  const habilidadLabel = resolveHabilidadListLabel(row)
                  const cuentaSfLabel = resolveCuentaSfListLabel(row)
                  const salesforceLabel = resolveSalesforceListLabel(row)
                  const canToggleActive = canConfirmInActiveTab && canAsignarTecnicoGrupo
                  const activeChecked = canConfirmInActiveTab ? isSelected : resolveEstadoForList(row) === 'ACTIVO'
                  const registroIdLabel = resolveConfirmadaRegistroIdLabel(row)
                  const fechaRegistroLabel = resolveConfirmadaFechaLabel(row)
                  return (
                    <div key={`mobile-card-${selectionKey}-${index}`} className="overflow-hidden rounded-3xl border border-slate-300 bg-white text-slate-900 shadow-sm">
                      <div className="p-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_56px] gap-3">
                          <div className="min-w-0">
                            <span className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.08em] ${
                              resolveEstadoForList(row) === 'ACTIVO' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {resolveEstadoForList(row) === 'ACTIVO' ? 'Pendiente' : resolveEstadoForList(row)}
                            </span>
                            <p className="mt-2 break-words text-2xl font-extrabold uppercase leading-tight text-blue-700 sm:text-3xl">{tecnicoLabel}</p>
                            <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Lider de cuadrilla</p>
                          </div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20c1.4-2.8 4.2-4.2 8-4.2s6.6 1.4 8 4.2" /><circle cx="12" cy="9" r="3.2" /><path d="M8 7.8c.3-2.1 1.8-3.8 4-3.8s3.7 1.7 4 3.8" /><path d="M6.5 12h11" /></svg></div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-700">
                          <p><span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Auxiliar</span><span className="font-semibold">{auxiliarLabel}</span></p>
                          <p><span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Vehiculo</span><span className="font-semibold text-blue-700">{vehiculoLabel}</span></p>
                          <p><span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Habilidad</span><span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-semibold">{habilidadLabel}</span></p>
                          <p><span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">CuentaSF</span>{cuentaSfLabel}</p>
                          <p className="col-span-2"><span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Salesforce</span>{salesforceLabel}</p>
                          {activeTab === 'confirmadas' ? <p className="col-span-2 text-xs text-slate-500">ID registro: {registroIdLabel} | Fecha: {fechaRegistroLabel}</p> : null}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <span>Activo</span>
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
                            checked={activeChecked}
                            onChange={() => handleToggleConfirmRow(row)}
                            disabled={!canToggleActive}
                          />
                        </label>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => void handleOpenDetalle(row)}
                          disabled={rowDetailLoading}
                          className="h-11 w-12 rounded-xl border-slate-300 px-0 text-lg text-slate-700"
                        >
                          {rowDetailLoading ? '...' : '✎'}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="hidden md:block">
              <Table
                columns={columns}
                data={pagedVisibleData}
                emptyLabel={emptyListMessage}
                variant="row-block"
                hideHeader
                desktopMinWidthClass="min-w-[980px]"
                desktopScrollMode="always"
                desktopHeightClass="h-[58vh]"
                stickyHeader
              />
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <div>Mostrando {Math.min(visibleListData.length, (page - 1) * pageSize + 1)} - {Math.min(visibleListData.length, page * pageSize)} de {visibleListData.length}</div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                    Anterior
                  </Button>
                  <span>Pagina {page} / {totalPages}</span>
                  <Button variant="secondary" type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </FormCard>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[1px]">
          <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-white sm:mx-auto sm:my-6 sm:h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)] sm:max-w-[1560px] sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                  {editingId ? `Detalle registro #${editingId}` : 'Detalle de cuadrilla'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isViewMode
                    ? activeTab === 'general'
                      ? 'Vista desde listado. Puedes editar la cuadrilla.'
                      : activeTab === 'confirmadas'
                        ? 'Vista desde listado. Esta cuadrilla confirmada es solo lectura.'
                        : 'Vista desde listado. En esta pestana solo esta disponible modo lectura.'
                    : 'Modo edicion habilitado.'}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                {isViewMode && activeTab !== 'confirmadas' ? (
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleEnableEdit}
                    disabled={!canAsignarTecnicoGrupo || !canEditInActiveTab}
                    className="w-full sm:w-auto"
                  >
                    Editar
                  </Button>
                ) : isViewMode ? null : (
                  <Button variant="secondary" type="button" onClick={handleReset} className="w-full sm:w-auto">
                    Cancelar edicion
                  </Button>
                )}
                {activeTab !== 'confirmadas' && editingId !== null && detalleApiDisponible ? (
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => void handleRefreshDetalle()}
                    disabled={editingLoadId === editingId}
                    className="w-full sm:w-auto"
                  >
                    {editingLoadId === editingId ? 'Refrescando...' : 'Refrescar detalle'}
                  </Button>
                ) : null}
                {activeTab !== 'confirmadas' ? (
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleReset}
                    disabled={isViewMode || !canAsignarTecnicoGrupo}
                    className="w-full sm:w-auto"
                  >
                    Limpiar
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-200 sm:w-auto"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="glass-panel p-3 sm:p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Nota: la fecha se usa automaticamente con hoy y la sucursal se fija desde el login. El auxiliar no puede ser el mismo tecnico.
          </div>



          <div className="mt-4 space-y-4">
            {gridRows.map((row, index) => {
              const issue = rowIssues[index]
              const shouldHighlightRowIssue = Boolean(issue?.hasIssue) && showStrictValidation && !isLocalViewMode
              const isLocalMissingInfo = Boolean(issue?.missingFields?.length) && isLocalViewMode
              // Mantener el mismo set de campos en vista previa y en edicion
              // para evitar saltos visuales al presionar "Editar".
              const isCompactEditMode = true
              const rowVehiculoOptionsByTecnico = row.idTecnico ? vehiculoOptionsByTecnico.get(row.idTecnico) ?? [] : []
              const rowVehiculoOptions = showAllVehiculos ? vehiculoOptionsAll : rowVehiculoOptionsByTecnico
              const rowVehiculoByValue = new Set(rowVehiculoOptions.map((option) => option.value))
              const rowSalesforceByValue = new Set(salesforceOptions.map((option) => normalizeLookupKey(option.salesforce)))
              const isVehiculosLoading =
                showAllVehiculos
                  ? vehiculosTodosQuery.isFetching && rowVehiculoOptions.length === 0
                  : Boolean(row.idTecnico) && vehiculosPorTecnicoQuery.isFetching && rowVehiculoOptionsByTecnico.length === 0
              const rowGrupoOption = grupoByValue.get(row.grupo) ?? grupoByLabel.get(row.grupo)
              const rowGrupoSelectValue = row.grupo ? rowGrupoOption?.value ?? row.grupo : ''
              const hasMappedGrupoOption = Boolean(row.grupo && rowGrupoOption)
              return (
                <div
                  key={'row-' + index}
                  className={'rounded-2xl border p-3 shadow-sm sm:p-4 ' + (shouldHighlightRowIssue ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white')}
                >
                  {issue?.idConflict || issue?.missingFields?.length ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4">
                      {issue?.idConflict ? (
                        <span className="rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                          Tecnico y auxiliar no pueden ser iguales
                        </span>
                      ) : null}
                      {issue?.missingFields?.length ? (
                        <span
                          className={
                            'rounded-full border px-2 py-0.5 text-[11px] font-medium ' +
                            (isLocalMissingInfo
                              ? 'border-sky-300 bg-sky-100 text-sky-700'
                              : 'border-amber-300 bg-amber-100 text-amber-700')
                          }
                        >
                          {isLocalMissingInfo
                            ? `Aviso local: faltan ${formatMissingFields(issue.missingFields)}.`
                            : `Faltan: ${formatMissingFields(issue.missingFields)}`}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:col-span-1 xl:col-span-2">
                      {isCompactEditMode ? (
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                          <span>Activo</span>
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
                            checked={normalizeEstadoValue(row.estado) === 'ACTIVO'}
                            onChange={(event) => handleRowChange(index, 'estado', event.target.checked ? 'ACTIVO' : 'AUSENTE')}
                            disabled={isReadOnlyMode}
                          />
                        </label>
                      ) : (
                        <div className="grid gap-3">
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Estado</span>
                            <select
                              className="input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                              value={row.estado}
                              onChange={(event) => handleRowChange(index, 'estado', event.target.value)}
                              disabled={isReadOnlyMode}
                            >
                              {ESTADO_OPTIONS.map((option) => (
                                <option key={'estado-' + option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Actividad</span>
                            <select
                              className="input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                              value={row.actividad}
                              onChange={(event) => handleRowChange(index, 'actividad', event.target.value)}
                              disabled={actividadesQuery.isLoading || isReadOnlyMode}
                            >
                              <option value="">
                                {actividadesQuery.isLoading ? 'Cargando actividades...' : 'Selecciona actividad'}
                              </option>
                              {row.actividad && !actividadByValue.has(row.actividad) ? (
                                <option value={row.actividad}>{row.actividad}</option>
                              ) : null}
                              {actividadOptions.map((option) => (
                                <option key={'actividad-' + option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:col-span-1 xl:col-span-5">
                      <p className="text-base font-bold text-slate-900">Tecnico</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800 sm:col-span-2">
                          <span>Tecnico (selector)</span>
                          <select
                            className={
                              'input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200 ' +
                              (issue?.idConflict ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200' : '')
                            }
                            value={row.idTecnico}
                            onChange={(event) => handleTecnicoSelect(index, event.target.value)}
                            disabled={tecnicosQuery.isLoading || isReadOnlyMode}
                          >
                            <option value="">
                              {tecnicosQuery.isLoading ? 'Cargando tecnicos...' : 'Selecciona tecnico'}
                            </option>
                            {row.idTecnico && !tecnicoById.has(row.idTecnico) ? (
                              <option value={row.idTecnico}>{row.tecnico || 'Tecnico seleccionado'}</option>
                            ) : null}
                            {tecnicoOptions.map((option) => (
                              <option key={'tecnico-' + option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {!isCompactEditMode ? (
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Cuenta</span>
                            <input
                              className="input-base h-9 border-slate-400 bg-slate-100 px-3 text-xs font-semibold text-slate-700 shadow-sm"
                              value={canVerDatosTecnico ? row.cuentaSf : ''}
                              placeholder={canVerDatosTecnico ? '' : 'Sin permiso (tsm_ConformacionCuadrillas)'}
                              readOnly
                            />
                          </label>
                        ) : null}
                        {!isCompactEditMode ? (
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Grupo</span>
                            <select
                              className="input-base h-9 max-h-72 overflow-y-auto border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                              value={rowGrupoSelectValue}
                              onChange={(event) => handleGrupoSelect(index, event.target.value)}
                              disabled={gruposQuery.isLoading || isReadOnlyMode}
                            >
                              <option value="">{gruposQuery.isLoading ? 'Cargando grupos...' : 'Selecciona grupo'}</option>
                              {row.grupo && !hasMappedGrupoOption ? <option value={row.grupo}>{row.grupo}</option> : null}
                              {gruposOptions.map((option) => (
                                <option key={'grupo-' + option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {!isCompactEditMode ? (
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Salesforce</span>
                            <input
                              className="input-base h-9 border-slate-400 bg-slate-100 px-3 text-xs font-semibold text-slate-700 shadow-sm"
                              value={canVerDatosTecnico ? row.salesforce : ''}
                              placeholder={canVerDatosTecnico ? '' : 'Sin permiso (tsm_ConformacionCuadrillas)'}
                              readOnly
                            />
                          </label>
                        ) : null}
                        {!isCompactEditMode ? (
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Almacen</span>
                            <input
                              className="input-base h-9 border-slate-400 bg-slate-100 px-3 text-xs font-semibold text-slate-700 shadow-sm"
                              value={canVerDatosTecnico ? row.almacen : ''}
                              placeholder={canVerDatosTecnico ? '' : 'Sin permiso (tsm_ConformacionCuadrillas)'}
                              readOnly
                            />
                          </label>
                        ) : null}
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                          <span>Habilidad</span>
                          <select
                            className="input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                            value={row.habilidad}
                            onChange={(event) => handleRowChange(index, 'habilidad', event.target.value)}
                            disabled={isReadOnlyMode}
                          >
                            <option value="">Ninguno</option>
                            {HABILIDAD_OPTIONS.map((option) => (
                              <option key={'habilidad-' + option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="sm:col-span-2 mt-1 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Salesforce</span>
                            <select
                              className="input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                              value={canVerDatosTecnico ? row.salesforce : ''}
                              onChange={(event) => handleSalesforceSelect(index, event.target.value)}
                              disabled={isReadOnlyMode || !canVerDatosTecnico || !row.idTecnico}
                            >
                              <option value="">
                                {canVerDatosTecnico ? 'Selecciona salesforce' : 'Sin permiso (tsm_ConformacionCuadrillas)'}
                              </option>
                              {row.salesforce && !rowSalesforceByValue.has(normalizeLookupKey(row.salesforce)) ? (
                                <option value={row.salesforce}>{row.salesforce}</option>
                              ) : null}
                              {salesforceOptions.map((option) => (
                                <option key={`salesforce-${normalizeLookupKey(option.salesforce)}`} value={option.salesforce}>
                                  {option.salesforce}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Cuenta SF</span>
                            <input
                              className="input-base h-9 border-slate-400 bg-slate-100 px-3 text-xs font-semibold text-slate-700 shadow-sm"
                              value={canVerDatosTecnico ? row.cuentaSf : ''}
                              placeholder={canVerDatosTecnico ? '' : 'Sin permiso (tsm_ConformacionCuadrillas)'}
                              readOnly
                            />
                          </label>
                        </div>
                        {!isCompactEditMode ? (
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>G. digit</span>
                            <input
                              className="input-base h-9 border-slate-400 bg-slate-100 px-3 text-xs font-semibold text-slate-700 shadow-sm"
                              value={canVerDatosTecnico ? row.grupoDigitacion : ''}
                              placeholder={canVerDatosTecnico ? '' : 'Sin permiso (tsm_ConformacionCuadrillas)'}
                              readOnly
                            />
                          </label>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 md:col-span-2 xl:col-span-5">
                      <p className="text-base font-bold text-slate-900">Asignacion</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                          <span>Vehiculo</span>
                          <select
                            className="input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                            value={row.vehiculo}
                            onChange={(event) => handleVehiculoSelect(index, event.target.value)}
                            disabled={isReadOnlyMode || !row.idTecnico || isVehiculosLoading}
                          >
                            <option value="">
                              {!row.idTecnico
                                ? 'Selecciona tecnico primero'
                                : isVehiculosLoading
                                  ? 'Cargando vehiculos...'
                                  : 'Ninguno'}
                            </option>
                            {row.vehiculo && !rowVehiculoByValue.has(row.vehiculo) ? (
                                <option value={row.vehiculo}>{row.vehiculo}</option>
                            ) : null}
                            {rowVehiculoOptions.map((option) => (
                              <option key={'vehiculo-' + option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-600">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-300"
                              checked={showAllVehiculos}
                              onChange={(event) => setShowAllVehiculos(event.target.checked)}
                              disabled={isReadOnlyMode || !row.idTecnico}
                            />
                            <span>Ver todos los vehiculos</span>
                          </div>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                          <span>Fecha</span>
                          <input
                            className="input-base h-9 border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-700 shadow-sm"
                            value={todayValue}
                            readOnly
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                          <span>Digitador</span>
                          <select
                            className="input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                            value={row.idUsuarioDigitador}
                            onChange={(event) => handleDigitadorSelect(index, event.target.value)}
                            disabled={digitadoresQuery.isLoading || isReadOnlyMode}
                          >
                            <option value="">
                              {digitadoresQuery.isLoading ? 'Cargando digitadores...' : 'Ninguno'}
                            </option>
                            {row.idUsuarioDigitador && !digitadorById.has(row.idUsuarioDigitador) ? (
                              <option value={row.idUsuarioDigitador}>{sanitizeDigitadorLabel(row.digitador) || 'Ninguno'}</option>
                            ) : null}
                            {digitadorOptions.map((option) => (
                              <option key={'digitador-' + option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                          <span>Auxiliar</span>
                          <select
                            className={
                              'input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200 ' +
                              (issue?.idConflict ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200' : '')
                            }
                            value={row.idTecnicoAuxiliar}
                            onChange={(event) => handleAuxiliarSelect(index, event.target.value)}
                            disabled={tecnicosQuery.isLoading || isReadOnlyMode}
                          >
                            <option value="">
                              {tecnicosQuery.isLoading ? 'Cargando tecnicos...' : 'Ninguno'}
                            </option>
                            {normalizeAuxiliarComparableId(row.idTecnicoAuxiliar) !== '' && !auxiliarById.has(row.idTecnicoAuxiliar) ? (
                              <option value={row.idTecnicoAuxiliar}>{sanitizeAuxiliarLabel(row.auxiliar) || 'Ninguno'}</option>
                            ) : null}
                            {auxiliarOptions.map((option) => (
                              <option
                                key={'auxiliar-' + option.value}
                                value={option.value}
                                disabled={option.value === row.idTecnico || tecnicoActivoIdSet.has(option.value)}
                              >
                                {option.label}
                                {option.value === row.idTecnico
                                  ? ' (mismo tecnico)'
                                  : tecnicoActivoIdSet.has(option.value)
                                    ? ' (tecnico activo)'
                                    : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                        {!isCompactEditMode ? (
                          <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                            <span>Supervisor</span>
                            <select
                              className="input-base h-9 border-sky-300 bg-sky-50 px-3 text-xs font-semibold shadow-sm focus:border-sky-500 focus:ring-sky-200"
                              value={row.idUsuarioSupervisor}
                              onChange={(event) => handleSupervisorSelect(index, event.target.value)}
                              disabled={supervisoresQuery.isLoading || isReadOnlyMode}
                            >
                              <option value="">
                                {supervisoresQuery.isLoading ? 'Cargando supervisores...' : 'Selecciona supervisor'}
                              </option>
                              {row.idUsuarioSupervisor && !supervisorById.has(row.idUsuarioSupervisor) ? (
                                <option value={row.idUsuarioSupervisor}>{row.supervisorACargo || 'Supervisor seleccionado'}</option>
                              ) : null}
                              {supervisorOptions.map((option) => (
                                <option key={'supervisor-' + option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800">
                          <span>Sucursal</span>
                          <input
                            className="input-base h-9 border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-700 shadow-sm"
                            value={sucursalActiva || selectedSucursalLabel || loginSucursalLabel || row.sucursal}
                            readOnly
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-600 [&>span]:font-semibold [&>span]:text-slate-800 sm:col-span-2">
                          <span>Observacion</span>
                          <input
                            className="input-base h-9 border-slate-400 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:ring-sky-200"
                            value={row.observacion}
                            onChange={(event) => handleRowChange(index, 'observacion', event.target.value)}
                            disabled={isReadOnlyMode}
                          />
                        </label>
                      </div>
                    </section>
                  </div>
                </div>
              )
            })}
          </div>

          {submitError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{submitError}</div>
          ) : null}
          {success ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            {showStrictValidation && !isLocalViewMode && hasIssues ? (
              <span className="text-xs text-rose-500 sm:mr-auto">Hay filas con errores.</span>
            ) : null}
            {activeTab === 'confirmadas' && isViewMode ? null : (
              <Button type="button" onClick={handleSubmit} disabled={isSaving || !canAsignarTecnicoGrupo || !sucursalActiva} className="w-full sm:w-auto">
                {isSaving
                  ? 'Guardando...'
                  : !canAsignarTecnicoGrupo
                    ? 'Sin permiso para asignar'
                    : activeTab === 'confirmadas'
                      ? 'Guardar edicion'
                      : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </div>
            </div>
          </div>
        </div>
      ) : null}
      <Modal
        open={Boolean(pendingReassignmentPrompt)}
        title={
          pendingReassignmentPrompt?.field === 'auxiliar'
            ? 'Auxiliar asignado en otra cuadrilla'
            : 'Vehiculo asignado en otra cuadrilla'
        }
        onClose={handleCancelReassignmentPrompt}
        actions={
          <>
            <Button variant="secondary" onClick={handleCancelReassignmentPrompt} type="button" disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmReassignmentPrompt} type="button" disabled={isSaving || isPendingReassignmentLocked}>
              Reasignar
            </Button>
          </>
        }
      >
        {pendingReassignmentPrompt ? (
          <div className="space-y-2">
            <p>
              Este {pendingReassignmentPrompt.field} ya esta asignado a otra cuadrilla.
            </p>
            <p>
              Cuadrilla actual: <span className="font-semibold">{pendingReassignmentPrompt.source.sourceGroupLabel}</span> | Tecnico:{' '}
              <span className="font-semibold">{pendingReassignmentPrompt.source.sourceTecnicoLabel}</span>
            </p>
            <p>
              Valor asignado: <span className="font-semibold">{pendingReassignmentPrompt.source.sourceDisplayValue}</span>
            </p>
            {isPendingReassignmentLocked ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Reasignacion bloqueada: esta cuadrilla ya fue confirmada y existe registro en tbl_conformacioncuadrilladiario para la fecha.
              </p>
            ) : (
              <p>Si confirmas, se desligara de esa cuadrilla y se asignara aqui al guardar.</p>
            )}
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(pendingConfirmation)}
        title="Confirmar marcado de hoy"
        onClose={handleCancelPendingConfirmation}
        actions={
          <>
            <Button variant="secondary" onClick={handleCancelPendingConfirmation} type="button" disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPendingConfirmation} type="button" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Confirmar'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p>{CONFIRMAR_MARCADO_MODAL_TEXT}</p>
          {hasPendingReassignments ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Se aplicara una reasignacion previa para desligar vehiculo/auxiliar de su cuadrilla actual.
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}

export default ConformacionCuadrillaPage

