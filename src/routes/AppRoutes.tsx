import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ProtectedRoute from './ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import AdminRoute from '../components/guards/AdminRoute'
import { useAuth } from '../context/AuthContext'
import { fetchRutas } from '../api/catalogApi'
import { useSessionStore } from '../store/sessionStore'
import LoginPage from '../pages/LoginPage'
import OtDashboardPage from '../pages/OtDashboardPage'
import GestionOTsDTHPage from '../pages/GestionOTsDTHPage'
import OtListPage from '../pages/OtListPage'
import OtDetailPage from '../pages/OtDetailPage'
import OtCreatePage from '../pages/OtCreatePage'
import OtRealizadaPage from '../pages/OtRealizadaPage'
import OtModificarPage from '../pages/OtModificarPage'
import OtModificarFechaPage from '../pages/OtModificarFechaPage'
import OtAnularPage from '../pages/OtAnularPage'
import RegistrarOTAgendaPage from '../pages/RegistrarOTAgendaPage'
import CuNoRealizadoListPage from '../pages/CuNoRealizadoListPage'
import CuNoRealizadoDetailPage from '../pages/CuNoRealizadoDetailPage'
import CuNoRealizadoCreatePage from '../pages/CuNoRealizadoCreatePage'
import ConformacionCuadrillaPage from '../pages/ConformacionCuadrillaPage'
import LlamadaAtencionPage from '../pages/LlamadaAtencionPage'
import PrivilegiosPage from '../pages/admin/PrivilegiosPage'
import ForbiddenPage from '../pages/ForbiddenPage'
import ChangePasswordPage from '../pages/ChangePasswordPage'

const LegacyOtDetailRedirect = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/GestionOTs/${id}` : '/GestionOTs/lista'} replace />
}

const readValue = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const normalizeTech = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value).trim().toUpperCase()
}

const resolveRutaTech = (row: Record<string, unknown>): string => {
  const direct = normalizeTech(readValue(row, ['tipoTecnologia', 'TipoTecnologia', 'tipo_tecnologia', 'tipotecnologia']))
  if (direct === 'HFC' || direct === 'DTH') return direct
  const tipoGrupo = normalizeTech(readValue(row, ['tipoGrupo', 'TipoGrupo', 'tipo_grupo', 'tipogrupo', 'tipo', 'Tipo']))
  if (tipoGrupo === 'ANTENERO') return 'DTH'
  if (tipoGrupo) return 'HFC'
  return ''
}

const GestionOtHomeGate = () => {
  const session = useSessionStore((state) => state.session)
  const rutasQuery = useQuery({
    queryKey: ['catalogos-rutas-home-gate', session?.idUsuario ?? 0],
    queryFn: () => fetchRutas(session?.idUsuario),
    enabled: Boolean(session?.idUsuario),
  })

  if (rutasQuery.isLoading) return <OtDashboardPage />
  const rutas = (rutasQuery.data ?? []) as Record<string, unknown>[]
  const technologies = new Set(rutas.map(resolveRutaTech).filter(Boolean))
  if (technologies.has('HFC') || technologies.size === 0) return <OtDashboardPage />
  return <Navigate to="/GestionOTsDTH" replace />
}

const AppRoutes = () => {
  const { defaultPrivatePath, isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/cambiar-password" element={<ChangePasswordPage />} />
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to={defaultPrivatePath} replace />} />
          <Route path="/GestionOTs" element={<GestionOtHomeGate />} />
          <Route path="/GestionOTsDTH" element={<GestionOTsDTHPage />} />
          <Route path="/GestionOTs/crear" element={<OtCreatePage />} />
          <Route path="/GestionOTs/lista" element={<OtListPage />} />
          <Route path="/GestionOTs/:id" element={<OtDetailPage />} />
          <Route path="/GestionOTs/RegistrarOrdenAgenda_Detalle" element={<OtRealizadaPage />} />
          <Route path="/GestionOTs/realizada" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda_Detalle" replace />} />
          <Route path="/GestionOTs/RegistrarOrdenAgenda" element={<RegistrarOTAgendaPage />} />
          <Route path="/GestionOTs/modificar" element={<OtModificarPage />} />
          <Route path="/GestionOTs/modificar-fecha" element={<OtModificarFechaPage />} />
          <Route path="/GestionOTs/anular" element={<OtAnularPage />} />
          <Route path="/ot" element={<Navigate to="/GestionOTs" replace />} />
          <Route path="/ot/crear" element={<Navigate to="/GestionOTs/crear" replace />} />
          <Route path="/ot/lista" element={<Navigate to="/GestionOTs/lista" replace />} />
          <Route path="/ot/:id" element={<LegacyOtDetailRedirect />} />
          <Route path="/ot/RegistrarOrdenAgenda_Detalle" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda_Detalle" replace />} />
          <Route path="/ot/realizada" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda_Detalle" replace />} />
          <Route path="/ot/RegistrarOrdenAgenda" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda" replace />} />
          <Route path="/ot/modificar" element={<Navigate to="/GestionOTs/modificar" replace />} />
          <Route path="/ot/modificar-fecha" element={<Navigate to="/GestionOTs/modificar-fecha" replace />} />
          <Route path="/ot/anular" element={<Navigate to="/GestionOTs/anular" replace />} />
          <Route path="/cu-no-realizado" element={<CuNoRealizadoListPage />} />
          <Route path="/cu-no-realizado/nuevo" element={<CuNoRealizadoCreatePage />} />
          <Route path="/cu-no-realizado/:id" element={<CuNoRealizadoDetailPage />} />
          <Route path="/supervisor/conformacion-cuadrilla" element={<ConformacionCuadrillaPage />} />
          <Route path="/supervisor/conformacion-cuadrilla/ver" element={<Navigate to="/supervisor/conformacion-cuadrilla" replace />} />
          <Route path="/supervisor/conformacion-cuadrilla/crear" element={<Navigate to="/supervisor/conformacion-cuadrilla" replace />} />
          <Route path="/supervisor/conformacion-cuadrilla/editar" element={<Navigate to="/supervisor/conformacion-cuadrilla" replace />} />
          <Route path="/supervisor/llamada-atencion" element={<LlamadaAtencionPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/privilegios" element={<PrivilegiosPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? defaultPrivatePath : '/login'} replace />} />
    </Routes>
  )
}

export default AppRoutes
