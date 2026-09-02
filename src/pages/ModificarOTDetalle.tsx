import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import Field from '../components/common/Field'
import Table, { type Column } from '../components/common/Table'
import Modal from '../components/common/Modal'
import {
  agregarMaterialModificarHoy,
  fetchOtModificableHoy,
  fetchOtRegistroCompleto,
  updateOtCantidadesHoy,
  type OtMaterialModificable,
  type OtModificableHoy,
} from '../api/otApi'
import {
  fetchChipIdBySerie,
  fetchProductos,
  fetchProductosCargoUsuario,
  fetchProductosMascara,
  fetchProductosSinFungible,
  fetchTipoMaterial,
  validarSerieChipUnico,
  validarSerieSaldo,
  type CatalogItem,
} from '../api/catalogApi'
import { getApiErrorMessage } from '../services/httpClient'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'

type SavedValidation = {
  idVenta: number
  idCodigoVenta: number
  cantidad: number
}

type UnknownRecord = Record<string, unknown>

type DetailNavState = {
  idVenta?: number
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms))

const formatDateTime = (value: string): string => {
  if (!value) return '-'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('es-BO')
}

const readRaw = (row: UnknownRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value)
  }
  for (const [entryKey, entryValue] of Object.entries(row)) {
    if (keys.some((key) => key.toLowerCase() === entryKey.toLowerCase())) {
      if (entryValue !== undefined && entryValue !== null && String(entryValue).trim() !== '') return String(entryValue)
    }
  }
  return ''
}

