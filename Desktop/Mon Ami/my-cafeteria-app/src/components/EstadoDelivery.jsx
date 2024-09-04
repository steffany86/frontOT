import React, { useState } from 'react';

const EstadoDelivery = () => {
  const [estado, setEstado] = useState('Disponible');

  const cambiarEstado = (nuevoEstado) => {
    setEstado(nuevoEstado);
  };

  return (
    <div>
      <h2>Estado del Repartidor</h2>
      <p>Estado actual: {estado}</p>
      <button onClick={() => cambiarEstado('En camino')}>En Camino</button>
      <button onClick={() => cambiarEstado('Ocupado')}>Ocupado</button>
    </div>
  );
};

export default EstadoDelivery;
