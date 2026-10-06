import { useState } from 'react'
import FotosObra from './FotosObra'

const VACIA = { title: '', category: '', tipo: 'original', description: '', fotos: [], price: '', stock: '1', status: false }

function desdeObra(obra) {
  if (!obra) return VACIA
  return {
    title: obra.title,
    category: obra.category,
    tipo: obra.tipo,
    description: obra.description,
    fotos: obra.thumbnails,
    price: String(obra.price),
    stock: String(obra.stock),
    status: obra.status,
  }
}

function validar(d, puedePrecio) {
  const errores = {}
  if (!d.title.trim()) errores.title = 'Poné un título.'
  if (!d.category.trim()) errores.category = 'Poné una categoría (ej. Pintura).'
  if (puedePrecio) {
    if (!/^\d+$/.test(d.price)) errores.price = 'Precio en pesos, sin puntos ni decimales.'
    if (!/^\d+$/.test(d.stock)) errores.stock = 'Cantidad entera (0 = vendida).'
  }
  return errores
}

// obra: null para crear. Sin products:price no se muestran ni se mandan precio, stock ni publicación
// (el back igual los rechazaría).
export default function ObraForm({ obra, categorias, puedePrecio, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState(() => desdeObra(obra))
  const [intento, setIntento] = useState(false)
  const [estado, setEstado] = useState({ tipo: 'idle' })
  const [subiendoFotos, setSubiendoFotos] = useState(false)

  const errores = validar(datos, puedePrecio)
  const error = (campo) => intento && errores[campo]
  const cambiar = (e) => {
    const { name, type, checked, value } = e.target
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
  }

  async function enviar(e) {
    e.preventDefault()
    setIntento(true)
    if (Object.keys(errores).length > 0 || subiendoFotos) return

    const cuerpo = {
      title: datos.title.trim(),
      category: datos.category.trim(),
      tipo: datos.tipo,
      description: datos.description.trim(),
      thumbnails: datos.fotos,
    }
    if (puedePrecio) Object.assign(cuerpo, { price: Number(datos.price), stock: Number(datos.stock), status: datos.status })

    setEstado({ tipo: 'guardando' })
    try {
      await onGuardar(cuerpo)
    } catch (err) {
      setEstado({ tipo: 'error', mensaje: err.message })
    }
  }

  return (
    <form className="formulario obra-form" onSubmit={enviar} noValidate>
      <h2>{obra ? 'Editar obra' : 'Nueva obra'}</h2>

      <div className="obra-form__grid">
        <div className="obra-form__campos">
          <div className="campo">
            <label htmlFor="of-title">Título *</label>
            <input id="of-title" name="title" value={datos.title} onChange={cambiar} aria-invalid={!!error('title')} />
            {error('title') && <span className="campo__error">{errores.title}</span>}
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="of-category">Categoría *</label>
              <input id="of-category" name="category" list="of-categorias" value={datos.category} onChange={cambiar} aria-invalid={!!error('category')} />
              <datalist id="of-categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
              {error('category') && <span className="campo__error">{errores.category}</span>}
            </div>
            <div className="campo">
              <label htmlFor="of-tipo">Tipo</label>
              <select id="of-tipo" name="tipo" value={datos.tipo} onChange={cambiar}>
                <option value="original">Original (pieza única)</option>
                <option value="edicion">Edición (láminas / copias)</option>
              </select>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="of-description">Descripción</label>
            <textarea id="of-description" name="description" rows="2" value={datos.description} onChange={cambiar}
              placeholder="Técnica · medidas · año. Ej.: Óleo sobre tela · 80 × 100 cm · 2025" />
          </div>

          <FotosObra fotos={datos.fotos} onChange={(fotos) => setDatos((d) => ({ ...d, fotos }))} onSubiendo={setSubiendoFotos} />

          {puedePrecio ? (
            <>
              <div className="fila">
                <div className="campo">
                  <label htmlFor="of-price">Precio (ARS) *</label>
                  <input id="of-price" name="price" inputMode="numeric" value={datos.price} onChange={cambiar} aria-invalid={!!error('price')} />
                  {error('price') && <span className="campo__error">{errores.price}</span>}
                </div>
                <div className="campo">
                  <label htmlFor="of-stock">Stock *</label>
                  <input id="of-stock" name="stock" inputMode="numeric" value={datos.stock} onChange={cambiar} aria-invalid={!!error('stock')} />
                  {error('stock') && <span className="campo__error">{errores.stock}</span>}
                </div>
              </div>
              <label className="check">
                <input type="checkbox" name="status" checked={datos.status} onChange={cambiar} />
                Publicada (visible en la tienda)
              </label>
            </>
          ) : (
            <p className="aviso aviso--info">
              {obra ? 'Podés corregir los textos y las fotos.' : 'La obra se guarda como borrador.'} El precio, el stock y la
              publicación los define quien administra la tienda.
            </p>
          )}
        </div>
      </div>

      {estado.tipo === 'error' && <p className="aviso aviso--error" role="alert">{estado.mensaje}</p>}

      <div className="obra-form__acciones">
        <button type="submit" className="btn btn--primario" disabled={estado.tipo === 'guardando' || subiendoFotos}>
          {estado.tipo === 'guardando' ? 'Guardando…' : subiendoFotos ? 'Esperá, subiendo fotos…' : 'Guardar'}
        </button>
        <button type="button" className="btn btn--secundario" onClick={onCancelar} disabled={estado.tipo === 'guardando'}>Cancelar</button>
      </div>
    </form>
  )
}
