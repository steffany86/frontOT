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
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-2">
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
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
  )
}

export default Tabs
