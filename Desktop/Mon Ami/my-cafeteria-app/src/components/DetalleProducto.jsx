import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const DetalleProducto = () => {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);

  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/productos/${id}`);
        setProducto(response.data);
      } catch (error) {
        console.error('Error al cargar el producto:', error);
      }
    };
    fetchProducto();
  }, [id]);

  if (!producto) return <p>Cargando...</p>;

  return (
    <div>
      <h2>{producto.nombre}</h2>
      <p>Precio: ${producto.precio}</p>
      <p>{producto.descripcion}</p>
    </div>
  );
};

export default DetalleProducto;
