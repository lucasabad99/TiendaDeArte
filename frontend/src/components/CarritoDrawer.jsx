import { useEffect, useState } from 'react'
import { useCarrito } from '../context/CartContext'
import { formatearPrecio } from '../utils/formato'
import CheckoutForm from './CheckoutForm'

const TITULOS = { carrito: 'Tu carrito', checkout: 'Tus datos', ok: '¡Gracias!' }

export default function CarritoDrawer() {
  const { items, total, totalUnidades, abierto, cerrarCarrito, cambiarCantidad, quitar, vaciar, disponible, finalizarCompra } = useCarrito()
  const [vista, setVista] = useState('carrito') // carrito | checkout | ok
  const [pedido, setPedido] = useState(null) // { orden, email } de la compra confirmada
  const [sinStock, setSinStock] = useState(null) // títulos que ya no tenían stock al confirmar

  // Si el carrito se vacía (otra pestaña, ajuste de stock) mientras completa los datos, volvemos
  const vistaActual = vista === 'checkout' && items.length === 0 ? 'carrito' : vista

  // Al cerrar después de una compra, la próxima vez abre en el carrito
  const cerrar = () => {
    cerrarCarrito()
    if (vista === 'ok') setVista('carrito')
    setSinStock(null)
  }

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e) => {
      if (e.key !== 'Escape') return
      cerrarCarrito()
      setVista((v) => (v === 'ok' ? 'carrito' : v))
      setSinStock(null)
    }
    document.addEventListener('keydown', alPresionar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPresionar)
      document.body.style.overflow = ''
    }
  }, [abierto, cerrarCarrito])

  async function confirmar(comprador) {
    const r = await finalizarCompra(comprador) // si falla la red, lanza y CheckoutForm muestra el error
    if (r.ok) {
      setPedido({ orden: r.orden, email: comprador.email })
      setVista('ok')
    } else {
      setSinStock(r.sinStock)
      setVista('carrito')
    }
  }

  return (
    <>
      <div className={`overlay ${abierto ? 'overlay--visible' : ''}`} onClick={cerrar} />
      <aside className={`drawer ${abierto ? 'drawer--abierto' : ''}`} aria-hidden={!abierto} aria-label="Carrito de compras">
        <div className="drawer__cabecera">
          <h2>{TITULOS[vistaActual]}</h2>
          <button className="btn-icono" onClick={cerrar} aria-label="Cerrar carrito">✕</button>
        </div>

        {vistaActual === 'ok' ? (
          <div className="drawer__vacio">
            <p className="drawer__exito">¡Pedido recibido!</p>
            <p>Número de pedido: <strong>{pedido.orden}</strong></p>
            <p className="texto-suave">
              Te mandamos el detalle a <strong>{pedido.email}</strong>. Te escribimos a la brevedad para coordinar el pago y el envío.
            </p>
            <button className="btn btn--primario" onClick={cerrar}>Seguir mirando</button>
          </div>
        ) : vistaActual === 'checkout' ? (
          <CheckoutForm total={total} unidades={totalUnidades} onConfirmar={confirmar} onVolver={() => setVista('carrito')} />
        ) : items.length === 0 ? (
          <div className="drawer__vacio">
            {sinStock?.length > 0 && (
              <p className="aviso aviso--error">Lo sentimos: {sinStock.join(', ')} ya no {sinStock.length === 1 ? 'está disponible' : 'están disponibles'}.</p>
            )}
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
              {sinStock?.length > 0 && (
                <p className="aviso aviso--error">
                  Sin stock suficiente: {sinStock.join(', ')}. Ajustamos tu carrito a lo disponible, revisalo y volvé a confirmar.
                </p>
              )}
              <div className="drawer__total">
                <span>Total</span>
                <strong>{formatearPrecio(total)}</strong>
              </div>
              <button className="btn btn--primario btn--bloque" onClick={() => { setSinStock(null); setVista('checkout') }}>
                Finalizar compra
              </button>
              <button className="btn-texto" onClick={vaciar}>Vaciar carrito</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
