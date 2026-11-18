import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageLayout, { PagePanel, PageStat } from '../components/common/PageLayout'
import ImageLightbox from '../components/common/ImageLightbox'
import Button from '../components/common/Button'
import { INVENTARIO_DPTO_91 } from '../data/inventarioDpto91'
import { getApiErrorMessage } from '../services/httpClient'
import {
  ESTADOS,
  agregarFotoInventario,
  eliminarFotoInventario,
  fetchFotoInventario,
  fetchInventarioDpto,
  guardarItemInventario,
  type Estado,
  type RegistroInventario,
} from '../api/inventarioDptoApi'

// Pagina oculta (sin entrada en el menu). El back valida que el usuario sea "stefany".

const ESTADO_CLASES: Record<Estado, string> = {
  Bueno: 'bg-emerald-100 text-emerald-700',
  Regular: 'bg-amber-100 text-amber-700',
  Dañado: 'bg-rose-100 text-rose-700',
  Faltante: 'bg-slate-300 text-slate-700',
  'A cambiar': 'bg-violet-100 text-violet-700',
}

const normalize = (v?: string) => (v ?? '').normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
const hoy = () => new Date().toLocaleDateString('en-CA') // yyyy-MM-dd en hora local
const usd = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const VACIO: RegistroInventario = { estado: 'Bueno', observacion: '', fechaCambio: '', motivoCambio: '' }

const comprimir = (file: File, maxLado = 1280, calidad = 0.75): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', calidad))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })

const FotoThumb = ({ id, alt, grande, onOpen, onRemove }: { id: number; alt: string; grande?: boolean; onOpen: (src: string) => void; onRemove: () => void }) => {
  const { data } = useQuery({ queryKey: ['inv-dpto-foto', id], queryFn: () => fetchFotoInventario(id), staleTime: Infinity })
  const size = grande ? 'h-16 w-16' : 'h-10 w-10'
  return (
    <div className="group relative">
      {data ? (
        <img src={data} alt={alt} onClick={() => onOpen(data)} className={`${size} cursor-pointer rounded-md border border-slate-200 object-cover`} />
      ) : (
        <div className={`${size} animate-pulse rounded-md bg-slate-200`} />
      )}
      {/* En telefono no hay hover: la X queda siempre visible */}
      <button
        type="button"
        title="Quitar foto"
        onClick={onRemove}
        className={`absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-rose-600 text-xs leading-none text-white ${grande ? '' : 'hidden group-hover:block'}`}
      >
        ×
      </button>
    </div>
  )
}

