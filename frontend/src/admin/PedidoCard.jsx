import { formatearPrecio } from '../utils/formato'
import { ACCIONES, ESTADOS, MP_ESTADOS, formatearFecha } from './textos'

// acciones: si viene onCambiarEstado se muestran los botones (panel); si no, solo lectura (mis pedidos).
export default function PedidoCard({ pedido, onCambiarEstado, onConsultarPago, ocupado = false, verComprador = true }) {
  const { code, createdAt, status, comprador, items, total } = pedido
  const acciones = onCambiarEstado ? ACCIONES[status] : []

  return (
    <article className="pedido">
      <header className="pedido__cabecera">
        <div>
          <strong className="pedido__codigo">{code}</strong>
          <span className="texto-suave"> · {formatearFecha(createdAt)}</span>
        </div>
        <span className={`estado estado--${status}`}>{ESTADOS[status]}</span>
      </header>

      {verComprador && (
        <p className="pedido__comprador">
          {comprador.nombre} · <a href={`mailto:${comprador.email}`}>{comprador.email}</a>
          {comprador.telefono && <> · <a href={`tel:${comprador.telefono}`}>{comprador.telefono}</a></>}
        </p>
      )}
      {verComprador && comprador.nota && <p className="pedido__nota">“{comprador.nota}”</p>}
      {verComprador && pedido.alerta && <p className="aviso aviso--error">⚠ {pedido.alerta}</p>}
      {verComprador && (pedido.mpPaymentId || pedido.mpStatus) && (
        <p className="pedido__pago texto-suave">
          Mercado Pago: {pedido.mpPaymentId ? <>pago #{pedido.mpPaymentId} aprobado</> : <>último intento {MP_ESTADOS[pedido.mpStatus] ?? pedido.mpStatus}</>}
        </p>
      )}
      {pedido.status === 'pendiente' && pedido.expiraEn && (
        <p className="pedido__pago texto-suave">Reservado hasta {formatearFecha(pedido.expiraEn)}; si no se paga, se cancela solo.</p>
      )}

      <ul className="pedido__items">
        {items.map((i) => (
          <li key={i.product}>
            <span>{i.cantidad} × {i.title}</span>
            <span>{formatearPrecio(i.price * i.cantidad)}</span>
          </li>
        ))}
        <li className="pedido__total">
          <span>Total</span>
          <span>{formatearPrecio(total)}</span>
        </li>
      </ul>

      {acciones.length > 0 && (
        <div className="pedido__acciones">
          {onConsultarPago && status === 'pendiente' && pedido.mpPreferenceId && (
            <button className="btn-texto" onClick={() => onConsultarPago(pedido)} disabled={ocupado}>Consultar pago en Mercado Pago</button>
          )}
          {acciones.map(({ a, texto }) => (
            <button key={a} className={`btn ${a === 'cancelada' ? 'btn--secundario' : 'btn--primario'} btn--chico`}
              onClick={() => onCambiarEstado(pedido, a)} disabled={ocupado}>
              {texto}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
