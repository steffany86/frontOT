import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

interface SignaturePadProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  height?: number
}

const STROKE_COLOR = '#0f172a'

const SignaturePad = ({
  value = '',
  onChange,
  disabled = false,
  height = 160,
}: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const hasInkRef = useRef(false)
  const lastEmittedValueRef = useRef<string>('')

  const getContext = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }

  const paintBackground = () => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = STROKE_COLOR
    ctx.fillStyle = STROKE_COLOR
  }

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    const width = Math.max(parent?.clientWidth ?? 320, 240)
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = getContext()
    if (!ctx) return
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    paintBackground()
  }

  const renderDataUrl = (dataUrl: string) => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    const image = new Image()
    image.onload = () => {
      paintBackground()
      ctx.drawImage(image, 0, 0, canvas.clientWidth, canvas.clientHeight)
    }
    image.src = dataUrl
  }

  const clearSignature = () => {
    paintBackground()
    drawingRef.current = false
    hasInkRef.current = false
    lastEmittedValueRef.current = ''
    onChange('')
  }

  const getPoint = (event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const point = getPoint(event)
    ctx.beginPath()
    ctx.arc(point.x, point.y, 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    hasInkRef.current = true
  }

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return
    const ctx = getContext()
    if (!ctx) return
    event.preventDefault()
    const point = getPoint(event)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    hasInkRef.current = true
  }

  const endDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    event.preventDefault()
    drawingRef.current = false
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
    ctx.closePath()
    const dataUrl = hasInkRef.current ? canvas.toDataURL('image/png') : ''
    lastEmittedValueRef.current = dataUrl
    onChange(dataUrl)
  }

  useEffect(() => {
    resizeCanvas()
    const handleResize = () => resizeCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [height])

  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed === lastEmittedValueRef.current) return
    if (!trimmed) {
      paintBackground()
      hasInkRef.current = false
      return
    }
    if (trimmed.startsWith('data:image/')) {
      hasInkRef.current = true
      renderDataUrl(trimmed)
    }
  }, [value])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Dibuja tu firma
        </span>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
          onClick={clearSignature}
          disabled={disabled}
        >
          Limpiar
        </button>
      </div>
      <div className={disabled ? 'pointer-events-none opacity-70' : ''}>
        <canvas
          ref={canvasRef}
          className="w-full touch-none bg-white"
          style={{ height: `${height}px`, cursor: disabled ? 'not-allowed' : 'crosshair' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
          onPointerCancel={endDrawing}
        />
      </div>
    </div>
  )
}

export default SignaturePad
