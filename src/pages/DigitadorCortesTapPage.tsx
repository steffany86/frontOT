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
    <div className="bento-page max-w-full overflow-hidden">
      <header className="bento-page-head">
        <h2>Cortes TAP</h2>
        <p>Completa la informacion de nodo y zona para devolver cada registro al tecnico.</p>
      </header>
      <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <CortesTapPanel mode="digitador" />
      </section>
    </div>
  )
}

export default DigitadorCortesTapPage