const InventarioDptoPage = () => {

  const [registros, setRegistros] = useState<Record<number, RegistroInventario>>({})
  const [fotos, setFotos] = useState<Record<number, number[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | Estado>('Todos')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const itemSubiendo = useRef<number | null>(null)

  const datosQuery = useQuery({ queryKey: ['inv-dpto-datos'], queryFn: fetchInventarioDpto, refetchOnWindowFocus: false })

  useEffect(() => {
    if (datosQuery.data) {
      setRegistros(datosQuery.data.registros)
      setFotos(datosQuery.data.fotos)
    }
  }, [datosQuery.data])

  const get = (item: number): RegistroInventario => registros[item] ?? VACIO

  const guardar = (item: number, parche: Partial<RegistroInventario>) => {
    const nuevo = { ...get(item), ...parche }
    setRegistros((prev) => ({ ...prev, [item]: nuevo }))
    // "A cambiar" necesita fecha y motivo: hasta que esten completos solo queda en pantalla.
    if (nuevo.estado === 'A cambiar' && (!nuevo.fechaCambio || !nuevo.motivoCambio.trim())) return
    guardarItemInventario(item, nuevo)
      .then(() => setError(null))
      .catch((err) => setError(getApiErrorMessage(err)))
  }

  const cambiarEstado = (item: number, estado: Estado) => {
    if (estado === 'A cambiar') guardar(item, { estado, fechaCambio: get(item).fechaCambio || hoy() })
    else guardar(item, { estado, fechaCambio: '', motivoCambio: '' })
  }

  const onFotos = async (files: FileList | null) => {
    const item = itemSubiendo.current
    if (!files || item === null) return
    try {
      for (const file of Array.from(files)) {
        const id = await agregarFotoInventario(item, await comprimir(file))
        setFotos((prev) => ({ ...prev, [item]: [...(prev[item] ?? []), id] }))
      }
      setError(null)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const quitarFoto = (item: number, id: number) => {
    eliminarFotoInventario(id)
      .then(() => setFotos((prev) => ({ ...prev, [item]: (prev[item] ?? []).filter((x) => x !== id) })))
      .catch((err) => setError(getApiErrorMessage(err)))
  }

  const filas = useMemo(() => {
    const q = normalize(busqueda)
    return INVENTARIO_DPTO_91.filter((it) => {
      if (q && !normalize(it.articulo).includes(q) && String(it.item) !== q) return false
      if (filtroEstado !== 'Todos' && (registros[it.item] ?? VACIO).estado !== filtroEstado) return false
      return true
    })
  }, [busqueda, filtroEstado, registros])

  const total = INVENTARIO_DPTO_91.reduce((s, it) => s + it.cantidad * it.valorUnitario, 0)
  const conteo = (e: Estado) => INVENTARIO_DPTO_91.filter((it) => get(it.item).estado === e).length
  const conFotos = INVENTARIO_DPTO_91.filter((it) => (fotos[it.item]?.length ?? 0) > 0).length

  // El back rechaza (403) a cualquier usuario distinto de stefany: en ese caso solo se muestra el mensaje.
  if (datosQuery.isError) {
    return <div className="px-4 py-10 text-sm font-semibold text-red-600">{getApiErrorMessage(datosQuery.error)}</div>
  }
  if (datosQuery.isLoading) {
    return <div className="px-4 py-10 text-sm text-slate-600">Cargando...</div>
  }

  // Controles compartidos por la tarjeta (telefono) y la tabla (escritorio).
  // En telefono: campos mas altos, ancho completo y texto de 16px (evita el zoom automatico de iOS).
  const campo = (movil: boolean) =>
    `rounded-md bg-slate-100 px-2.5 outline-none focus:ring-2 focus:ring-brand-100 ${movil ? 'h-10 w-full text-base' : 'h-7 px-2'}`

  const estadoControles = (item: number, r: RegistroInventario, movil: boolean) => (
    <div className="flex flex-col gap-1.5">
      <select
        value={r.estado}
        onChange={(e) => cambiarEstado(item, e.target.value as Estado)}
        className={`rounded-md px-2 font-semibold outline-none ${movil ? 'h-10 w-full text-base' : 'h-7'} ${ESTADO_CLASES[r.estado]}`}
      >
        {ESTADOS.map((e) => (
          <option key={e}>{e}</option>
        ))}
      </select>
      {r.estado === 'A cambiar' ? (
        <>
          <label className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-500">
            Fecha del cambio
            <input type="date" value={r.fechaCambio} onChange={(e) => guardar(item, { fechaCambio: e.target.value })} className={campo(movil)} />
          </label>
          <input
            key={`${item}-motivo-${datosQuery.dataUpdatedAt}`}
            defaultValue={r.motivoCambio}
            onBlur={(e) => e.target.value !== r.motivoCambio && guardar(item, { motivoCambio: e.target.value })}
            placeholder="Motivo del cambio *"
            className={`${campo(movil)} ${movil ? '' : 'min-w-[8rem]'}`}
          />
          {!r.motivoCambio.trim() || !r.fechaCambio ? (
            <span className="text-[10px] font-semibold text-violet-700">Falta motivo/fecha: aun no se guarda</span>
          ) : null}
        </>
      ) : null}
    </div>
  )

  const observacionInput = (item: number, r: RegistroInventario, movil: boolean) => (
    <input
      key={`${item}-obs-${datosQuery.dataUpdatedAt}`}
      defaultValue={r.observacion}
      onBlur={(e) => e.target.value !== r.observacion && guardar(item, { observacion: e.target.value })}
      placeholder="Observacion..."
      className={`${campo(movil)} ${movil ? '' : 'min-w-[9rem]'}`}
    />
  )

  const fotosBloque = (articulo: string, item: number, movil: boolean) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {(fotos[item] ?? []).map((id, i) => (
        <FotoThumb key={id} id={id} alt={`${articulo} ${i + 1}`} grande={movil} onOpen={setLightbox} onRemove={() => quitarFoto(item, id)} />
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          itemSubiendo.current = item
          fileRef.current?.click()
        }}
      >
        + Foto
      </Button>
    </div>
  )

  return (
    <PageLayout
      title="Inventario Dpto 91"
      subtitle="Contrato privado de arrendamiento - Baruc. Valores en USD."
      stats={
        <>
          <PageStat label="Items" value={INVENTARIO_DPTO_91.length} tone="blue" />
          <PageStat label="Bueno" value={conteo('Bueno')} tone="emerald" />
          <PageStat label="Regular" value={conteo('Regular')} tone="amber" />
          <PageStat label="Dañado" value={conteo('Dañado')} tone="rose" />
          <PageStat label="Faltante" value={conteo('Faltante')} />
          <PageStat label="A cambiar" value={conteo('A cambiar')} tone="blue" />
          <PageStat label="Con fotos" value={conFotos} />
          <PageStat label="Total USD" value={usd(total)} tone="blue" />
        </>
      }
      filters={
        <>
          <label className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-500">
            Buscar
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Articulo o numero"
              className="h-10 w-full rounded-md text-base sm:h-8 sm:w-56 sm:text-[11px] bg-slate-100 px-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] font-medium text-slate-500">
            Estado
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as 'Todos' | Estado)}
              className="h-10 w-full rounded-md bg-slate-100 px-2.5 text-base text-slate-800 outline-none focus:ring-2 focus:ring-brand-100 sm:h-8 sm:w-auto sm:text-[11px]"
            >
              <option>Todos</option>
              {ESTADOS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
        </>
      }
    >
      {error ? <p className="font-semibold text-red-600">{error}</p> : null}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFotos(e.target.files)} />

      <PagePanel title="Articulos" description={`${filas.length} de ${INVENTARIO_DPTO_91.length} registro(s)`}>
        {/* Telefono / tablet: una tarjeta por articulo */}
        <div className="space-y-2 lg:hidden">
          {filas.map((it) => {
            const r = get(it.item)
            return (
              <article key={it.item} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 text-sm font-bold text-slate-900">
                    <span className="mr-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">#{it.item}</span>
                    {it.articulo}
                  </h3>
                  <p className="shrink-0 text-right text-sm font-extrabold text-slate-900">{usd(it.cantidad * it.valorUnitario)}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {it.cantidad} × {usd(it.valorUnitario)} USD
                </p>
                <div className="mt-2 space-y-2">
                  {estadoControles(it.item, r, true)}
                  {observacionInput(it.item, r, true)}
                  {fotosBloque(it.articulo, it.item, true)}
                </div>
              </article>
            )
          })}
          <p className="px-1 pt-1 text-right text-sm font-extrabold text-slate-900">Total: {usd(total)} USD</p>
        </div>

        {/* Escritorio: tabla */}
        {/* El contenedor hace scroll en ambos ejes: asi la cabecera queda fija arriba al bajar. */}
        <div className="hidden max-h-[calc(100vh-11rem)] overflow-auto lg:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-500 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-white [&>th]:shadow-[inset_0_-1px_0_rgb(226,232,240)]">
                <th className="px-2 py-1.5">Item</th>
                <th className="px-2 py-1.5">Articulo</th>
                <th className="px-2 py-1.5 text-right">Cant.</th>
                <th className="px-2 py-1.5 text-right">Valor unit. (USD)</th>
                <th className="px-2 py-1.5 text-right">Total (USD)</th>
                <th className="px-2 py-1.5">Estado</th>
                <th className="px-2 py-1.5">Observacion</th>
                <th className="px-2 py-1.5">Fotos</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((it) => {
                const r = get(it.item)
                return (
                  <tr key={it.item} className="border-b border-slate-100 align-top hover:bg-slate-50">
                    <td className="px-2 py-1.5 font-semibold">{it.item}</td>
                    <td className="px-2 py-1.5">{it.articulo}</td>
                    <td className="px-2 py-1.5 text-right">{it.cantidad}</td>
                    <td className="px-2 py-1.5 text-right">{usd(it.valorUnitario)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{usd(it.cantidad * it.valorUnitario)}</td>
                    <td className="px-2 py-1.5">{estadoControles(it.item, r, false)}</td>
                    <td className="px-2 py-1.5">{observacionInput(it.item, r, false)}</td>
                    <td className="px-2 py-1.5">{fotosBloque(it.articulo, it.item, false)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={4} className="px-2 py-2 text-right">
                  Total
                </td>
                <td className="px-2 py-2 text-right">{usd(total)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </PagePanel>

      <ImageLightbox open={lightbox !== null} src={lightbox ?? ''} onClose={() => setLightbox(null)} />
    </PageLayout>
  )
}

export default InventarioDptoPage
