import { useState } from 'react'
import { formatearPrecio } from '../utils/formato'
import { validarPersona } from '../utils/validacion'

const INICIAL = { nombre: '', email: '', telefono: '', nota: '' }

// Datos del comprador dentro del carrito. onConfirmar(comprador) hace el pedido:
// si sale bien o falta stock, el carrito cambia de pantalla; si falla la red, lanza y mostramos el error.
export default function CheckoutForm({ total, unidades, onConfirmar, onVolver }) {
  const [datos, setDatos] = useState(INICIAL)
  const [tocados, setTocados] = useState({})
  const [estado, setEstado] = useState('idle') // idle | procesando | error

  const errores = validarPersona(datos)
  if (datos.nota.length > 1000) errores.nota = 'Máximo 1000 caracteres.'
  const mostrarError = (campo) => tocados[campo] && errores[campo]
  const procesando = estado === 'procesando'

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value })
  const tocar = (e) => setTocados({ ...tocados, [e.target.name]: true })

  async function enviar(e) {
    e.preventDefault()
    setTocados({ nombre: true, email: true, telefono: true, nota: true })
    if (Object.keys(errores).length > 0) return

    setEstado('procesando')
    try {
      await onConfirmar({
        nombre: datos.nombre.trim(),
        email: datos.email.trim(),
        telefono: datos.telefono.trim(),
        nota: datos.nota.trim(),
      })
    } catch {
      setEstado('error')
    }
  }

  return (
    <form className="checkout" onSubmit={enviar} noValidate>
      <div className="checkout__cuerpo">
        <p className="checkout__resumen">
          {unidades} {unidades === 1 ? 'obra' : 'obras'} · Total <strong>{formatearPrecio(total)}</strong>
        </p>

        <div className="campo">
          <label htmlFor="co-nombre">Nombre y apellido *</label>
          <input id="co-nombre" name="nombre" value={datos.nombre} onChange={cambiar} onBlur={tocar}
            aria-invalid={!!mostrarError('nombre')} autoComplete="name" />
          {mostrarError('nombre') && <span className="campo__error">{errores.nombre}</span>}
        </div>

        <div className="campo">
          <label htmlFor="co-email">Email *</label>
          <input id="co-email" name="email" type="email" value={datos.email} onChange={cambiar} onBlur={tocar}
            aria-invalid={!!mostrarError('email')} autoComplete="email" />
          {mostrarError('email') && <span className="campo__error">{errores.email}</span>}
        </div>

        <div className="campo">
          <label htmlFor="co-telefono">Teléfono</label>
          <input id="co-telefono" name="telefono" type="tel" value={datos.telefono} onChange={cambiar} onBlur={tocar}
            aria-invalid={!!mostrarError('telefono')} autoComplete="tel" />
          {mostrarError('telefono') && <span className="campo__error">{errores.telefono}</span>}
        </div>

        <div className="campo">
          <label htmlFor="co-nota">Nota (opcional)</label>
          <textarea id="co-nota" name="nota" rows="3" value={datos.nota} onChange={cambiar} onBlur={tocar}
            placeholder="Ej.: zona para el envío, si es un regalo…" aria-invalid={!!mostrarError('nota')} />
          {mostrarError('nota') && <span className="campo__error">{errores.nota}</span>}
        </div>

        <p className="texto-suave">
          Al confirmar reservamos las obras a tu nombre y seguís con el pago.
        </p>
      </div>

      <div className="drawer__pie">
        {estado === 'error' && (
          <p className="aviso aviso--error" role="alert">No pudimos procesar el pedido. Probá de nuevo en un rato.</p>
        )}
        <button type="submit" className="btn btn--primario btn--bloque" disabled={procesando}>
          {procesando ? 'Procesando…' : 'Confirmar pedido'}
        </button>
        <button type="button" className="btn-texto" onClick={onVolver} disabled={procesando}>Volver al carrito</button>
      </div>
    </form>
  )
}
