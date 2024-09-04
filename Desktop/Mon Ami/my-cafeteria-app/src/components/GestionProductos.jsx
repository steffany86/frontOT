import React, { useState } from 'react';
import axios from 'axios';

const GestionProductos = () => {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(0);
  const [descripcion, setDescripcion] = useState('');
  const [productos, setProductos] = useState([]);

  const agregarProducto = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/productos', {
        nombre,
        precio,
        descripcion,
      });
      setProductos([...productos, response.data]);
    } catch (error) {
      console.error('Error al agregar el producto:', error);
    }
  };

  return (
    <div>
      <h2>Gestionar Productos</h2>
      <div>
        <label>Nombre del producto:</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div>
        <label>Precio:</label>
        <input type="number" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} />
      </div>
      <div>
        <label>Descripción:</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <button onClick={agregarProducto}>Agregar Producto</button>
    </div>
  );
};

export default GestionProductos;
