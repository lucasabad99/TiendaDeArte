const ANIO = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor footer__inner">
        <span className="logo">Taller de Arte</span>
        <nav className="footer__links">
          <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <small>© {ANIO} Taller de Arte. Todos los derechos reservados.</small>
      </div>
    </footer>
  )
}
