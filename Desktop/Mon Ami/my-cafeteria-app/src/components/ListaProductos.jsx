import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ListaProductos = () => {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/productos');
        setProductos(response.data);
      } catch (error) {
        console.error('Error al cargar productos:', error);
      }
    };
    fetchProductos();
  }, []);

  return (
    <div>
      <h2>Lista de Productos</h2>
      {productos.map((producto) => (
        <div key={producto.id}>
          <h3>{producto.nombre}</h3>
          <p>Precio: ${producto.precio}</p>
          <p>{producto.descripcion}</p>
        </div>
      ))}
    </div>
  );
};

export default ListaProductos;
