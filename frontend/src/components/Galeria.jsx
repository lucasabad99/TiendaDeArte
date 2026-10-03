import { useState } from 'react'
import { useCarrito } from '../context/CartContext'
import ObraCard from './ObraCard'

export default function Galeria() {
  const { obras, cargando } = useCarrito()
  const [categoria, setCategoria] = useState('Todas')

  const categorias = ['Todas', ...new Set(obras.map((o) => o.category))]
  const visibles = categoria === 'Todas' ? obras : obras.filter((o) => o.category === categoria)

  return (
    <section id="obras" className="seccion">
      <div className="contenedor">
        <div className="seccion__encabezado">
          <h2>Obras</h2>
          <div className="filtros" role="group" aria-label="Filtrar por técnica">
            {categorias.map((c) => (
              <button
                key={c}
                className={`chip ${c === categoria ? 'chip--activo' : ''}`}
                aria-pressed={c === categoria}
                onClick={() => setCategoria(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div className="grilla">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card card--esqueleto" />
            ))}
          </div>
        ) : (
          <div className="grilla">
            {visibles.map((obra) => (
              <ObraCard key={obra._id} obra={obra} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
