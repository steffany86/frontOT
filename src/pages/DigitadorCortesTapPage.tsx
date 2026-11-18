import { useAuth } from '../context/AuthContext'
import CortesTapPanel from '../components/ot/CortesTapPanel'

const DigitadorCortesTapPage = () => {
  const { roleId, roleName } = useAuth()
  const role = roleName.trim().toLowerCase().replace(/[\s_]+/g, '')
  const allowed = roleId === 7 || ['digitador', 'sistemas', 'admin', 'administrador'].includes(role)

  if (!allowed) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Esta opcion esta disponible unicamente para digitadores.</div>
  }

  return (
    <div className="bento-page sup-v2-fs max-w-full gap-2 overflow-hidden">
      <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <h2 className="shrink-0 page-title">Cortes TAP</h2>
        </div>
        <div className="min-w-0 border-t border-slate-200 px-2 py-1.5 sm:px-3">
          <CortesTapPanel mode="digitador" />
        </div>
      </section>
    </div>
  )
}

export default DigitadorCortesTapPage
