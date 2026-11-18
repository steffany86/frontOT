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
import ModificarOT from '../pages/ModificarOT'
import ModificarOTDetalle from '../pages/ModificarOTDetalle'
import OtModificarFechaPage from '../pages/OtModificarFechaPage'
import OtAnularPage from '../pages/OtAnularPage'
import RegistrarOTAgendaPage from '../pages/RegistrarOTAgendaPage'
import CuNoRealizadoListPage from '../pages/CuNoRealizadoListPage'
import CuNoRealizadoDetailPage from '../pages/CuNoRealizadoDetailPage'
import CuNoRealizadoCreatePage from '../pages/CuNoRealizadoCreatePage'
import ConformacionCuadrillaPage from '../pages/ConformacionCuadrillaPage'
import LlamadaAtencionPage from '../pages/LlamadaAtencionPage'
import SupervisorSupervisionV2Page from '../pages/SupervisorSupervisionV2Page'
import SupervisionV2ConfiguracionPage from '../pages/SupervisionV2ConfiguracionPage'
import ConfiguracionesPage from '../pages/ConfiguracionesPage'
import CentralGruposPage from '../pages/CentralGruposPage'
import PrivilegiosPage from '../pages/admin/PrivilegiosPage'
import DTHPruebaPage from '../pages/DTHPruebaPage'
import ForbiddenPage from '../pages/ForbiddenPage'
import TecnicoInicioJornadaPage from '../pages/TecnicoInicioJornadaPage'
import CuadreTecnicoPage from '../pages/CuadreTecnicoPage'
import ChangePasswordPage from '../pages/ChangePasswordPage'
import NpsDashboardPage from '../pages/NpsDashboardPage'
import DigitadorGeorefPage from '../pages/DigitadorGeorefPage'
import DigitadorCruceNoFinalizadoPage from '../pages/DigitadorCruceNoFinalizadoPage'
import DigitadorCortesTapPage from '../pages/DigitadorCortesTapPage'
import RegistroTorPage from '../pages/RegistroTorPage'
import VerificacionBoletaDigitalPage from '../pages/VerificacionBoletaDigitalPage'
import HistoricoJornadasPage from '../pages/HistoricoJornadasPage'
import NombresNpsPage from '../pages/NombresNpsPage'
import NodoZonaPage from '../pages/NodoZonaPage'
import SeguimientoControlConfPage from '../pages/SeguimientoControlConfPage'
import CruceAgendaBackOfficeV2Page from '../pages/cruceagenda_BackOfficeV2'
import CruceAgendaSupervisorV2Page from '../pages/cruceagenda_SupervisorV2'
import PedidoMaterialPage from '../pages/PedidoMaterialPage'
import SistemasProduccionPage from '../pages/SistemasProduccionPage'
import InventarioDptoPage from '../pages/InventarioDptoPage'
import SistemasCuadreAutomaticoPage from '../pages/SistemasCuadreAutomaticoPage'
import SistemasSupervisionSucursalesPage from '../pages/SistemasSupervisionSucursalesPage'
import SistemasActividadesSantiagoPage from '../pages/SistemasActividadesSantiagoPage'

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
            <Route path="/tecnico/cuadre" element={<CuadreTecnicoPage />} />
            <Route path="/GestionOTs" element={<OtDashboardPage />} />
          <Route path="/GestionOTs/crear" element={<OtCreatePage />} />
          <Route path="/GestionOTs/lista" element={<OtListPage />} />
          <Route path="/GestionOTs/:id" element={<OtDetailPage />} />
          <Route path="/GestionOTs/RegistrarOrdenAgenda_Detalle" element={<OtRealizadaPage />} />
          <Route path="/GestionOTs/realizada" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda_Detalle" replace />} />
          <Route path="/GestionOTs/RegistrarOrdenAgenda" element={<RegistrarOTAgendaPage />} />
          <Route path="/GestionOTs/ModificarOT" element={<ModificarOT />} />
          <Route path="/GestionOTs/ModificarOTDetalle" element={<ModificarOTDetalle />} />
          <Route path="/GestionOTs/modificar-fecha" element={<OtModificarFechaPage />} />
          <Route path="/GestionOTs/anular" element={<OtAnularPage />} />
          <Route path="/ot" element={<Navigate to="/GestionOTs" replace />} />
          <Route path="/ot/crear" element={<Navigate to="/GestionOTs/crear" replace />} />
          <Route path="/ot/lista" element={<Navigate to="/GestionOTs/lista" replace />} />
          <Route path="/ot/:id" element={<LegacyOtDetailRedirect />} />
          <Route path="/ot/RegistrarOrdenAgenda_Detalle" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda_Detalle" replace />} />
          <Route path="/ot/realizada" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda_Detalle" replace />} />
          <Route path="/ot/RegistrarOrdenAgenda" element={<Navigate to="/GestionOTs/RegistrarOrdenAgenda" replace />} />
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
          <Route path="/supervisor/supervision" element={<Navigate to="/supervisor/supervision_v2" replace />} />
          <Route path="/supervisor/supervision_v2" element={<SupervisorSupervisionV2Page />} />
          <Route path="/supervisor/supervision_v2Configuracion" element={<SupervisionV2ConfiguracionPage />} />
          <Route path="/sistemas/configuraciones" element={<ConfiguracionesPage />} />
          <Route path="/backoffice/nombres-nps" element={<NombresNpsPage />} />
          <Route path="/backoffice/nodo-zona" element={<NodoZonaPage />} />
          <Route path="/backoffice/seguimiento-control-conf" element={<SeguimientoControlConfPage />} />
          <Route path="/jornadas/historico" element={<HistoricoJornadasPage />} />
          <Route path="/central/grupos" element={<CentralGruposPage />} />
          <Route path="/nps" element={<NpsDashboardPage />} />
          <Route path="/digitador/georef" element={<DigitadorGeorefPage />} />
          <Route path="/digitador/cruce-no-finalizado" element={<DigitadorCruceNoFinalizadoPage />} />
          <Route path="/digitador/cortes-tap" element={<DigitadorCortesTapPage />} />
          <Route path="/pedidos-material" element={<PedidoMaterialPage />} />
          <Route path="/Registro_TOR" element={<RegistroTorPage />} />
          <Route path="/VerificacionBoletaDigital" element={<VerificacionBoletaDigitalPage />} />
          <Route path="/almacen/cruce-agenda-makiroBackOfficeV2" element={<CruceAgendaBackOfficeV2Page />} />
          <Route path="/almacen/cruce-agenda-makiroSupervisorV2" element={<CruceAgendaSupervisorV2Page />} />
          <Route path="/sistemas/produccion" element={<SistemasProduccionPage />} />
          <Route path="/inventario-dpto-91" element={<InventarioDptoPage />} />
          <Route path="/sistemas/inventario-dpto-91" element={<InventarioDptoPage />} />
          <Route path="/sistemas/cuadre-automatico" element={<SistemasCuadreAutomaticoPage />} />
          <Route path="/sistemas/supervision-sucursales" element={<SistemasSupervisionSucursalesPage />} />
          <Route path="/sistemas/actividades" element={<SistemasActividadesSantiagoPage />} />
            <Route path="/dth/prueba" element={<DTHPruebaPage />} />
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
