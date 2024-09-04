class Cliente {
    constructor(id, nombre, correo, contrasena) {
      this.id = id;
      this.nombre = nombre;
      this.correo = correo;
      this.contrasena = contrasena;
    }
  
    // Método para iniciar sesión
    iniciarSesion(correo, contrasena) {
      if (this.correo === correo && this.contrasena === contrasena) {
        console.log('Inicio de sesión exitoso');
        return true;
      } else {
        console.log('Correo o contraseña incorrectos');
        return false;
      }
    }
  
    // Método para realizar un pedido
    realizarPedido(pedido) {
      console.log(`Cliente ${this.nombre} ha realizado un pedido de $${pedido.total}.`);
      // Aquí podrías hacer lógica adicional para procesar el pedido
    }
  }
  
  export default Cliente;
  