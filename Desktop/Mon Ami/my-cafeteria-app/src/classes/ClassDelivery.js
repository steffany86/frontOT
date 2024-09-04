class Delivery {
    constructor(id, nombre) {
      this.id = id;
      this.nombre = nombre;
      this.estado = 'Disponible'; // El estado puede ser 'Disponible', 'En camino', 'Ocupado'
    }
  
    // Método para actualizar el estado del repartidor
    actualizarEstado(nuevoEstado) {
      this.estado = nuevoEstado;
      console.log(`Delivery ${this.nombre} ahora está ${nuevoEstado}`);
    }
  
    // Método para entregar un pedido
    entregarPedido(pedido) {
      console.log(`Entregando pedido a ${pedido.cliente.nombre}`);
      pedido.estado = 'Entregado';
      this.actualizarEstado('Disponible');
    }
  }
  
  export default Delivery;
  