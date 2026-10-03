import { useEffect, useState } from 'react'
import { useCarrito } from '../context/CartContext'
import { formatearPrecio } from '../utils/formato'

export default function CarritoDrawer() {
  const { items, total, abierto, cerrarCarrito, cambiarCantidad, quitar, vaciar, disponible, finalizarCompra } = useCarrito()
  const [estado, setEstado] = useState({ tipo: 'idle' }) // idle | procesando | ok | error

  // Al cerrar, limpiamos el mensaje de éxito/error (salvo que haya una compra en curso)
  const cerrar = () => {
    cerrarCarrito()
    setEstado((e) => (e.tipo === 'procesando' ? e : { tipo: 'idle' }))
  }

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e) => {
      if (e.key !== 'Escape') return
      cerrarCarrito()
      setEstado((s) => (s.tipo === 'procesando' ? s : { tipo: 'idle' }))
    }
    document.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
    }
  }, [abierto, cerrarCarrito])

  async function comprar() {
    setEstado({ tipo: 'procesando' })
    const r = await finalizarCompra()
    setEstado(r.ok ? { tipo: 'ok', orden: r.orden } : { tipo: 'error', sinStock: r.sinStock })
  }

  return (
    <>
      <div className={`overlay ${abierto ? 'overlay--visible' : ''}`} onClick={cerrar} />
      <aside className={`drawer ${abierto ? 'drawer--abierto' : ''}`} aria-hidden={!abierto} aria-label="Carrito de compras">
        <div className="drawer__cabecera">
          <h2>Tu carrito</h2>
          <button className="btn-icono" onClick={cerrar} aria-label="Cerrar carrito">✕</button>
        </div>

        {estado.tipo === 'ok' ? (
          <div className="drawer__vacio">
            <p className="drawer__exito">¡Compra confirmada!</p>
            <p>Número de orden: <strong>{estado.orden}</strong></p>
            <p className="texto-suave">(Simulación: todavía no hay pago real. Acá va Mercado Pago.)</p>
            <button className="btn btn--primario" onClick={cerrar}>Seguir mirando</button>
          </div>
        ) : items.length === 0 ? (
          <div className="drawer__vacio">
            <p>Tu carrito está vacío.</p>
            <a href="#obras" className="btn btn--secundario" onClick={cerrar}>Ver obras</a>
          </div>
        ) : (
          <>
            <ul className="drawer__lista">
              {items.map((item) => {
                const puedeSumar = disponible(item._id) > 0
                return (
                  <li key={item._id} className="item">
                    <img src={item.thumbnail} alt="" />
                    <div className="item__info">
                      <p className="item__titulo">{item.title}</p>
                      <p className="item__precio">{formatearPrecio(item.price)}</p>
                      <div className="cantidad">
                        <button onClick={() => cambiarCantidad(item._id, item.cantidad - 1)} aria-label={`Restar una unidad de ${item.title}`}>−</button>
                        <span aria-live="polite">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item._id, item.cantidad + 1)} disabled={!puedeSumar}
                          aria-label={`Sumar una unidad de ${item.title}`}>+</button>
                      </div>
                      {!puedeSumar && <p className="item__limite">Máximo disponible</p>}
                    </div>
                    <button className="btn-texto" onClick={() => quitar(item._id)}>Quitar</button>
                  </li>
                )
              })}
            </ul>

            <div className="drawer__pie">
              {estado.tipo === 'error' && (
                <p className="aviso aviso--error">
                  Sin stock suficiente: {estado.sinStock.join(', ')}. Ajustá tu carrito.
                </p>
              )}
              <div className="drawer__total">
                <span>Total</span>
                <strong>{formatearPrecio(total)}</strong>
              </div>
              <button className="btn btn--primario btn--bloque" onClick={comprar} disabled={estado.tipo === 'procesando'}>
                {estado.tipo === 'procesando' ? 'Procesando…' : 'Finalizar compra'}
              </button>
              <button className="btn-texto" onClick={vaciar}>Vaciar carrito</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
