import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const loginCliente = (correo, contrasena) => {
  return axios.post(`${API_URL}/cliente/login`, { correo, contrasena });
};

export const obtenerCarrito = (clienteId) => {
  return axios.get(`${API_URL}/carrito/${clienteId}`);
};

export const realizarPedido = (pedido) => {
  return axios.post(`${API_URL}/pedido`, pedido);
};

// Otros servicios...
