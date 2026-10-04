import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { EMAIL_RE } from '../utils/validacion'

export default function Login() {
  const { login, registrar } = useAuth()
  const [modo, setModo] = useState('ingresar') // ingresar | registrar
  const [datos, setDatos] = useState({ name: '', email: '', password: '' })
  const [estado, setEstado] = useState({ tipo: 'idle' }) // idle | enviando | error

  const registrando = modo === 'registrar'
  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value })

  function validar() {
    if (registrando && datos.name.trim().length < 2) return 'Ingresá tu nombre.'
    if (!EMAIL_RE.test(datos.email)) return 'Ingresá un email válido.'
    if (registrando && datos.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!datos.password) return 'Ingresá tu contraseña.'
    return null
  }

  async function enviar(e) {
    e.preventDefault()
    const error = validar()
    if (error) return setEstado({ tipo: 'error', mensaje: error })

    setEstado({ tipo: 'enviando' })
    try {
      if (registrando) await registrar(datos.name.trim(), datos.email.trim(), datos.password)
      else await login(datos.email.trim(), datos.password)
      // Al loguearse, el panel se muestra solo (AuthContext cambia y AdminApp re-renderiza)
    } catch (err) {
      setEstado({ tipo: 'error', mensaje: err.message })
    }
  }

  function cambiarModo() {
    setModo(registrando ? 'ingresar' : 'registrar')
    setEstado({ tipo: 'idle' })
  }

  return (
    <div className="admin-centro">
      <form className="formulario login" onSubmit={enviar} noValidate>
        <Link to="/" className="logo">Taller de Arte</Link>
        <h1 className="login__titulo">{registrando ? 'Crear cuenta' : 'Ingresar'}</h1>

        {registrando && (
          <div className="campo">
            <label htmlFor="lg-name">Nombre</label>
            <input id="lg-name" name="name" value={datos.name} onChange={cambiar} autoComplete="name" />
          </div>
        )}
        <div className="campo">
          <label htmlFor="lg-email">Email</label>
          <input id="lg-email" name="email" type="email" value={datos.email} onChange={cambiar} autoComplete="email" />
        </div>
        <div className="campo">
          <label htmlFor="lg-password">Contraseña</label>
          <input id="lg-password" name="password" type="password" value={datos.password} onChange={cambiar}
            autoComplete={registrando ? 'new-password' : 'current-password'} />
        </div>

        {estado.tipo === 'error' && <p className="aviso aviso--error" role="alert">{estado.mensaje}</p>}

        <button type="submit" className="btn btn--primario btn--bloque" disabled={estado.tipo === 'enviando'}>
          {estado.tipo === 'enviando' ? 'Un momento…' : registrando ? 'Crear cuenta' : 'Ingresar'}
        </button>

        <p className="login__alternativa">
          {registrando ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <button type="button" className="btn-texto" onClick={cambiarModo}>
            {registrando ? 'Ingresá' : 'Creá una'}
          </button>
        </p>
        <Link to="/" className="btn-texto login__volver">← Volver a la tienda</Link>
      </form>
    </div>
  )
}