const readNum = (row: UnknownRecord, keys: string[]): number => {
  const raw = readRaw(row, keys)
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

// Mismas claves que usa OtRealizadaPage.tsx para saber, por producto, si requiere
// serie/ChipID (digitosImei/digitosChipId > 0). Sin esto, productos que no llevan
// identificacion (p. ej. NOMENCLADOR_*) terminan disparando validaciones de serie
// que nunca deberian ejecutarse.
const productMaskIdKeys = ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id', 'productoId']
const productMaskImeiDigitKeys = [
  'digitosImei', 'DigitosImei', 'DigitosIMEI', 'digitos_imei', 'cantidadDigitosImei', 'cantidad_digitos_imei',
  'CantDigitosSerial', 'cantDigitosSerial', 'CantidadDigitosSerial', 'cantidadDigitosSerial',
  'DigitosSerial', 'digitosSerial', 'serieLength', 'SerieLength', 'longitudSerie', 'LongitudSerie', 'cantidadCaracteresSerie',
]
const productMaskChipDigitKeys = [
  'digitosChipId', 'DigitosChipId', 'DigitosChipID', 'DigitosChipid', 'digitos_chipid',
  'cantidadDigitosChipId', 'cantidad_digitos_chipid', 'CantDigitosChipId', 'CantDigitosChipID',
  'cantDigitosChipId', 'cantDigitosChipID', 'cantidadDigitosChipID', 'chipLength', 'ChipLength',
]
const productMaskSerieKeys = ['mascaraSerie', 'MascaraSerie', 'maskSerie', 'MaskSerie', 'mascara', 'Mascara', 'formatoSerie', 'FormatoSerie', 'formato', 'Formato']
const productMaskChipKeys = [
  'mascaraChipId', 'MascaraChipId', 'mascaraChipID', 'MascaraChipID', 'maskChipId', 'MaskChipId',
  'chipMascara', 'ChipMascara', 'formatoChip', 'FormatoChip', 'chipFormato', 'ChipFormato',
]

// Misma logica de mascara que OtRealizadaPage.tsx: cada producto define un patron
// (0/9/# = digito, A/a/L/?/&/C = letra o alfanumerico) que limita longitud y tipo
// de caracter aceptado en Serie/ChipID, en vez de dejar texto libre sin restriccion.
const isMaskToken = (char: string): boolean => ['0', '9', '#', 'A', 'a', 'L', '?', '&', 'C'].includes(char)

const isValidMaskChar = (maskChar: string, valueChar: string): boolean => {
  if (['0', '9', '#'].includes(maskChar)) return /\d/.test(valueChar)
  if (['A', 'a', 'L', '?'].includes(maskChar)) return /[a-z]/i.test(valueChar)
  if (['&', 'C'].includes(maskChar)) return /[a-z0-9]/i.test(valueChar)
  return true
}

const normalizeMaskChar = (maskChar: string, valueChar: string): string => {
  if (['A', 'a', 'L', '?', '&', 'C'].includes(maskChar)) return valueChar.toUpperCase()
  return valueChar
}

const buildFallbackMask = (digits: number): string => {
  if (!Number.isFinite(digits) || digits <= 0) return ''
  return '0'.repeat(digits)
}

const applyMask = (rawValue: string, mask: string): string => {
  if (!mask) return rawValue

  const source = rawValue.replace(/\s+/g, '').toUpperCase()
  let masked = ''
  let sourceIndex = 0

  for (let i = 0; i < mask.length; i += 1) {
    const maskChar = mask[i]
    if (!isMaskToken(maskChar)) {
      if (sourceIndex >= source.length) break
      masked += maskChar
      continue
    }

    while (sourceIndex < source.length) {
      const candidate = source[sourceIndex]
      sourceIndex += 1
      if (!isValidMaskChar(maskChar, candidate)) continue
      masked += normalizeMaskChar(maskChar, candidate)
      break
    }

    if (masked.length < i + 1) break
  }

  return masked
}

const isNumericMask = (mask: string): boolean => {
  if (!mask) return false
  const chars = Array.from(mask)
  return chars.some((char) => isMaskToken(char)) && chars.every((char) => !isMaskToken(char) || ['0', '9', '#'].includes(char))
}

const mapCatalogOptions = (
  items: CatalogItem[],
  idKeys: string[],
  labelKeys: string[]
): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readRaw(item as UnknownRecord, idKeys)
      if (!id) return null
      const label = readRaw(item as UnknownRecord, labelKeys)
      return { value: id, label: label || id }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

type DetalleRow = {
  key: string
  producto: string
  serie: string
  chipId: string
  cantidad: string
  tipoMaterial: string
}

const mapDetalleRow = (row: UnknownRecord, index: number): DetalleRow => ({
  key: String(index),
  producto: readRaw(row, ['Nombre', 'nombre', 'producto', 'Producto']) || 'Producto',
  serie: readRaw(row, ['Cod_Inicio', 'codInicio', 'serie', 'Serie']),
  chipId: readRaw(row, ['ChipID', 'ChipId', 'chipId', 'chipid']),
  cantidad: readRaw(row, ['Cantidad', 'cantidad']) || '0',
  tipoMaterial: readRaw(row, ['TipoMaterial', 'tipoMaterial']),
})

const ModificarOTDetalle = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const navState = (location.state as DetailNavState | null) ?? null
  const idVenta = navState?.idVenta && navState.idVenta > 0 ? navState.idVenta : null

  const [otData, setOtData] = useState<OtModificableHoy | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoadingOt, setIsLoadingOt] = useState(true)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; title: string; message: string } | null>(null)
  const [isValidatingSaved, setIsValidatingSaved] = useState(false)
  const [lastSavedValidation, setLastSavedValidation] = useState<SavedValidation | null>(null)

  const [addTipoMaterialId, setAddTipoMaterialId] = useState('')
  const [addProductoId, setAddProductoId] = useState('')
  const [addProductoBloqueado, setAddProductoBloqueado] = useState(false)
  const [addSerie, setAddSerie] = useState('')
  const [addSerieBloqueada, setAddSerieBloqueada] = useState(false)
  const [addChipId, setAddChipId] = useState('')
  const [addChipBloqueado, setAddChipBloqueado] = useState(false)
  const [addCantidad, setAddCantidad] = useState('1')
  const [addSerieError, setAddSerieError] = useState<string | null>(null)
  const [addChipError, setAddChipError] = useState<string | null>(null)

  const limpiarAgregarProducto = () => {
    setAddTipoMaterialId('')
    setAddProductoId('')
    setAddSerie('')
    setAddSerieBloqueada(false)
    setAddChipId('')
    setAddChipBloqueado(false)
    setAddCantidad('1')
    setAddSerieError(null)
    setAddChipError(null)
  }

  const handleAddSerieBlur = () => {
    if (addSerie.trim()) setAddSerieBloqueada(true)
  }

  const handleAddChipBlur = () => {
    if (addChipId.trim()) setAddChipBloqueado(true)
  }

  const registroCompletoQuery = useQuery({
    queryKey: ['ot-registro-completo', idVenta],
    queryFn: () => fetchOtRegistroCompleto(idVenta ?? 0),
    enabled: Boolean(idVenta),
  })

  const actualizarOtEnCache = (ot: OtModificableHoy) => {
    queryClient.setQueryData<OtModificableHoy[]>(['ot-modificar-hoy'], (current) => {
      if (!current || current.length === 0) return [ot]
      const exists = current.some((item) => item.idVenta === ot.idVenta)
      if (!exists) return [ot, ...current]
      return current.map((item) => (item.idVenta === ot.idVenta ? ot : item))
    })
  }

  const refrescarOtDesdeBd = async (idVentaActual: number) => {
    const otActualizada = await fetchOtModificableHoy(idVentaActual)
    actualizarOtEnCache(otActualizada)
    setOtData(otActualizada)
    return otActualizada
  }

  useEffect(() => {
    if (!idVenta) {
      setLoadError('No se especifico una OT valida.')
      setIsLoadingOt(false)
      return
    }
    let cancelled = false
    setIsLoadingOt(true)
    setLoadError(null)
    refrescarOtDesdeBd(idVenta)
      .catch((err) => {
        if (cancelled) return
        setLoadError(getApiErrorMessage(err, 'No se pudo cargar la OT.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOt(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idVenta])

  const validarOtGuardada = async (saved: SavedValidation) => {
    let ultimaLectura: OtModificableHoy | null = null
    for (let intento = 0; intento < 6; intento += 1) {
      ultimaLectura = await refrescarOtDesdeBd(saved.idVenta)
      const material = ultimaLectura.materiales.find((item) => item.idCodigoVenta === saved.idCodigoVenta)
      if (material && Number(material.cantidad) === saved.cantidad) {
        return ultimaLectura
      }
      if (intento < 5) await wait(600)
    }
    return ultimaLectura
  }

  const cerrarFeedback = async () => {
    if (isValidatingSaved) return
    const pendingValidation = lastSavedValidation
    if (!pendingValidation) {
      setFeedback(null)
      return
    }
    setIsValidatingSaved(true)
    try {
      await validarOtGuardada(pendingValidation)
      setFeedback(null)
      setLastSavedValidation(null)
    } catch {
      setFeedback({
        kind: 'error',
        title: 'No se pudo validar',
        message: 'No se pudo validar nuevamente el dato guardado en la base de datos.',
      })
    } finally {
      setIsValidatingSaved(false)
    }
  }

  const rowMutation = useMutation({
    mutationFn: ({ idCodigoVenta, cantidad }: { idCodigoVenta: number; cantidad: number }) => {
      if (!otData) throw new Error('OT no disponible.')
      return updateOtCantidadesHoy(otData.idVenta, [{ idCodigoVenta, cantidad }])
    },
    onSuccess: (_data, variables) => {
      const snapshot = otData
      if (!snapshot) return
      setDrafts((current) => ({ ...current, [variables.idCodigoVenta]: String(variables.cantidad) }))
      setOtData((current) => {
        if (!current) return current
        return {
          ...current,
          materiales: current.materiales.map((material) =>
            material.idCodigoVenta === variables.idCodigoVenta
              ? { ...material, cantidad: variables.cantidad }
              : material,
          ),
        }
      })
      setLastSavedValidation({
        idVenta: snapshot.idVenta,
        idCodigoVenta: variables.idCodigoVenta,
        cantidad: variables.cantidad,
      })
      setFeedback({
        kind: 'success',
        title: 'Guardado correcto',
        message: 'El registro se guardó correctamente y se actualizó la cantidad.',
      })
      actualizarOtEnCache({
        ...snapshot,
        materiales: snapshot.materiales.map((material) =>
          material.idCodigoVenta === variables.idCodigoVenta
            ? { ...material, cantidad: variables.cantidad }
            : material,
        ),
      })
    },
    onError: (err) => {
      setFeedback({
        kind: 'error',
        title: 'No se pudo guardar',
        message: getApiErrorMessage(err, 'No se pudo actualizar el registro.'),
      })
    },
  })

  useEffect(() => {
    if (!otData) return
    const next: Record<number, string> = {}
    otData.materiales.forEach((material) => { next[material.idCodigoVenta] = String(material.cantidad) })
    setDrafts(next)
  }, [otData])

  const idTipoServicio = useMemo(() => {
    const cabecera = registroCompletoQuery.data?.cabecera as UnknownRecord | null
    if (!cabecera) return null
    const raw = readRaw(cabecera, ['Id_TipoServicio', 'idTipoServicio', 'id_tipo_servicio'])
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [registroCompletoQuery.data])

  const serializedInstalados = useMemo(() => {
    const rows = (registroCompletoQuery.data?.instalados ?? []) as UnknownRecord[]
    return rows
      .filter((row) => readRaw(row, ['Cod_Inicio', 'codInicio', 'serie', 'Serie']) || readRaw(row, ['ChipID', 'ChipId', 'chipId']))
      .map(mapDetalleRow)
  }, [registroCompletoQuery.data])

  const retiradosRows = useMemo(() => {
    const rows = (registroCompletoQuery.data?.retirados ?? []) as UnknownRecord[]
    return rows.map(mapDetalleRow)
  }, [registroCompletoQuery.data])

  const tipoMaterialQuery = useQuery({
    queryKey: ['ot-modificar-tipo-material', idTipoServicio],
    queryFn: () => fetchTipoMaterial(idTipoServicio as number),
    enabled: Boolean(idTipoServicio),
  })
  const tipoMaterialOptions = useMemo(
    () =>
      mapCatalogOptions(
        tipoMaterialQuery.data ?? [],
        ['idTipoMaterial', 'IdTipoMaterial', 'Id_TipoMaterial', 'id_tipo_material', 'id', 'Id'],
        ['tipoMaterial', 'TipoMaterial', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [tipoMaterialQuery.data]
  )

  const selectedTipoMaterialLabel = (
    tipoMaterialOptions.find((option) => option.value === addTipoMaterialId)?.label ?? ''
  ).toLowerCase()
  const isRetiradoSelected =
    selectedTipoMaterialLabel.includes('retirad') || selectedTipoMaterialLabel.includes('no entregado')

  const productosQuery = useQuery({
    queryKey: ['ot-modificar-productos', otData?.idRuta, addTipoMaterialId],
    queryFn: async () => {
      const idRuta = otData?.idRuta ?? 0
      if (isRetiradoSelected) {
        const sinFungible = await fetchProductosSinFungible(idRuta || undefined)
        if (sinFungible.length > 0) return sinFungible
        const cargoUsuario = await fetchProductosCargoUsuario()
        if (cargoUsuario.length > 0) return cargoUsuario
        return fetchProductos(idRuta)
      }
      return fetchProductos(idRuta)
    },
    enabled: Boolean(addTipoMaterialId) && Boolean(otData?.idRuta),
  })
  const productoOptions = useMemo(
    () =>
      mapCatalogOptions(
        productosQuery.data ?? [],
        ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id'],
        ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [productosQuery.data]
  )

  const productosMascaraQuery = useQuery({
    queryKey: ['ot-modificar-productos-mascara'],
    queryFn: fetchProductosMascara,
    staleTime: 300_000,
  })
  const productoMascaraMap = useMemo(() => {
    const map = new Map<string, UnknownRecord>()
    for (const item of productosMascaraQuery.data ?? []) {
      const id = readRaw(item as UnknownRecord, productMaskIdKeys)
      if (id) map.set(id, item as UnknownRecord)
    }
    return map
  }, [productosMascaraQuery.data])

  const selectedProductoMeta = useMemo(() => {
    const row = (productosQuery.data ?? []).find(
      (item) => readRaw(item as UnknownRecord, productMaskIdKeys) === addProductoId
    ) as UnknownRecord | undefined
    if (!row) return null
    const maskEntry = productoMascaraMap.get(addProductoId)
    const digitosImeiProduct = readNum(row, productMaskImeiDigitKeys)
    const digitosChipProduct = readNum(row, productMaskChipDigitKeys)
    const digitosImeiMask = maskEntry ? readNum(maskEntry, productMaskImeiDigitKeys) : null
    const digitosChipMask = maskEntry ? readNum(maskEntry, productMaskChipDigitKeys) : null
    const digitosImei = digitosImeiMask && digitosImeiMask > 0 ? digitosImeiMask : digitosImeiProduct
    const digitosChipId = digitosChipMask && digitosChipMask > 0 ? digitosChipMask : digitosChipProduct
    const mascaraSerieFromProduct = readRaw(row, productMaskSerieKeys)
    const mascaraSerieFromMask = maskEntry ? readRaw(maskEntry, productMaskSerieKeys) : ''
    const mascaraChipFromProduct = readRaw(row, productMaskChipKeys)
    const mascaraChipFromMask = maskEntry ? readRaw(maskEntry, productMaskChipKeys) : ''
    return {
      digitosImei,
      digitosChipId,
      mascaraSerie: mascaraSerieFromMask || mascaraSerieFromProduct || buildFallbackMask(digitosImei),
      mascaraChipId: mascaraChipFromMask || mascaraChipFromProduct || buildFallbackMask(digitosChipId),
    }
  }, [productosQuery.data, productoMascaraMap, addProductoId])

  // Igual que needsSerie/needsChip en OtRealizadaPage.tsx: solo se exige
  // identificacion cuando el producto realmente la requiere segun su catalogo.
  const needsSerie = (selectedProductoMeta?.digitosImei ?? 0) > 0
  const needsChip = (selectedProductoMeta?.digitosChipId ?? 0) > 0
  const serieMask = selectedProductoMeta?.mascaraSerie ?? ''
  const chipIdMask = selectedProductoMeta?.mascaraChipId ?? ''
  const serieInputMode = isNumericMask(serieMask) ? 'numeric' : undefined
  const chipInputMode = isNumericMask(chipIdMask) ? 'numeric' : undefined

  const addSerieRef = useRef(addSerie)
  const addChipIdRef = useRef(addChipId)
  const addProductoRef = useRef(addProductoId)
  useEffect(() => { addSerieRef.current = addSerie }, [addSerie])
  useEffect(() => { addChipIdRef.current = addChipId }, [addChipId])
  useEffect(() => { addProductoRef.current = addProductoId }, [addProductoId])

  useEffect(() => {
    setAddProductoId('')
    setAddSerie('')
    setAddSerieBloqueada(false)
    setAddChipId('')
    setAddChipBloqueado(false)
    setAddSerieError(null)
    setAddChipError(null)
  }, [addTipoMaterialId])

  useEffect(() => {
    setAddSerie('')
    setAddSerieBloqueada(false)
    setAddChipId('')
    setAddChipBloqueado(false)
    setAddSerieError(null)
    setAddChipError(null)
  }, [addProductoId])

  useEffect(() => {
    setAddProductoBloqueado(Boolean(addProductoId))
  }, [addProductoId])

  useEffect(() => {
    if (addSerieError) setAddSerieBloqueada(false)
  }, [addSerieError])

  useEffect(() => {
    if (addChipError) setAddChipBloqueado(false)
  }, [addChipError])

  useEffect(() => {
    const serieTrim = addSerie.trim()
    if (!needsSerie || !serieTrim || !addProductoId || !addTipoMaterialId) {
      setAddSerieError(null)
      return
    }
    const requestProducto = addProductoId
    const timer = window.setTimeout(async () => {
      // Si el usuario cambio la serie o el producto mientras la peticion estaba
      // en vuelo, esta respuesta ya no corresponde al estado actual y no debe
      // pisar lo que se ve en pantalla (evita el error "fantasma").
      const isStale = () => addSerieRef.current.trim() !== serieTrim || addProductoRef.current !== requestProducto
      try {
        const result = await validarSerieSaldo({
          serie: serieTrim,
          idProducto: Number(addProductoId),
          idTipoMaterial: Number(addTipoMaterialId),
          idRuta: otData?.idRuta ?? undefined,
        })
        if (isStale()) return
        if (!result.sePuede) {
          if (isRetiradoSelected) {
            setAddSerieError(null)
            return
          }
          setAddSerieError(result.observacion || 'La serie no esta disponible en saldo.')
          return
        }
        setAddSerieError(null)
        if (result.chipId) {
          setAddChipId((current) => current || result.chipId || '')
          return
        }
        try {
          const chipResponse = await fetchChipIdBySerie(serieTrim)
          if (isStale()) return
          if (chipResponse.chipId) {
            setAddChipId((current) => current || chipResponse.chipId || '')
          }
        } catch {
          // La serie es valida aunque no se pueda autocompletar el ChipID.
        }
      } catch {
        if (isStale()) return
        setAddSerieError(isRetiradoSelected ? null : 'No se pudo validar la serie.')
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [addSerie, addProductoId, addTipoMaterialId, isRetiradoSelected, needsSerie, otData?.idRuta])

  useEffect(() => {
    const chipTrim = addChipId.trim()
    const serieTrim = addSerie.trim()
    if (!needsChip || !chipTrim || !serieTrim) {
      setAddChipError(null)
      return
    }
    const requestProducto = addProductoId
    const timer = window.setTimeout(async () => {
      const isStale = () => addChipIdRef.current.trim() !== chipTrim || addProductoRef.current !== requestProducto
      try {
        const result = await validarSerieChipUnico({ serie: serieTrim, chipId: chipTrim })
        if (isStale()) return
        if (result.chipExiste && !result.mismoRegistro) {
          setAddChipError('El ChipID pertenece a otro serial.')
          return
        }
        setAddChipError(null)
      } catch {
        if (isStale()) return
        setAddChipError(isRetiradoSelected ? null : 'No se pudo validar el ChipID.')
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [addChipId, addSerie, addProductoId, isRetiradoSelected, needsChip])

  const addMaterialMutation = useMutation({
    mutationFn: () => {
      if (!otData) throw new Error('OT no disponible.')
      return agregarMaterialModificarHoy(otData.idVenta, {
        idProducto: Number(addProductoId),
        idTipoMaterial: Number(addTipoMaterialId),
        cantidad: Number(addCantidad),
        serie: addSerie.trim() || undefined,
        chipId: addChipId.trim() || undefined,
      })
    },
    onSuccess: (otActualizada) => {
      actualizarOtEnCache(otActualizada)
      setOtData(otActualizada)
      setFeedback({
        kind: 'success',
        title: 'Producto agregado',
        message: 'El producto se agregó correctamente a la OT.',
      })
      limpiarAgregarProducto()
      void registroCompletoQuery.refetch()
      void queryClient.invalidateQueries({ queryKey: ['ot-modificar-hoy'] })
    },
    onError: (err) => {
      setFeedback({
        kind: 'error',
        title: 'No se pudo agregar el producto',
        message: getApiErrorMessage(err, 'No se pudo agregar el material.'),
      })
    },
  })

  const volver = () => navigate('/GestionOTs/ModificarOT')

  const materialColumns: Column<OtMaterialModificable>[] = [
    {
      key: 'producto',
      header: 'Producto',
      render: (row) => row.producto || `Producto ${row.idProducto}`,
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      className: 'w-28',
      render: (row) => (
        <input
          className="input-base h-7 w-20 rounded-lg px-2 py-0 text-center text-xs"
          type="number"
          min="0"
          step="any"
          value={drafts[row.idCodigoVenta] ?? row.cantidad}
          disabled={!otData?.puedeModificar || rowMutation.isPending}
          onChange={(event) => setDrafts((current) => ({ ...current, [row.idCodigoVenta]: event.target.value }))}
        />
      ),
    },
    {
      key: 'accion',
      header: 'Accion',
      className: 'w-16',
      render: (row) => (
        <Button
          type="button"
          variant="secondary"
          className="h-7 w-7 p-0"
          title="Guardar este registro"
          aria-label="Guardar este registro"
          disabled={!otData?.puedeModificar || rowMutation.isPending}
          onClick={() => rowMutation.mutate({
            idCodigoVenta: row.idCodigoVenta,
            cantidad: Number(drafts[row.idCodigoVenta] ?? row.cantidad),
          })}
        >
          <FontAwesomeIcon icon={faFloppyDisk} aria-hidden="true" />
        </Button>
      ),
    },
  ]

  const readOnlyColumns: Column<DetalleRow>[] = [
    { key: 'producto', header: 'Producto' },
    { key: 'serie', header: 'Serie', render: (row) => row.serie || '-' },
    { key: 'chipId', header: 'ChipID', render: (row) => row.chipId || '-' },
    { key: 'cantidad', header: 'Cantidad', className: 'text-right' },
  ]

  const retiradosColumns: Column<DetalleRow>[] = [
    { key: 'producto', header: 'Producto' },
    { key: 'tipoMaterial', header: 'Tipo', render: (row) => row.tipoMaterial || '-' },
    { key: 'serie', header: 'Serie', render: (row) => row.serie || '-' },
    { key: 'chipId', header: 'ChipID', render: (row) => row.chipId || '-' },
    { key: 'cantidad', header: 'Cantidad', className: 'text-right' },
  ]

  return (
    <div className="bento-page ot-realizada-page">
      <div className="px-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Modificar OT {otData?.ordenTrabajo || idVenta || ''}
            </h2>
            <p className="text-sm text-slate-500">{otData?.grupo || 'Modificacion de detalle de OT finalizada.'}</p>
          </div>
          <Button type="button" variant="secondary" onClick={volver}>Volver</Button>
        </div>
      </div>

      {isLoadingOt ? <FormCard title="" hideHeader compact><p className="text-sm text-slate-500">Cargando OT...</p></FormCard> : null}
      {loadError ? (
        <FormCard title="" hideHeader compact>
          <p className="text-sm font-semibold text-rose-600">{loadError}</p>
          <Button type="button" variant="secondary" className="mt-3" onClick={volver}>Volver al listado</Button>
        </FormCard>
      ) : null}

      {!isLoadingOt && !loadError && otData ? (
        <>
          <FormCard title="" hideHeader compact>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nro Orden</label>
                <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={otData.ordenTrabajo || String(otData.idVenta)} disabled />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Cod Cliente</label>
                <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={otData.codigoCliente ?? ''} disabled />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Grupo</label>
                <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={otData.grupo || ''} disabled />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">FechaHoraDetalle</label>
                <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={formatDateTime(otData.fechaHoraDetalle)} disabled />
              </div>
            </div>
          </FormCard>

          {!otData.puedeModificar ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{otData.bloqueo}</div> : null}

          <FormCard title="Agregar producto" description="Aplica las mismas validaciones de cuadre, cierre, series y saldo del registro original." compact>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
              <Field label="Tipo Material" compact>
                <select
                  className="input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm"
                  value={addTipoMaterialId}
                  onChange={(event) => setAddTipoMaterialId(event.target.value)}
                  disabled={!otData.puedeModificar || tipoMaterialQuery.isLoading || addMaterialMutation.isPending}
                >
                  <option value="">Selecciona tipo material</option>
                  {tipoMaterialOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Producto" compact>
                <select
                  className="input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm"
                  value={addProductoId}
                  onChange={(event) => setAddProductoId(event.target.value)}
                  disabled={!otData.puedeModificar || !addTipoMaterialId || productosQuery.isLoading || addMaterialMutation.isPending || addProductoBloqueado}
                >
                  <option value="">{productosQuery.isLoading ? 'Cargando productos...' : 'Selecciona producto'}</option>
                  {productoOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Serie" error={addSerieError ?? undefined} compact>
                <input
                  className="input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm"
                  value={addSerie}
                  onChange={(event) => setAddSerie(needsSerie ? applyMask(event.target.value, serieMask) : event.target.value)}
                  onBlur={handleAddSerieBlur}
                  placeholder={addProductoId && !needsSerie ? 'Este producto no requiere serie' : 'Ingresa la serie'}
                  disabled={!otData.puedeModificar || !addProductoId || !needsSerie || addMaterialMutation.isPending || addSerieBloqueada}
                  inputMode={serieInputMode}
                  pattern={serieInputMode === 'numeric' ? '[0-9]*' : undefined}
                  maxLength={serieMask ? serieMask.length : undefined}
                />
              </Field>
              <Field label="ChipID" error={addChipError ?? undefined} compact>
                <input
                  className="input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm"
                  value={addChipId}
                  onChange={(event) => setAddChipId(needsChip ? applyMask(event.target.value, chipIdMask) : event.target.value)}
                  onBlur={handleAddChipBlur}
                  placeholder={addProductoId && !needsChip ? 'Este producto no requiere ChipID' : 'Ingresa el ChipID'}
                  disabled={!otData.puedeModificar || !addProductoId || !needsChip || addMaterialMutation.isPending || addChipBloqueado}
                  inputMode={chipInputMode}
                  pattern={chipInputMode === 'numeric' ? '[0-9]*' : undefined}
                  maxLength={chipIdMask ? chipIdMask.length : undefined}
                />
              </Field>
              <Field label="Cantidad" compact>
                <input
                  className="input-base !rounded-xl !border !border-slate-300 !px-3 !py-1.5 !text-sm"
                  type="number"
                  min="0"
                  step="any"
                  value={addCantidad}
                  onChange={(event) => setAddCantidad(event.target.value)}
                  disabled={!otData.puedeModificar || addMaterialMutation.isPending}
                />
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  className="h-9 w-full"
                  disabled={
                    !otData.puedeModificar ||
                    !addTipoMaterialId ||
                    !addProductoId ||
                    !addCantidad ||
                    Number(addCantidad) <= 0 ||
                    (needsSerie && !addSerie.trim()) ||
                    (needsChip && !addChipId.trim()) ||
                    Boolean(addSerieError) ||
                    Boolean(addChipError) ||
                    addMaterialMutation.isPending
                  }
                  onClick={() => addMaterialMutation.mutate()}
                >
                  {addMaterialMutation.isPending ? 'Agregando...' : 'Agregar producto'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-full"
                  disabled={!otData.puedeModificar || addMaterialMutation.isPending}
                  onClick={limpiarAgregarProducto}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </FormCard>

          <FormCard title="Instalados no serializados" description="Editable: solo se puede modificar la cantidad ya registrada." compact>
            <Table
              columns={materialColumns}
              data={otData.materiales}
              density="compact"
              emptyLabel="SIN MATERIALES NO SERIALIZADOS"
            />
          </FormCard>

          <FormCard title="Retirados" description="Solo lectura. Solo se pueden agregar productos retirados, no quitar los existentes." compact>
            <Table
              columns={retiradosColumns}
              data={retiradosRows}
              density="compact"
              emptyLabel={registroCompletoQuery.isLoading ? 'CARGANDO...' : 'SIN PRODUCTOS RETIRADOS'}
            />
          </FormCard>

          <FormCard title="Instalados serializados" description="Solo lectura." compact>
            <Table
              columns={readOnlyColumns}
              data={serializedInstalados}
              density="compact"
              emptyLabel={registroCompletoQuery.isLoading ? 'CARGANDO...' : 'SIN PRODUCTOS INSTALADOS SERIALIZADOS'}
            />
          </FormCard>
        </>
      ) : null}

      <Modal
        open={Boolean(feedback)}
        title={feedback?.title ?? ''}
        onClose={cerrarFeedback}
        actions={
          <Button type="button" onClick={cerrarFeedback} disabled={isValidatingSaved}>
            {isValidatingSaved ? 'Validando...' : 'Aceptar'}
          </Button>
        }
      >
        <p className={feedback?.kind === 'error' ? 'font-semibold text-rose-600' : 'text-slate-700'}>
          {feedback?.message}
        </p>
      </Modal>
    </div>
  )
}

export default ModificarOTDetalle
