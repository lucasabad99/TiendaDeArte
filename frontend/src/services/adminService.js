// Llamadas del panel admin. Cada una exige un permiso en el back (ver docs/ARQUITECTURA.md, 5b).
import { api } from './api'

// Pedidos
export const getPedidos = (status) => api(`/orders${status ? `?status=${status}` : ''}`) // orders:read
export const getMisPedidos = () => api('/orders/mine')
export const cambiarEstadoPedido = (id, status) => api(`/orders/${id}/status`, { method: 'PATCH', body: { status } }) // orders:update
export const consultarPagoPedido = (id) => api(`/orders/${id}/sincronizar`, { method: 'POST' }) // le pregunta a Mercado Pago

// Obras
export const getTodasLasObras = () => api('/products/all') // products:write (incluye borradores)
export const crearObra = (datos) => api('/products', { method: 'POST', body: datos })
export const actualizarObra = (id, datos) => api(`/products/${id}`, { method: 'PATCH', body: datos })
export const eliminarObra = (id) => api(`/products/${id}`, { method: 'DELETE' }) // products:delete

// Usuarios
export const getUsuarios = () => api('/users') // users:read
export const cambiarRol = (id, role) => api(`/users/${id}/role`, { method: 'PATCH', body: { role } }) // users:assignRole
