import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { actualizarObra, crearObra, eliminarObra, getTodasLasObras } from '../services/adminService'
import { formatearPrecio } from '../utils/formato'
import { useDatos } from './useDatos'
import ObraForm from './ObraForm'

export default function Obras() {
  const { puede, manejarError } = useAuth()
  const { datos: obras, cargando, error, setDatos } = useDatos(getTodasLasObras)
  const [editando, setEditando] = useState(null) // null | 'nueva' | obra
  const [ocupado, setOcupado] = useState(null)
  const [aviso, setAviso] = useState(null)

  const puedePrecio = puede('products:price')
  const puedeBorrar = puede('products:delete')
  const categorias = [...new Set((obras ?? []).map((o) => o.category))]

  // Errores de guardado los muestra el formulario; si es 401, manejarError vuelve al login
  async function guardar(cuerpo) {
    try {
      if (editando === 'nueva') {
        const nueva = await crearObra(cuerpo)
        setDatos((lista) => [nueva, ...lista])
        setAviso({ tipo: 'ok', texto: `"${nueva.title}" creada${nueva.status ? ' y publicada' : ' como borrador'}.` })
      } else {
        const editada = await actualizarObra(editando._id, cuerpo)
        setDatos((lista) => lista.map((o) => (o._id === editada._id ? editada : o)))
        setAviso({ tipo: 'ok', texto: `"${editada.title}" guardada.` })
      }
      setEditando(null)
    } catch (err) {
      manejarError(err)
      throw err
    }
  }

  async function accion(obra, fn, textoOk) {
    setOcupado(obra._id)
    setAviso(null)
    try {
      await fn()
      setAviso({ tipo: 'ok', texto: textoOk })
    } catch (err) {
      setAviso({ tipo: 'error', texto: manejarError(err) })
    } finally {
      setOcupado(null)
    }
  }

  const alternarPublicada = (obra) =>
    accion(obra, async () => {
      const editada = await actualizarObra(obra._id, { status: !obra.status })
      setDatos((lista) => lista.map((o) => (o._id === editada._id ? editada : o)))
    }, `"${obra.title}" ${obra.status ? 'oculta de la tienda' : 'publicada'}.`)

  const borrar = (obra) => {
    if (!window.confirm(`¿Borrar "${obra.title}"? No se puede deshacer. Los pedidos que ya la incluyen no cambian.`)) return
    accion(obra, async () => {
      await eliminarObra(obra._id)
      setDatos((lista) => lista.filter((o) => o._id !== obra._id))
    }, `"${obra.title}" borrada.`)
  }

  if (editando) {
    return (
      <section>
        <ObraForm obra={editando === 'nueva' ? null : editando} categorias={categorias} puedePrecio={puedePrecio}
          onGuardar={guardar} onCancelar={() => setEditando(null)} />
      </section>
    )
  }

  return (
    <section>
      <div className="admin__encabezado">
        <h1>Obras</h1>
        <button className="btn btn--primario" onClick={() => { setAviso(null); setEditando('nueva') }}>+ Nueva obra</button>
      </div>

      {!puedePrecio && (
        <p className="aviso aviso--info">
          Las obras que cargues quedan como borrador hasta que alguien con permiso les ponga precio y las publique.
        </p>
      )}
      {aviso && <p className={`aviso aviso--${aviso.tipo}`} role="status">{aviso.texto}</p>}

      {cargando ? (
        <p className="texto-suave">Cargando obras…</p>
      ) : error ? (
        <p className="aviso aviso--error">{error}</p>
      ) : obras.length === 0 ? (
        <p className="admin__vacio">Todavía no hay obras. Creá la primera con “+ Nueva obra”.</p>
      ) : (
        <ul className="admin__lista obras-lista">
          {obras.map((o) => (
            <li key={o._id} className={`obra-fila ${o.status ? '' : 'obra-fila--borrador'}`}>
              {o.thumbnails[0] ? (
                <img src={o.thumbnails[0]} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
              ) : (
                <div className="obra-fila__sin-imagen" />
              )}
              <div className="obra-fila__info">
                <p className="obra-fila__titulo">{o.title}</p>
                <p className="texto-suave">
                  {o.category} · {o.tipo === 'edicion' ? 'Edición' : 'Original'}
                  {puedePrecio && <> · {formatearPrecio(o.price)} · stock {o.stock}</>}
                </p>
              </div>
              <span className={`estado ${o.status ? 'estado--pagada' : 'estado--pendiente'}`}>{o.status ? 'Publicada' : 'Borrador'}</span>
              <div className="obra-fila__acciones">
                <button className="btn-texto" onClick={() => { setAviso(null); setEditando(o) }} disabled={ocupado === o._id}>Editar</button>
                {puedePrecio && (
                  <button className="btn-texto" onClick={() => alternarPublicada(o)} disabled={ocupado === o._id}>
                    {o.status ? 'Ocultar' : 'Publicar'}
                  </button>
                )}
                {puedeBorrar && <button className="btn-texto btn-texto--peligro" onClick={() => borrar(o)} disabled={ocupado === o._id}>Borrar</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
