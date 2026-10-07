// Capa de datos de las obras y los pedidos.
//   getObras()        -> GET  {API}/products
//   confirmarCompra() -> POST {API}/orders  (el servidor valida y descuenta el stock y pone los precios)

import { headersDeSesion } from './api'

const API_URL = import.meta.env.VITE_API_URL

export async function getObras() {
  const respuesta = await fetch(`${API_URL}/products`)
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(cuerpo.message || `Error ${respuesta.status}`)
  return cuerpo.data
}

// Del carrito solo mandamos qué obras y cuántas: el precio lo decide el servidor.
// Devuelve { ok: true, orden, pagoUrl } | { ok: false, sinStock: [títulos] }. Otros errores: lanza.
// pagoUrl: link de Mercado Pago (null si la tienda no tiene pagos online: se coordina a mano).
export async function confirmarCompra(items, comprador) {
  const respuesta = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headersDeSesion() },
    credentials: 'include', // si hay sesión, el pedido queda asociado al usuario
    body: JSON.stringify({
      items: items.map((i) => ({ productId: i._id, cantidad: i.cantidad })),
      comprador,
    }),
  })
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (respuesta.status === 409) return { ok: false, sinStock: cuerpo.sinStock ?? [] }
  if (!respuesta.ok) throw new Error(cuerpo.message || `Error ${respuesta.status}`)
  return { ok: true, orden: cuerpo.data.code, total: cuerpo.data.total, pagoUrl: cuerpo.data.pagoUrl }
}
