import { useCarrito } from '../context/CartContext'
import { formatearPrecio } from '../utils/formato'

// "tipo" viene del back: original = pieza única, edicion = láminas / copias numeradas.
function etiquetaStock(obra) {
  const esEdicion = obra.tipo === 'edicion'
  if (obra.stock === 0) return { texto: 'Vendida', clase: 'tag--agotada' }
  if (!esEdicion) return { texto: 'Pieza única', clase: 'tag--unica' }
  if (obra.stock === 1) return { texto: 'Última disponible', clase: 'tag--unica' }
  return { texto: `${obra.stock} disponibles`, clase: 'tag--stock' }
}

export default function ObraCard({ obra }) {
  const { agregar, disponible, cantidadEnCarrito, abrirCarrito } = useCarrito()
  const restante = disponible(obra._id)
  const enCarrito = cantidadEnCarrito(obra._id)
  const agotada = obra.stock === 0
  const tag = etiquetaStock(obra)

  let textoBoton = 'Agregar al carrito'
  if (agotada) textoBoton = 'Vendida'
  else if (restante === 0) textoBoton = 'Ver en el carrito'

  const alClickear = () => (restante === 0 ? abrirCarrito() : agregar(obra))

  return (
    <article className={`card ${agotada ? 'card--agotada' : ''}`}>
      <div className="card__imagen">
        <img src={obra.thumbnails[0]} alt={obra.title} loading="lazy" />
        <span className={`tag ${tag.clase}`}>{tag.texto}</span>
      </div>
      <div className="card__cuerpo">
        <p className="card__categoria">{obra.category}</p>
        <h3 className="card__titulo">{obra.title}</h3>
        <p className="card__descripcion">{obra.description}</p>
        <div className="card__pie">
          <span className="card__precio">{formatearPrecio(obra.price)}</span>
          {enCarrito > 0 && obra.stock > 1 && (
            <span className="card__en-carrito">{enCarrito} en carrito</span>
          )}
        </div>
        <button
          className={`btn btn--bloque ${restante === 0 && !agotada ? 'btn--secundario' : 'btn--primario'}`}
          onClick={alClickear}
          disabled={agotada}
        >
          {textoBoton}
        </button>
      </div>
    </article>
  )
}
