import { Link } from 'react-router'

const ANIO = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor footer__inner">
        <span className="logo">Taller de Arte</span>
        <nav className="footer__links">
          <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="#contacto">Contacto</a>
          <Link to="/admin">Ingresar</Link>
        </nav>
        <small>© {ANIO} Taller de Arte. Todos los derechos reservados.</small>
      </div>
    </footer>
  )
}
