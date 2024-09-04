class Carrito {
    constructor(cliente) {
      this.cliente = cliente;
      this.productos = []; // Lista de productos en el carrito
      this.total = 0;
    }
  
    // Agregar un producto al carrito
    agregarProducto(producto, cantidad) {
      const itemExistente = this.productos.find((item) => item.producto.id === producto.id);
      if (itemExistente) {
        itemExistente.cantidad += cantidad;
      } else {
        this.productos.push({ producto, cantidad });
      }
      this.calcularTotal();
      console.log(`Se agregó ${cantidad} de ${producto.nombre} al carrito.`);
    }
  
    // Eliminar un producto del carrito
    eliminarProducto(productoId) {
      this.productos = this.productos.filter((item) => item.producto.id !== productoId);
      this.calcularTotal();
      console.log('Producto eliminado del carrito.');
    }
  
    // Calcular el total del carrito
    calcularTotal() {
      this.total = this.productos.reduce(
        (acc, item) => acc + item.producto.calcularTotal(item.cantidad),
        0
      );
      console.log(`Total del carrito: $${this.total}`);
    }
  
    // Vaciar el carrito
    vaciarCarrito() {
      this.productos = [];
      this.total = 0;
      console.log('Carrito vacío.');
    }
  }
  
  export default Carrito;
  