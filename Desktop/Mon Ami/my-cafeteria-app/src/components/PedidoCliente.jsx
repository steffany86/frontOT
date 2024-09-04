import React, { useState } from 'react';
import axios from 'axios';

const PedidoCliente = ({ carrito }) => {
  const [direccion, setDireccion] = useState('');

  const realizarPedido = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/pedido', {
        carrito,
        direccion,
      });
      console.log('Pedido realizado:', response.data);
      // Aquí puedes limpiar el carrito o redirigir al cliente
    } catch (error) {
      console.error('Error al realizar el pedido:', error);
    }
  };

  return (
    <div>
      <h2>Realizar Pedido</h2>
      <div>
        <label>Dirección de entrega:</label>
        <input
          type="text"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          required
        />
      </div>
      <button onClick={realizarPedido}>Confirmar Pedido</button>
    </div>
  );
};

export default PedidoCliente;
