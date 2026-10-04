import { formatearPrecio } from '../utils/formato'
import { ACCIONES, ESTADOS, formatearFecha } from './textos'

// acciones: si viene onCambiarEstado se muestran los botones (panel); si no, solo lectura (mis pedidos).
export default function PedidoCard({ pedido, onCambiarEstado, ocupado = false, verComprador = true }) {
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
