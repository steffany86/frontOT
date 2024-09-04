class Producto {
    constructor(id, nombre, precio, descripcion, cantidadDisponible) {
      this.id = id;
      this.nombre = nombre;
      this.precio = precio;
      this.descripcion = descripcion;
      this.cantidadDisponible = cantidadDisponible;
    }
  
    // Método para actualizar la cantidad disponible del producto
    actualizarCantidad(nuevaCantidad) {
      this.cantidadDisponible = nuevaCantidad;
      console.log(`${this.nombre} ahora tiene ${nuevaCantidad} unidades disponibles.`);
    }
  
    // Método para calcular el precio total por una cantidad de este producto
    calcularTotal(cantidad) {
      return this.precio * cantidad;
    }
  }
  
  export default Producto;
  