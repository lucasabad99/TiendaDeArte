import { useState } from 'react'
import { enviarConsulta } from '../services/contactoService'
import { validarPersona } from '../utils/validacion'

const INICIAL = { nombre: '', email: '', telefono: '', motivo: 'consulta', mensaje: '', website: '' }

function validar(datos) {
  const errores = validarPersona(datos)
  if (datos.mensaje.trim().length < 10) errores.mensaje = 'Contame un poco más (mínimo 10 caracteres).'
  return errores
}

export default function Contacto() {
  const [datos, setDatos] = useState(INICIAL)
  const [tocados, setTocados] = useState({})
  const [estado, setEstado] = useState('idle') // idle | enviando | ok | error

  const errores = validar(datos)
  const mostrarError = (campo) => tocados[campo] && errores[campo]

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value })
  const tocar = (e) => setTocados({ ...tocados, [e.target.name]: true })

  async function enviar(e) {
    e.preventDefault()
    setTocados({ nombre: true, email: true, telefono: true, mensaje: true })
    if (Object.keys(errores).length > 0) return
    if (datos.website) return // honeypot: si un bot completó el campo oculto, lo ignoramos

    setEstado('enviando')
    try {
      const { website: _honeypot, ...payload } = datos
      await enviarConsulta(payload)
      setEstado('ok')
      setDatos(INICIAL)
      setTocados({})
    } catch {
      setEstado('error')
    }
  }

  return (
    <section id="contacto" className="seccion">
      <div className="contenedor contacto">
        <div>
          <p className="eyebrow">Contacto</p>
          <h2>¿Te interesa una obra o un encargo?</h2>
          <p>Escribime y te respondo a la brevedad. También coordinamos envíos y formas de pago.</p>
        </div>

        <form className="formulario" onSubmit={enviar} noValidate>
          <div className="campo">
            <label htmlFor="nombre">Nombre *</label>
            <input id="nombre" name="nombre" value={datos.nombre} onChange={cambiar} onBlur={tocar}
              aria-invalid={!!mostrarError('nombre')} autoComplete="name" />
            {mostrarError('nombre') && <span className="campo__error">{errores.nombre}</span>}
          </div>

          <div className="fila">
            <div className="campo">
              <label htmlFor="email">Email *</label>
              <input id="email" name="email" type="email" value={datos.email} onChange={cambiar} onBlur={tocar}
                aria-invalid={!!mostrarError('email')} autoComplete="email" />
              {mostrarError('email') && <span className="campo__error">{errores.email}</span>}
            </div>
            <div className="campo">
              <label htmlFor="telefono">Teléfono</label>
              <input id="telefono" name="telefono" type="tel" value={datos.telefono} onChange={cambiar} onBlur={tocar}
                aria-invalid={!!mostrarError('telefono')} autoComplete="tel" />
              {mostrarError('telefono') && <span className="campo__error">{errores.telefono}</span>}
            </div>
          </div>

          <div className="campo">
            <label htmlFor="motivo">Motivo</label>
            <select id="motivo" name="motivo" value={datos.motivo} onChange={cambiar}>
              <option value="consulta">Consulta por una obra</option>
              <option value="encargo">Encargo personalizado</option>
              <option value="envio">Envíos y pagos</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="mensaje">Mensaje *</label>
            <textarea id="mensaje" name="mensaje" rows="5" value={datos.mensaje} onChange={cambiar} onBlur={tocar}
              aria-invalid={!!mostrarError('mensaje')} />
            {mostrarError('mensaje') && <span className="campo__error">{errores.mensaje}</span>}
          </div>

          {/* Honeypot anti-spam: invisible para personas */}
          <input className="oculto" name="website" value={datos.website} onChange={cambiar} tabIndex="-1" autoComplete="off" aria-hidden="true" />

          <button type="submit" className="btn btn--primario" disabled={estado === 'enviando'}>
            {estado === 'enviando' ? 'Enviando…' : 'Enviar mensaje'}
          </button>

          <div aria-live="polite">
            {estado === 'ok' && <p className="aviso aviso--ok">¡Gracias! Recibí tu mensaje y te respondo pronto.</p>}
            {estado === 'error' && <p className="aviso aviso--error">No se pudo enviar. Probá de nuevo en un rato.</p>}
          </div>
        </form>
      </div>
    </section>
  )
}
