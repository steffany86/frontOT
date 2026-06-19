interface TabItem {
  id: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
}

const Tabs = ({ items, activeId, onChange }: TabsProps) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1.5">
      <div className="inline-flex min-w-full gap-1.5">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'border border-brand-500/25 bg-brand-600 text-white shadow-soft'
                  : 'border border-transparent bg-white text-slate-600 hover:border-slate-300 hover:text-brand-600'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Tabs
