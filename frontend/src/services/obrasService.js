// Capa de datos de las obras.
//   getObras()        -> GET {API}/products  (real, desde el backend)
//   confirmarCompra() -> SIMULADA por ahora. Próximo paso: POST {API}/carts/:cid/purchase,
//                        donde el servidor valida y descuenta el stock (el front nunca es la fuente de verdad).

const API_URL = import.meta.env.VITE_API_URL
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

export async function getObras() {
  const respuesta = await fetch(`${API_URL}/products`)
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(cuerpo.message || `Error ${respuesta.status}`)
  return cuerpo.data
}

// Simulación: valida contra el stock que se ve en pantalla y lo descuenta solo en memoria.
// Al recargar la página vuelve el stock real del backend.
export async function confirmarCompra(items, obrasActuales) {
  await esperar(600)
  const sinStock = items.filter((item) => {
    const obra = obrasActuales.find((o) => o._id === item._id)
    return !obra || obra.stock < item.cantidad
  })
  if (sinStock.length > 0) {
    return { ok: false, sinStock: sinStock.map((i) => i.title) }
  }

  const obrasNuevas = obrasActuales.map((obra) => {
    const item = items.find((i) => i._id === obra._id)
    return item ? { ...obra, stock: obra.stock - item.cantidad } : obra
  })

  return { ok: true, orden: `ORD-${Date.now().toString().slice(-6)}`, obras: obrasNuevas }
}
