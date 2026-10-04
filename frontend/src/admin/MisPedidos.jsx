import { getMisPedidos } from '../services/adminService'
import { useDatos } from './useDatos'
import PedidoCard from './PedidoCard'

export default function MisPedidos() {
  const { datos: pedidos, cargando, error } = useDatos(getMisPedidos)

  return (
    <section>
      <div className="admin__encabezado">
        <h1>Mis pedidos</h1>
      </div>

      {cargando ? (
        <p className="texto-suave">Cargando…</p>
      ) : error ? (
        <p className="aviso aviso--error">{error}</p>
      ) : pedidos.length === 0 ? (
        <p className="admin__vacio">
          Todavía no hiciste pedidos con esta cuenta. <a href="/#obras">Ver obras</a>
        </p>
      ) : (
        <div className="admin__lista">
          {pedidos.map((p) => <PedidoCard key={p._id} pedido={p} verComprador={false} />)}
        </div>
      )}
    </section>
  )
}
