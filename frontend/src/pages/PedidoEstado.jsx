import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { confirmarPago } from '../services/pagosService'
import { formatearPrecio } from '../utils/formato'

// A esta página vuelve el comprador desde Mercado Pago: /pedido/ORD-XXXXXX?payment_id=...&status=...
// Lo que diga la URL es solo una pista: el estado real lo confirma el back consultando a MP.
export default function PedidoEstado() {
  const { code } = useParams()
  const [params] = useSearchParams()
  const paymentId = params.get('payment_id') || params.get('collection_id') || ''
  const [estado, setEstado] = useState({ cargando: true, pedido: null, error: null })

  const consultar = useCallback(
    () =>
      confirmarPago(code, paymentId)
        .then((pedido) => setEstado({ cargando: false, pedido, error: null }))
        .catch((err) => setEstado({ cargando: false, pedido: null, error: err.status === 404 ? 'No encontramos ese pedido.' : err.message })),
    [code, paymentId],
  )

  useEffect(() => {
    consultar()
  }, [consultar])

  // Pago en proceso (ej. revisión de MP): volvemos a preguntar cada 5 s durante un minuto
  const enProceso = estado.pedido?.status === 'pendiente' && ['in_process', 'pending', 'authorized'].includes(estado.pedido?.mpStatus)
  useEffect(() => {
    if (!enProceso) return
    let vueltas = 0
    const id = setInterval(() => {
      vueltas += 1
      if (vueltas > 12) clearInterval(id)
      else consultar()
    }, 5000)
    return () => clearInterval(id)
  }, [enProceso, consultar])

  return (
    <div className="admin-centro">
      <div className="formulario pedido-estado">
        <Link to="/" className="logo">Taller de Arte</Link>
        {estado.cargando ? (
          <p className="texto-suave">Consultando tu pago…</p>
        ) : estado.error ? (
          <>
            <h1>Algo salió mal</h1>
            <p className="aviso aviso--error">{estado.error}</p>
            <button className="btn btn--secundario" onClick={consultar}>Volver a consultar</button>
          </>
        ) : (
          <Resultado pedido={estado.pedido} enProceso={enProceso} onActualizar={consultar} />
        )}
        <Link to="/" className="btn-texto pedido-estado__volver">← Volver a la tienda</Link>
      </div>
    </div>
  )
}

function Resultado({ pedido, enProceso, onActualizar }) {
  const hora = pedido.expiraEn ? new Date(pedido.expiraEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null

  let titulo, texto, tono
  if (['pagada', 'enviada', 'entregada'].includes(pedido.status)) {
    titulo = '¡Pago aprobado!'
    texto = 'Te mandamos la confirmación por mail. Te escribimos a la brevedad para coordinar el envío.'
    tono = 'ok'
  } else if (pedido.status === 'cancelada') {
    titulo = 'Pedido cancelado'
    texto = 'El tiempo para pagar venció o el pedido se canceló, y las obras volvieron a la tienda. Si querés, podés hacer un pedido nuevo.'
    tono = 'error'
  } else if (enProceso) {
    titulo = 'Tu pago se está procesando'
    texto = 'Mercado Pago lo está revisando. Esta página se actualiza sola; también te avisamos por mail cuando se acredite.'
    tono = 'info'
  } else {
    titulo = pedido.mpStatus === 'rejected' ? 'El pago fue rechazado' : 'Todavía no recibimos el pago'
    texto = hora ? `Tus obras siguen reservadas hasta las ${hora}. Podés intentar de nuevo con otro medio de pago.` : 'Podés intentar de nuevo.'
    tono = 'error'
  }

  return (
    <>
      <h1>{titulo}</h1>
      <p className={`aviso aviso--${tono}`}>{texto}</p>

      <ul className="pedido__items">
        {pedido.items.map((i) => (
          <li key={i.title}><span>{i.cantidad} × {i.title}</span><span>{formatearPrecio(i.price * i.cantidad)}</span></li>
        ))}
        <li className="pedido__total"><span>Total</span><span>{formatearPrecio(pedido.total)}</span></li>
      </ul>
      <p className="texto-suave pedido-estado__codigo">Pedido <strong>{pedido.code}</strong></p>

      {pedido.pagoUrl && !enProceso && (
        <a href={pedido.pagoUrl} className="btn btn--primario btn--bloque">Pagar con Mercado Pago</a>
      )}
      {enProceso && <button className="btn btn--secundario" onClick={onActualizar}>Actualizar ahora</button>}
    </>
  )
}
