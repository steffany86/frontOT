import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Table, { type Column } from '../components/common/Table'
import {
  fetchChipIdBySerie,
  fetchEstados,
  fetchProductos,
  fetchProductosMascara,
  fetchTipoMaterial,
  validarSerieSaldo,
  validarSerieChipUnico,
  type CatalogItem,
} from '../api/catalogApi'
import { createOtDetalle, fetchOtByNumero, validateCuadreRuta, validateExisteCierreAlmacen } from '../api/otApi'

type UnknownRecord = Record<string, unknown>

type DetailNavState = {
  numeroOrden?: string
  clienteNro?: string
  fecha?: string
  tor?: string
  grupo?: string
  tecnicoNombre?: string
  idRuta?: string
  idSucursal?: string
  rowData?: UnknownRecord
}

type MaterialRow = {
  id: string
  idProducto: number
  producto: string
  serie: string
  chipId: string
  cantidad: number
  idTipoMaterial: number
  tipoMaterialLabel: string
  entregado: boolean
}

type ProductMeta = {
  id: string
  label: string
  digitosImei: number
  digitosChipId: number
  mascaraSerie: string
  mascaraChipId: string
  esSerializado: boolean
}

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()

const readValue = (row: UnknownRecord, keys: string[]): unknown => {
  const normalizedKeys = keys.map(normalizeKey)
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [entryKey, entryValue] of Object.entries(row)) {
    if (!normalizedKeys.includes(normalizeKey(entryKey))) continue
    if (entryValue !== undefined && entryValue !== null && entryValue !== '') return entryValue
  }
  return undefined
}

const readString = (row: UnknownRecord, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const readNumber = (row: UnknownRecord, keys: string[]): number | null => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const readBoolean = (row: UnknownRecord, keys: string[]): boolean | null => {
  const value = readValue(row, keys)
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'si', 'sÃ­', 's', 'yes'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  }
  return null
}

const mapOptions = (
  items: CatalogItem[],
  idKeys: string[],
  labelKeys: string[]
): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readValue(item, idKeys)
      if (id === undefined || id === null || id === '') return null
      const label = readString(item, labelKeys)
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const toIsoDateParam = (value?: string): string => {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  const year = String(parsed.getFullYear())
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildFallbackMask = (digits: number): string => {
  if (!Number.isFinite(digits) || digits <= 0) return ''
  return '0'.repeat(digits)
}

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

const countMaskTokens = (mask: string): number => Array.from(mask).filter((char) => isMaskToken(char)).length

const countFilledMaskChars = (value: string): number => value.replace(/[^a-z0-9]/gi, '').length

const productMaskIdKeys = ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id', 'productoId']
const productMaskSerieKeys = ['mascaraSerie', 'MascaraSerie', 'maskSerie', 'MaskSerie', 'mascara', 'Mascara', 'formatoSerie', 'FormatoSerie', 'formato', 'Formato']
const productMaskChipKeys = [
  'mascaraChipId',
  'MascaraChipId',
  'mascaraChipID',
  'MascaraChipID',
  'maskChipId',
  'MaskChipId',
  'chipMascara',
  'ChipMascara',
  'formatoChip',
  'FormatoChip',
  'chipFormato',
  'ChipFormato',
]
const productMaskImeiDigitKeys = [
  'digitosImei',
  'DigitosImei',
  'digitos_imei',
  'cantidadDigitosImei',
  'cantidad_digitos_imei',
  'serieLength',
  'SerieLength',
  'longitudSerie',
  'LongitudSerie',
  'cantidadCaracteresSerie',
]
const productMaskChipDigitKeys = [
  'digitosChipId',
  'DigitosChipId',
  'digitos_chipid',
  'cantidadDigitosChipId',
  'cantidad_digitos_chipid',
  'chipLength',
  'ChipLength',
  'longitudChip',
  'LongitudChip',
]

const defaultTipoMaterialOptions: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Instalado' },
  { value: '2', label: 'Retirado' },
  { value: '3', label: 'Excedente' },
]

const OtRealizadaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = (location.state as DetailNavState | null) ?? null
  const rowData = navState?.rowData ?? null
  const numeroOrden = (navState?.numeroOrden ?? '').trim()

  const [idEstado, setIdEstado] = useState('')
  const observacion = ''
  const [tipoMaterialId, setTipoMaterialId] = useState('')
  const [productoId, setProductoId] = useState('')
  const [serie, setSerie] = useState('')
  const [chipId, setChipId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [entregado, setEntregado] = useState(true)
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serieValidationError, setSerieValidationError] = useState<string | null>(null)
  const [productoBloqueado, setProductoBloqueado] = useState(false)
  const [serieCamposBloqueados, setSerieCamposBloqueados] = useState(false)
  const [chipCamposBloqueados, setChipCamposBloqueados] = useState(false)
  const [allowManualChipId, setAllowManualChipId] = useState(false)
  const [chipUniquenessState, setChipUniquenessState] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [isPrevalidating, setIsPrevalidating] = useState(false)
  const [isAddingMaterial, setIsAddingMaterial] = useState(false)
  const tipoMaterialSelectRef = useRef<HTMLSelectElement | null>(null)
  const productoSelectRef = useRef<HTMLSelectElement | null>(null)
  const serieInputRef = useRef<HTMLInputElement | null>(null)
  const chipIdInputRef = useRef<HTMLInputElement | null>(null)
  const cantidadInputRef = useRef<HTMLInputElement | null>(null)
  const addButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastValidatedSerieRef = useRef<{ key: string; sePuede: boolean } | null>(null)

  const ventaQuery = useQuery({
    queryKey: ['ot-detalle-venta', numeroOrden],
    enabled: Boolean(numeroOrden),
    queryFn: () => fetchOtByNumero(numeroOrden),
  })

  const venta = ventaQuery.data ?? null
  const idRuta = useMemo(
    () =>
      (venta ? readNumber(venta, ['idRuta', 'Id_Ruta', 'id_ruta']) : null) ??
      (rowData ? readNumber(rowData, ['idRuta', 'Id_Ruta', 'id_ruta', 'idGrupo', 'Id_Grupo', 'id_grupo']) : null) ??
      (navState?.idRuta ? Number(navState.idRuta) : null),
    [navState?.idRuta, rowData, venta]
  )
  const fechaTrabajo = useMemo(() => {
    const fromVenta = venta ? readString(venta, ['fechaEjecucion', 'Fecha_Ejecucion', 'Fecha_Ejecucion']) : ''
    const fromState = navState?.fecha ?? ''
    return toIsoDateParam(fromVenta || fromState)
  }, [navState?.fecha, venta])
  const clienteVisible = useMemo(() => {
    if (venta) {
      const value = readNumber(venta, ['codigoCliente', 'CodigoCliente', 'clienteNro', 'Cliente_Nro'])
      if (value !== null) return String(value)
    }
    return (navState?.clienteNro ?? '').trim()
  }, [navState?.clienteNro, venta])
  const tipoServicioId = useMemo(
    () => (venta ? readNumber(venta, ['idTipoServicio', 'Id_TipoServicio', 'id_tiposervicio']) : null) ?? 1,
    [venta]
  )

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-ot-detalle'],
    queryFn: fetchEstados,
  })
  const productosQuery = useQuery({
    queryKey: ['catalogos-productos-ot-detalle'],
    queryFn: fetchProductos,
  })
  const tipoMaterialQuery = useQuery({
    queryKey: ['catalogos-tipo-material-ot-detalle', tipoServicioId],
    queryFn: () => fetchTipoMaterial(tipoServicioId),
    enabled: Boolean(tipoServicioId && tipoServicioId > 0),
  })
  const productosMascaraQuery = useQuery({
    queryKey: ['catalogos-productos-mascara'],
    queryFn: fetchProductosMascara,
  })

  const estadoOptions = useMemo(
    () =>
      mapOptions(
        estadosQuery.data ?? [],
        ['idEstado', 'IdEstado', 'Id_Estado', 'id_estado', 'id', 'Id'],
        ['estado', 'Estado', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [estadosQuery.data]
  )
  const productoOptions = useMemo(
    () =>
      mapOptions(
        productosQuery.data ?? [],
        ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id'],
        ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
      ),
    [productosQuery.data]
  )
  const productoMascaraMap = useMemo(() => {
    const map = new Map<string, CatalogItem>()
    for (const item of productosMascaraQuery.data ?? []) {
      const idValue = readValue(item, productMaskIdKeys)
      if (idValue === undefined || idValue === null || idValue === '') continue
      map.set(String(idValue), item)
    }
    return map
  }, [productosMascaraQuery.data])
  const productMetas = useMemo<ProductMeta[]>(() => {
    return (productosQuery.data ?? [])
      .map((item) => {
        const id = readValue(item, ['idProducto', 'Id_Producto', 'id_producto', 'id', 'Id'])
        if (id === undefined || id === null || id === '') return null

        const maskEntry = productoMascaraMap.get(String(id))
        const digitosImeiProduct = readNumber(item, productMaskImeiDigitKeys) ?? 0
        const digitosChipProduct = readNumber(item, productMaskChipDigitKeys) ?? 0
        const digitosImeiMask = maskEntry ? readNumber(maskEntry, productMaskImeiDigitKeys) : null
        const digitosChipMask = maskEntry ? readNumber(maskEntry, productMaskChipDigitKeys) : null
        const digitosImei = digitosImeiMask ?? digitosImeiProduct
        const digitosChipId = digitosChipMask ?? digitosChipProduct
        const mascaraSerieFromProduct = readString(item, productMaskSerieKeys)
        const mascaraSerieFromMask = maskEntry ? readString(maskEntry, productMaskSerieKeys) : ''
        const mascaraChipFromProduct = readString(item, productMaskChipKeys)
        const mascaraChipFromMask = maskEntry ? readString(maskEntry, productMaskChipKeys) : ''
        const mascaraSerie = mascaraSerieFromMask || mascaraSerieFromProduct || buildFallbackMask(digitosImei)
        const mascaraChipId = mascaraChipFromMask || mascaraChipFromProduct || buildFallbackMask(digitosChipId)
        const esSerializado =
          digitosImei > 0 ||
          readBoolean(item, ['esSerializado', 'EsSerializado', 'serializado', 'Serializado', 'tieneSerial', 'TieneSerial']) === true

        return {
          id: String(id),
          label: readString(item, ['producto', 'Producto', 'nombre', 'Nombre', 'descripcion', 'Descripcion']) || String(id),
          digitosImei,
          digitosChipId,
          mascaraSerie,
          mascaraChipId,
          esSerializado,
        }
      })
      .filter((item): item is ProductMeta => Boolean(item))
  }, [productosQuery.data, productoMascaraMap])
  const selectedProductMeta = useMemo(
    () => productMetas.find((item) => item.id === productoId) ?? null,
    [productMetas, productoId]
  )
  const lockProducto = () => {
    if (productoId && !productoBloqueado) {
      setProductoBloqueado(true)
    }
  }

  const handleSerieFocus = () => {
    lockProducto()
  }

  const handleCantidadFocus = () => {
    lockProducto()
  }

  const handleChipBlur = () => {
    if (chipId.trim()) {
      void validateChipUniqueness(chipId)
    }
  }
  const enterManualChipMode = () => {
    setChipId('')
    setSerieCamposBloqueados(true)
    setChipCamposBloqueados(false)
    setAllowManualChipId(true)
    setChipUniquenessState('idle')
    requestAnimationFrame(() => {
      chipIdInputRef.current?.focus()
    })
  }
  const serieMask = selectedProductMeta?.mascaraSerie ?? ''
  const chipIdMask = selectedProductMeta?.mascaraChipId ?? ''
  const isSerialProduct = selectedProductMeta?.esSerializado ?? false
  const canUseChipId = (isSerialProduct && (selectedProductMeta?.digitosChipId ?? 0) > 0) || allowManualChipId
  const tipoMaterialOptions = useMemo(() => {
    const mapped = mapOptions(
      tipoMaterialQuery.data ?? [],
      ['idTipoMaterial', 'IdTipoMaterial', 'Id_TipoMaterial', 'id_tipo_material', 'id', 'Id'],
      ['tipoMaterial', 'TipoMaterial', 'nombre', 'Nombre', 'descripcion', 'Descripcion']
    )
    return mapped.length > 0 ? mapped : defaultTipoMaterialOptions
  }, [tipoMaterialQuery.data])
  const selectedTipoMaterialLabel =
    tipoMaterialOptions.find((option) => option.value === tipoMaterialId)?.label?.toLowerCase() ?? ''
  const isRetiredMaterial =
    selectedTipoMaterialLabel.includes('retirado') ||
    selectedTipoMaterialLabel.includes('no entregado') ||
    selectedTipoMaterialLabel.includes('noentregado')
  const serieDisabled = !isSerialProduct || serieCamposBloqueados
  const chipDisabled = !canUseChipId || chipCamposBloqueados
  const serieDigitsRequired = selectedProductMeta?.digitosImei ?? 0
  const chipDigitsRequired = selectedProductMeta?.digitosChipId ?? 0
  const serieDigitsComplete =
    !isSerialProduct || serieDigitsRequired <= 0 || countFilledMaskChars(serie.trim()) === serieDigitsRequired
  const chipDigitsComplete =
    !canUseChipId || chipDigitsRequired <= 0 || countFilledMaskChars(chipId.trim()) === chipDigitsRequired
  const canAddMaterial =
    !isAddingMaterial &&
    Boolean(tipoMaterialId) &&
    Boolean(productoId) &&
    Number.isFinite(Number(cantidad)) &&
    Number(cantidad) > 0 &&
    serieDigitsComplete &&
    chipDigitsComplete &&
    (!canUseChipId || chipUniquenessState === 'valid') &&
    (!isSerialProduct || Boolean(serie.trim())) &&
    (!canUseChipId || Boolean(chipId.trim()))

  const validateChipUniqueness = useCallback(
    async (rawChip: string): Promise<boolean> => {
      const chipTrimmed = rawChip.trim()
      if (!chipTrimmed) {
        setChipUniquenessState('idle')
        return true
      }

      const serieTrimmed = serie.trim()
      if (!serieTrimmed) {
        setChipUniquenessState('idle')
        return true
      }

      try {
        const validation = await validarSerieChipUnico({
          serie: serieTrimmed,
          chipId: chipTrimmed,
        })

        if (validation.chipExiste && !validation.mismoRegistro) {
          setChipUniquenessState('invalid')
          setError('El ChipID ya esta registrado con otro serial.')
          return false
        }

        setChipUniquenessState('valid')
        if (error === 'El ChipID ya esta registrado con otro serial.') {
          setError(null)
        }
        return true
      } catch (validationError) {
        console.error('No se pudo validar la unicidad del ChipID.', validationError)
        setChipUniquenessState('invalid')
        setError('No se pudo validar la unicidad del ChipID.')
        return false
      }
    },
    [error, serie, validarSerieChipUnico]
  )

  useEffect(() => {
    const serieTrimmed = serie.trim()
    const chipTrimmed = chipId.trim()
    if (!canUseChipId || !serieTrimmed || !chipTrimmed || !serieDigitsComplete || !chipDigitsComplete) {
      if (chipUniquenessState !== 'idle') {
        setChipUniquenessState('idle')
      }
      return
    }

    if (chipUniquenessState === 'valid' || chipUniquenessState === 'invalid') {
      return
    }

    const timer = window.setTimeout(() => {
      void validateChipUniqueness(chipTrimmed)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [
    canUseChipId,
    chipDigitsComplete,
    chipId,
    chipUniquenessState,
    serie,
    serieDigitsComplete,
    validateChipUniqueness,
  ])

  const validateSerieBalance = useCallback(
    async (rawValue: string): Promise<boolean> => {
      if (!isSerialProduct) {
        setSerieValidationError(null)
        return true
      }

      const trimmed = rawValue.trim()
      if (!trimmed) {
        setSerieValidationError(null)
        lastValidatedSerieRef.current = null
        setSerieCamposBloqueados(false)
        setChipCamposBloqueados(false)
        setAllowManualChipId(false)
        setChipUniquenessState('idle')
        return false
      }

      const currentKey = `${productoId}::${trimmed}`
      if (lastValidatedSerieRef.current?.key === currentKey && lastValidatedSerieRef.current.sePuede) {
        setSerieValidationError(null)
        return true
      }

      if (serieMask) {
        const expectedLength = countMaskTokens(serieMask)
        if (expectedLength > 0) {
          const filledLength = countFilledMaskChars(trimmed)
          if (filledLength < expectedLength) {
            setSerieValidationError(`La serie debe completar la mascara ${serieMask}.`)
            setSerieCamposBloqueados(false)
            setChipCamposBloqueados(false)
            setAllowManualChipId(false)
            setChipUniquenessState('idle')
            return false
          }
        }
      }

      const parsedProducto = Number(productoId)
      const parsedTipoMaterial = Number(tipoMaterialId)
      if (!Number.isFinite(parsedProducto) || parsedProducto <= 0 || !Number.isFinite(parsedTipoMaterial) || parsedTipoMaterial <= 0) {
        setSerieValidationError('Producto o Tipo Material invalido para validar la serie.')
        setSerieCamposBloqueados(false)
        setChipCamposBloqueados(false)
        setAllowManualChipId(false)
        setChipUniquenessState('idle')
        return false
      }

      try {
        const validation = await validarSerieSaldo({
          serie: trimmed,
          idProducto: parsedProducto,
          idTipoMaterial: parsedTipoMaterial,
          idRuta: idRuta ?? undefined,
        })

        if (!validation.sePuede) {
          if (isRetiredMaterial) {
            const observacion = validation.observacion?.toLowerCase() ?? ''
            if (
              observacion.includes('no se pudo validar') ||
              observacion.includes('error en base de datos') ||
              observacion.includes('no devolvio un conjunto de resultados') ||
              observacion.includes('no existe')
            ) {
              setSerieValidationError(null)
              lastValidatedSerieRef.current = { key: currentKey, sePuede: true }
              enterManualChipMode()
              setChipUniquenessState('idle')
              return true
            }
          }

          setSerieValidationError(validation.observacion ?? 'La serie no esta disponible en tu saldo.')
          lastValidatedSerieRef.current = null
          setSerieCamposBloqueados(false)
          setChipCamposBloqueados(false)
          setAllowManualChipId(false)
          setChipUniquenessState('idle')
          return false
        }

        lastValidatedSerieRef.current = { key: currentKey, sePuede: true }

        if (canUseChipId && !chipId) {
          let resolvedChip = validation.chipId
          if (!resolvedChip) {
            try {
              const chipResponse = await fetchChipIdBySerie(trimmed)
              resolvedChip = chipResponse.chipId
            } catch (chipError) {
              console.warn('No se pudo obtener chipId adicional', chipError)
            }
          }
          if (resolvedChip) {
            const formattedChip = chipIdMask ? applyMask(resolvedChip, chipIdMask) : resolvedChip
            setChipId(formattedChip)
          }
        }

        setSerieCamposBloqueados(true)
        setChipCamposBloqueados(false)
        setAllowManualChipId(false)
        setChipUniquenessState('valid')
        addButtonRef.current?.focus()
        return true
      } catch (validationError) {
        console.error('No se pudo validar la serie contra el saldo.', validationError)
        if (isRetiredMaterial) {
          setSerieValidationError(null)
          lastValidatedSerieRef.current = { key: currentKey, sePuede: true }
          enterManualChipMode()
          setChipUniquenessState('idle')
          return true
        }
        setSerieValidationError('No se pudo validar la serie con el saldo.')
        lastValidatedSerieRef.current = null
        setSerieCamposBloqueados(false)
        setChipCamposBloqueados(false)
        setAllowManualChipId(false)
        setChipUniquenessState('idle')
        return false
      }
    },
    [
      canUseChipId,
      chipId,
      chipIdMask,
      fetchChipIdBySerie,
      idRuta,
      isSerialProduct,
      isRetiredMaterial,
      productoId,
      serieMask,
      tipoMaterialId,
      validarSerieSaldo,
    ]
  )

  const ensureSerieValidated = useCallback(async (): Promise<boolean> => {
    if (!isSerialProduct) return true
    const trimmed = serie.trim()
    if (!trimmed) {
      setSerieValidationError('Debes ingresar la Serie del producto.')
      return false
    }
    return validateSerieBalance(trimmed)
  }, [isSerialProduct, serie, validateSerieBalance])

  const handleSerieBlur = (): void => {
    if (!isSerialProduct) return
    const trimmed = serie.trim()
    if (!trimmed) {
      setSerieValidationError(null)
      lastValidatedSerieRef.current = null
      setSerieCamposBloqueados(false)
      setChipCamposBloqueados(false)
      setAllowManualChipId(false)
      return
    }
    void validateSerieBalance(trimmed)
  }

  useEffect(() => {
    lastValidatedSerieRef.current = null
    setAllowManualChipId(false)
    setChipUniquenessState('idle')
  }, [productoId, tipoMaterialId])

  useEffect(() => {
    if (serieValidationError) {
      setSerieValidationError(null)
    }
  }, [serie])

  useEffect(() => {
    if (!idEstado && estadoOptions.length > 0) {
      setIdEstado(estadoOptions[0].value)
    }
  }, [estadoOptions, idEstado])

  useEffect(() => {
    if (!tipoMaterialId || productoId) return

    requestAnimationFrame(() => {
      productoSelectRef.current?.focus()
    })
  }, [tipoMaterialId, productoId])

  useEffect(() => {
    if (!productoId) {
      setSerie('')
      setChipId('')
      setCantidad('1')
      setAllowManualChipId(false)
      return
    }

    setSerie('')
    setChipId('')
    setSerieCamposBloqueados(false)
    setChipCamposBloqueados(false)
    setAllowManualChipId(false)
    setChipUniquenessState('idle')
    if (isSerialProduct) {
      setCantidad('1')
      return
    }

    setCantidad('1')
  }, [productoId, isSerialProduct, canUseChipId])

  useEffect(() => {
    if (!productoId && productoBloqueado) {
      setProductoBloqueado(false)
    }
  }, [productoId, productoBloqueado])

  useEffect(() => {
    if (!tipoMaterialId || !productoId) return

    requestAnimationFrame(() => {
      if (isSerialProduct) {
        serieInputRef.current?.focus()
        return
      }

      cantidadInputRef.current?.focus()
      cantidadInputRef.current?.select()
    })
  }, [tipoMaterialId, productoId, isSerialProduct])

  useEffect(() => {
    const selected = tipoMaterialOptions.find((option) => option.value === tipoMaterialId)
    const label = selected?.label?.toLowerCase() ?? ''
    if (label.includes('instalado')) {
      setEntregado(true)
      return
    }
    if (label.includes('retirado') || label.includes('no entregado') || label.includes('noentregado')) {
      setEntregado(false)
      return
    }
    setEntregado(true)
  }, [tipoMaterialId, tipoMaterialOptions])

  const columns = useMemo<Column<MaterialRow>[]>(
    () => [
      { key: 'producto', header: 'Producto', render: (row) => row.producto },
      { key: 'serie', header: 'Serie', render: (row) => row.serie || '-' },
      { key: 'chipId', header: 'ChipID', render: (row) => row.chipId || '-' },
      { key: 'cantidad', header: 'Cantidad', render: (row) => row.cantidad.toFixed(2) },
      { key: 'tipoMaterial', header: 'Tipo Material', render: (row) => row.tipoMaterialLabel },
      { key: 'entregado', header: 'Entregado', render: (row) => (row.entregado ? 'Si' : 'No') },
      {
        key: 'acciones',
        header: 'Accion',
        render: (row) => (
          <Button type="button" variant="secondary" onClick={() => setMaterialRows((prev) => prev.filter((item) => item.id !== row.id))}>
            Quitar
          </Button>
        ),
      },
    ],
    []
  )

  const resetMaterialForm = () => {
    setTipoMaterialId('')
    setProductoId('')
    setSerie('')
    setChipId('')
    setCantidad('1')
    setEntregado(true)
    setProductoBloqueado(false)
    setSerieCamposBloqueados(false)
    setChipCamposBloqueados(false)
    setChipUniquenessState('idle')
    setSerieValidationError(null)
  }

  const addMaterial = async () => {
    setIsAddingMaterial(true)
    try {
      setSuccess(null)
      setError(null)
      const cantidadNum = Number(cantidad)
      const parsedProducto = Number(productoId)
      const parsedTipoMaterial = Number(tipoMaterialId)
      if (!Number.isFinite(parsedProducto) || parsedProducto <= 0 || !Number.isFinite(parsedTipoMaterial) || parsedTipoMaterial <= 0) {
        setError('Producto y Tipo Material son obligatorios.')
        return
      }
      if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
        setError('La cantidad debe ser mayor a 0.')
        return
      }
      const serieTrim = serie.trim()
      const chipTrim = chipId.trim()
      if (isSerialProduct && serieMask) {
        const expectedLength = countMaskTokens(serieMask)
        const filledLength = countFilledMaskChars(serieTrim)
        if (filledLength > 0 && filledLength < expectedLength) {
          setError(`La serie debe completar la mascara ${serieMask}.`)
          return
        }
      }
      if (canUseChipId && chipIdMask) {
        const expectedLength = countMaskTokens(chipIdMask)
        const filledLength = countFilledMaskChars(chipTrim)
        if (filledLength > 0 && filledLength < expectedLength) {
          setError(`El ChipID debe completar la mascara ${chipIdMask}.`)
          return
        }
      }
      if (isSerialProduct && !serieTrim) {
        setError('Debes ingresar la Serie del producto.')
        return
      }
      if (isRetiredMaterial && canUseChipId && !chipTrim) {
        setError('Debes ingresar el ChipID del producto retirado.')
        return
      }
      if (!canUseChipId && chipTrim) {
        setError('Este producto no maneja ChipID.')
        return
      }
      const serieValidated = await ensureSerieValidated()
      if (!serieValidated) return
      if ((isSerialProduct || canUseChipId) && chipTrim) {
        const chipUnique = await validateChipUniqueness(chipTrim)
        if (!chipUnique) return
      }
      const duplicate = materialRows.some(
        (row) =>
          (serieTrim && row.serie.toLowerCase() === serieTrim.toLowerCase()) ||
          (chipTrim && row.chipId.toLowerCase() === chipTrim.toLowerCase())
      )
      if (duplicate) {
        setError('La Serie o el ChipID ya fueron agregados.')
        return
      }
      const productoLabel = productoOptions.find((option) => option.value === productoId)?.label ?? productoId
      const tipoMaterialLabel = tipoMaterialOptions.find((option) => option.value === tipoMaterialId)?.label ?? tipoMaterialId
      setMaterialRows((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          idProducto: parsedProducto,
          producto: productoLabel,
          serie: serieTrim,
          chipId: chipTrim,
          cantidad: cantidadNum,
          idTipoMaterial: parsedTipoMaterial,
          tipoMaterialLabel,
          entregado,
        },
      ])
      resetMaterialForm()
    } finally {
      setIsAddingMaterial(false)
    }
  }

  const runPrevalidations = async (): Promise<boolean> => {
    if (!idRuta || idRuta <= 0) {
      setError('No se pudo resolver la ruta para validar cierre y cuadre.')
      return false
    }
    setIsPrevalidating(true)
    try {
      const [cierreAgenda, hasCuadreRuta] = await Promise.all([
        validateExisteCierreAlmacen({ fecha: fechaTrabajo }),
        validateCuadreRuta({ idRuta, fecha: fechaTrabajo }),
      ])
      if (cierreAgenda.bloqueado) {
        setError(cierreAgenda.mensaje || 'No se puede registrar el detalle porque existe cierre de almacen.')
        return false
      }
      if (hasCuadreRuta) {
        setError('No se puede registrar el detalle porque la ruta ya realizo cuadre.')
        return false
      }
      return true
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'No se pudo validar cierre/cuadre antes del registro.')
      } else {
        setError('No se pudo validar cierre/cuadre antes del registro.')
      }
      return false
    } finally {
      setIsPrevalidating(false)
    }
  }

  const mutation = useMutation({
    mutationFn: createOtDetalle,
    onSuccess: (data) => {
      setError(null)
      setSuccess(`Detalle registrado correctamente. IdVenta: ${data.idVenta ?? '-'} | OT: ${data.numeroOrden ?? numeroOrden}`)
      setMaterialRows([])
      resetMaterialForm()
    },
    onError: (err) => {
      setSuccess(null)
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'No se pudo guardar el detalle.')
        return
      }
      setError('No se pudo guardar el detalle.')
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(null)
    setError(null)
    const parsedEstado = Number(idEstado)
    if (!numeroOrden) {
      setError('No se encontro numero de OT para registrar el detalle.')
      return
    }
    if (!Number.isFinite(parsedEstado) || parsedEstado <= 0) {
      setError('Estado es requerido.')
      return
    }
    if (materialRows.length === 0) {
      setError('Debes agregar al menos un material.')
      return
    }
    const canContinue = await runPrevalidations()
    if (!canContinue) return
    mutation.mutate({
      numeroOrden,
      idEstado: parsedEstado,
      observacion: observacion.trim(),
      materiales: materialRows.map((row) => ({
        idProducto: row.idProducto,
        idTipoMaterial: row.idTipoMaterial,
        serie: row.serie,
        chipId: row.chipId,
        cantidad: row.cantidad,
        entregado: row.entregado,
      })),
    })
  }

  const headerWarning = useMemo(() => {
    if (!numeroOrden) return 'No se recibio numero de OT desde la grilla.'
    if (ventaQuery.isError) return 'No se pudo obtener la cabecera real de la venta para esta OT.'
    return null
  }, [numeroOrden, ventaQuery.isError])

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">RegistrarOrdenAgenda_Detalle</h2>
        <p className="text-sm text-slate-500">Registro de materiales usados para una OT ya creada.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormCard>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nro Orden</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={numeroOrden} disabled />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Cod Cliente</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={clienteVisible} disabled />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Fecha</label>
              <input className="input-base rounded-md bg-slate-50 py-1.5 text-sm" value={fechaTrabajo} disabled />
            </div>
          </div>
        </FormCard>

        <FormCard title="Materiales" description="Carga del detalle que se registrara en codigo venta.">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-[0.85_1_11rem] min-w-[10rem]">
              <Field label="Tipo Material">
                <select
                  ref={tipoMaterialSelectRef}
                  className="input-base"
                  value={tipoMaterialId}
                  onChange={(event) => setTipoMaterialId(event.target.value)}
                  disabled={tipoMaterialQuery.isLoading || Boolean(tipoMaterialId)}
                >
                  <option value="">{tipoMaterialQuery.isLoading ? 'Cargando tipos...' : 'Selecciona tipo material'}</option>
                  {tipoMaterialOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex-[1.6_1_18rem] min-w-[16rem]">
              <Field label="Producto">
                <select
                  ref={productoSelectRef}
                  className="input-base"
                  value={productoId}
                  onChange={(event) => setProductoId(event.target.value)}
                  onBlur={lockProducto}
                  disabled={productosQuery.isLoading || productoBloqueado || !tipoMaterialId}
                >
                  <option value="">{productosQuery.isLoading ? 'Cargando productos...' : 'Selecciona producto'}</option>
                  {productoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex-[1.1_1_13rem] min-w-[12rem]">
              <Field label="Serie" error={serieValidationError ?? undefined}>
                <input
                  ref={serieInputRef}
                  className={`input-base ${serieDisabled ? 'bg-slate-50 text-slate-400' : ''}`}
                  value={serie}
                  onFocus={handleSerieFocus}
                  onBlur={handleSerieBlur}
                  onChange={(event) => {
                    setSerie(isSerialProduct ? applyMask(event.target.value, serieMask) : event.target.value)
                    setChipUniquenessState('idle')
                  }}
                  placeholder={isSerialProduct && serieMask ? serieMask : undefined}
                  disabled={serieDisabled}
                />
              </Field>
            </div>
            <div className="flex-[1.1_1_13rem] min-w-[12rem]">
              <Field label="ChipID">
                <input
                  ref={chipIdInputRef}
                  className={`input-base ${chipDisabled ? 'bg-slate-50 text-slate-400' : ''}`}
                  value={chipId}
                  onFocus={handleCantidadFocus}
                  onBlur={handleChipBlur}
                  onChange={(event) => {
                    setChipId(canUseChipId ? applyMask(event.target.value, chipIdMask) : event.target.value)
                    setChipUniquenessState('idle')
                  }}
                  placeholder={canUseChipId && chipIdMask ? chipIdMask : undefined}
                  disabled={chipDisabled}
                />
              </Field>
            </div>
            <div className="flex-[0.85_1_11rem] min-w-[10rem]">
              <Field label="Cantidad">
                <input
                  ref={cantidadInputRef}
                  className={`input-base text-right ${isSerialProduct || !productoId ? 'bg-slate-50 text-slate-400' : ''}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={cantidad}
                  onFocus={handleCantidadFocus}
                  onChange={(event) => setCantidad(event.target.value)}
                  disabled={isSerialProduct || !productoId}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" ref={addButtonRef} onClick={addMaterial} disabled={!canAddMaterial}>
                Agregar
              </Button>
              <Button type="button" variant="secondary" onClick={resetMaterialForm}>
                Limpiar
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table columns={columns} data={materialRows} emptyLabel="Sin materiales agregados." />
          </div>
        </FormCard>

        {headerWarning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{headerWarning}</div>
        ) : null}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={mutation.isPending || isPrevalidating}>
            Volver
          </Button>
          <Button type="submit" disabled={mutation.isPending || isPrevalidating || ventaQuery.isLoading || !numeroOrden}>
            {mutation.isPending || isPrevalidating ? 'Guardando...' : 'Guardar Detalle'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default OtRealizadaPage

