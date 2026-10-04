import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { cambiarEstadoPedido, consultarPagoPedido, getPedidos } from '../services/adminService'
import { useDatos } from './useDatos'
import { ESTADOS } from './textos'
import PedidoCard from './PedidoCard'

const FILTROS = ['', 'pendiente', 'pagada', 'enviada', 'entregada', 'cancelada']

export default function Pedidos() {
  const { puede, manejarError } = useAuth()
  const [filtro, setFiltro] = useState('pendiente')
  const [ocupado, setOcupado] = useState(null) // id del pedido que se está actualizando
  const [aviso, setAviso] = useState(null)

  const cargar = useCallback(() => getPedidos(filtro), [filtro])
  const { datos: pedidos, cargando, error, recargar } = useDatos(cargar)

  async function cambiarEstado(pedido, nuevo) {
    if (nuevo === 'cancelada' && !window.confirm(`¿Cancelar el pedido ${pedido.code}? Las obras vuelven a estar disponibles en la tienda.`)) return
    setOcupado(pedido._id)
    setAviso(null)
    try {
      await cambiarEstadoPedido(pedido._id, nuevo)
      setAviso({ tipo: 'ok', texto: `${pedido.code}: ${ESTADOS[nuevo].toLowerCase()}.` })
      await recargar() // con filtro, el pedido puede salir de la lista
    } catch (err) {
      setAviso({ tipo: 'error', texto: manejarError(err) })
    } finally {
      setOcupado(null)
    }
  }

  async function consultarPago(pedido) {
    setOcupado(pedido._id)
    setAviso(null)
    try {
      const actualizado = await consultarPagoPedido(pedido._id)
      setAviso(actualizado.status === 'pagada'
        ? { tipo: 'ok', texto: `${pedido.code}: Mercado Pago confirmó el pago. Quedó como pagada.` }
        : { tipo: 'info', texto: `${pedido.code}: todavía no hay un pago aprobado en Mercado Pago.` })
      await recargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: manejarError(err) })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section>
      <div className="admin__encabezado">
        <h1>Pedidos</h1>
        <div className="filtros" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button key={f || 'todos'} className={`chip ${f === filtro ? 'chip--activo' : ''}`} aria-pressed={f === filtro} onClick={() => setFiltro(f)}>
              {f ? ESTADOS[f] : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {aviso && <p className={`aviso aviso--${aviso.tipo}`} role="status">{aviso.texto}</p>}

      {cargando && !pedidos ? (
        <p className="texto-suave">Cargando pedidos…</p>
      ) : error ? (
        <p className="aviso aviso--error">{error}</p>
      ) : pedidos.length === 0 ? (
        <p className="admin__vacio">No hay pedidos {filtro ? `en estado "${ESTADOS[filtro].toLowerCase()}"` : 'todavía'}.</p>
      ) : (
        <div className="admin__lista">
          {pedidos.map((p) => (
            <PedidoCard key={p._id} pedido={p} ocupado={ocupado === p._id}
              onCambiarEstado={puede('orders:update') ? cambiarEstado : undefined} onConsultarPago={consultarPago} />
          ))}
        </div>
      )}
    </section>
  )
}
