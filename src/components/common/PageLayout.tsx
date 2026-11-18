import type { ReactNode } from 'react'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/**
 * PAGINA MAESTRA (master page) del sistema.
 *
 * Toda pagina nueva debe usar <PageLayout> para heredar el mismo formato:
 *  - Letra de 11px (clase `sup-v2-fs`) y espacios de 8px entre paneles.
 *  - Misma tarjeta de cabecera: titulo + subtitulo a la izquierda, chips/acciones a la derecha,
 *    pestañas debajo (estilo Sup_v2) y filtros plegables ("Mostrar filtros").
 *  - Mismo ancho y alineacion horizontal que la cabecera general (Header).
 *
 * Ejemplo:
 *   <PageLayout title="Mi pagina" subtitle="Descripcion corta" actions={<Button>Nuevo</Button>}
 *     tabs={<PageTabs items={[...]} activeId={tab} onChange={setTab} />}
 *     filters={<>...campos...</>}>
 *     <PagePanel title="Listado" description="12 registro(s)">...</PagePanel>
 *   </PageLayout>
 */

interface PageLayoutProps {
  title: string
  subtitle?: string
  /** Botones de la cabecera (Nuevo, Actualizar, ...). */
  actions?: ReactNode
  /** Chips contadores (ver <PageStat>). */
  stats?: ReactNode
  /** Pestañas (ver <PageTabs>). */
  tabs?: ReactNode
  /** Contenido de los filtros; se muestra dentro de "Mostrar filtros". */
  filters?: ReactNode
  /** Abre los filtros por defecto. */
  filtersOpen?: boolean
  className?: string
  children?: ReactNode
}

export const PageLayout = ({ title, subtitle, actions, stats, tabs, filters, filtersOpen = false, className = '', children }: PageLayoutProps) => (
  <div className={`bento-page sup-v2-fs ${className}`.trim()}>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <h2 className="page-title">{title}</h2>
          {subtitle ? <p className="text-slate-500">{subtitle}</p> : null}
        </div>
        {stats || actions ? (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {stats}
            {actions}
          </div>
        ) : null}
      </div>
      {tabs ? <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 px-2 py-1.5 sm:px-3">{tabs}</div> : null}
      {filters ? (
        <details className="group border-t border-slate-200 px-2 py-1 sm:px-3" open={filtersOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1.5 py-1.5 font-semibold text-slate-700 outline-none transition hover:bg-slate-50">
            <span className="group-open:hidden">Mostrar filtros</span>
            <span className="hidden group-open:inline">Ocultar filtros</span>
            <span className="text-base leading-none text-blue-600 transition group-open:rotate-45">+</span>
          </summary>
          <div className="flex flex-wrap items-end gap-2 pb-1 pt-1.5">{filters}</div>
        </details>
      ) : null}
    </section>
    {children}
  </div>
)

interface PageTabItem {
  id: string
  label: string
  icon?: IconDefinition
  count?: number
}

export const PageTabs = ({ items, activeId, onChange }: { items: PageTabItem[]; activeId: string; onChange: (id: string) => void }) => (
  <>
    {items.map((item) => {
      const active = item.id === activeId
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-2.5 py-1.5 text-xs font-bold transition ${
            active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {item.icon ? <FontAwesomeIcon icon={item.icon} /> : null}
          {item.label}
          {item.count !== undefined ? (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${active ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white'}`}>
              {item.count > 99 ? '99+' : item.count}
            </span>
          ) : null}
        </button>
      )
    })}
  </>
)

const STAT_TONES = {
  blue: 'border-blue-100 bg-blue-50/60 text-slate-500 [&>p:last-child]:text-brand-600',
  amber: 'border-amber-100 bg-amber-50/70 text-amber-700 [&>p:last-child]:text-amber-600',
  emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700 [&>p:last-child]:text-emerald-600',
  rose: 'border-rose-100 bg-rose-50/70 text-rose-700 [&>p:last-child]:text-rose-600',
  slate: 'border-slate-200 bg-slate-50 text-slate-500 [&>p:last-child]:text-slate-700',
} as const

export const PageStat = ({ label, value, tone = 'slate' }: { label: string; value: ReactNode; tone?: keyof typeof STAT_TONES }) => (
  <div className={`min-w-[54px] rounded-lg border px-1.5 py-1 text-center sm:min-w-[68px] sm:px-2.5 ${STAT_TONES[tone]}`}>
    <p className="text-[8px] font-bold uppercase tracking-tight sm:tracking-wide">{label}</p>
    <p className="text-base font-extrabold leading-none">{value}</p>
  </div>
)

/** Panel de contenido con el mismo borde/espaciado que la cabecera. */
export const PagePanel = ({ title, description, actions, children, className = '' }: { title?: string; description?: string; actions?: ReactNode; children?: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}>
    {title || actions ? (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5 sm:px-4">
        <div className="min-w-0">
          {title ? <h3 className="page-panel-title">{title}</h3> : null}
          {description ? <p className="text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
      </div>
    ) : null}
    <div className="p-2 sm:p-3">{children}</div>
  </section>
)

export default PageLayout
