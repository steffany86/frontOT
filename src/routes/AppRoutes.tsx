import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import MainLayout from '../components/layout/MainLayout'
import AdminRoute from '../components/guards/AdminRoute'
import TecnicoInicioJornadaGuard from '../components/guards/TecnicoInicioJornadaGuard'
import { useAuth } from '../context/AuthContext'
import LoginPage from '../pages/LoginPage'
import OtDashboardPage from '../pages/OtDashboardPage'
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
import SupervisorSupervisionPage from '../pages/SupervisorSupervisionPage'
import BackOfficeSupervisionPage from '../pages/BackOfficeSupervisionPage'
import CentralGruposPage from '../pages/CentralGruposPage'
import PrivilegiosPage from '../pages/admin/PrivilegiosPage'
import ForbiddenPage from '../pages/ForbiddenPage'
import TecnicoInicioJornadaPage from '../pages/TecnicoInicioJornadaPage'
import ChangePasswordPage from '../pages/ChangePasswordPage'
import NpsDashboardPage from '../pages/NpsDashboardPage'
import DigitadorGeorefPage from '../pages/DigitadorGeorefPage'
import RegistroTorPage from '../pages/RegistroTorPage'
import VerificacionBoletaDigitalPage from '../pages/VerificacionBoletaDigitalPage'

const LegacyOtDetailRedirect = () => {
  const { id } = useParams()
  return <Navigate to={id ? `/GestionOTs/${id}` : '/GestionOTs/lista'} replace />
}

const AppRoutes = () => {
  const { defaultPrivatePath, isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/cambiar-password" element={<ChangePasswordPage />} />
        <Route element={<TecnicoInicioJornadaGuard />}>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to={defaultPrivatePath} replace />} />
            <Route path="/tecnico/inicio-jornada" element={<TecnicoInicioJornadaPage />} />
            <Route path="/GestionOTs" element={<OtDashboardPage />} />
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
          <Route path="/supervisor/supervision" element={<SupervisorSupervisionPage />} />
          <Route path="/backoffice/supervision" element={<BackOfficeSupervisionPage />} />
          <Route path="/central/grupos" element={<CentralGruposPage />} />
          <Route path="/nps" element={<NpsDashboardPage />} />
          <Route path="/digitador/georef" element={<DigitadorGeorefPage />} />
          <Route path="/Registro_TOR" element={<RegistroTorPage />} />
          <Route path="/VerificacionBoletaDigital" element={<VerificacionBoletaDigitalPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/privilegios" element={<PrivilegiosPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? defaultPrivatePath : '/login'} replace />} />
    </Routes>
  )
}

export default AppRoutes
