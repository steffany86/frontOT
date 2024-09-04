import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CarritoCliente = () => {
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    const fetchCarrito = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/carrito');
        setCarrito(response.data);
      } catch (error) {
        console.error('Error al cargar el carrito:', error);
      }
    };
    fetchCarrito();
  }, []);

  const eliminarProducto = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/carrito/producto/${id}`);
      setCarrito(carrito.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
    }
  };

  return (
    <div>
      <h2>Tu Carrito</h2>
      {carrito.map((item) => (
        <div key={item.id}>
          <h3>{item.nombre}</h3>
          <p>Cantidad: {item.cantidad}</p>
          <p>Precio: ${item.precio}</p>
          <button onClick={() => eliminarProducto(item.id)}>Eliminar</button>
        </div>
      ))}
      <h3>Total: ${carrito.reduce((total, item) => total + item.precio * item.cantidad, 0)}</h3>
    </div>
  );
};

export default CarritoCliente;
