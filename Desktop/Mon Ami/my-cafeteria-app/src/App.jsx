import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginCliente from './components/LoginCliente';
import CarritoCliente from './components/CarritoCliente';
import PedidoCliente from './components/PedidoCliente';
import DashboardAdmin from './components/DashboardAdmin';
import GestionProductos from './components/GestionProductos';
import EstadoDelivery from './components/EstadoDelivery';
import ListaProductos from './components/ListaProductos';
import DetalleProducto from './components/DetalleProducto';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/cliente/login" element={<LoginCliente />} />
        <Route path="/cliente/carrito" element={<CarritoCliente />} />
        <Route path="/cliente/pedido" element={<PedidoCliente />} />

        {/* Rutas para Administrador */}
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/gestion-productos" element={<GestionProductos />} />

        {/* Ruta para Delivery */}
        <Route path="/delivery/estado" element={<EstadoDelivery />} />

        {/* Productos */}
        <Route path="/productos" element={<ListaProductos />} />
        <Route path="/productos/:id" element={<DetalleProducto />} />
      </Routes>
    </Router>
  );
}

export default App;
