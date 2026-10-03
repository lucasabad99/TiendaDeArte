// Capa de datos de las obras. HOY: datos ficticios + stock simulado en localStorage.
// MAÑANA: estas mismas funciones llaman al Backend I y el resto de la app no cambia.
//
//   getObras()        -> GET  {API}/api/products
//   confirmarCompra() -> POST {API}/api/carts/:cid/purchase   (a crear en el back)

import { obras as obrasMock } from '../data/obras'
import { leerStorage, guardarStorage } from '../utils/formato'

const STOCK_KEY = 'tienda-arte:stock'
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

export async function getObras() {
  await esperar(300) // simula la latencia de red
  const stockGuardado = leerStorage(STOCK_KEY, {})
  return obrasMock.map((obra) => ({
    ...obra,
    stock: stockGuardado[obra._id] ?? obra.stock,
  }))
}

// Valida stock y lo descuenta. En el back real esto lo hace el servidor
// (el front nunca es la fuente de verdad del stock).
export async function confirmarCompra(items, obrasActuales) {
  await esperar(600)
  const sinStock = items.filter((item) => {
    const obra = obrasActuales.find((o) => o._id === item._id)
    return !obra || obra.stock < item.cantidad
  })
  if (sinStock.length > 0) {
    return { ok: false, sinStock: sinStock.map((i) => i.title) }
  }

  const stockGuardado = leerStorage(STOCK_KEY, {})
  const obrasNuevas = obrasActuales.map((obra) => {
    const item = items.find((i) => i._id === obra._id)
    if (!item) return obra
    const stock = obra.stock - item.cantidad
    stockGuardado[obra._id] = stock
    return { ...obra, stock }
  })
  guardarStorage(STOCK_KEY, stockGuardado)

  return { ok: true, orden: `ORD-${Date.now().toString().slice(-6)}`, obras: obrasNuevas }
}

// Solo para desarrollo: vuelve el stock al de los datos ficticios.
export function resetearStock() {
  guardarStorage(STOCK_KEY, {})
}
