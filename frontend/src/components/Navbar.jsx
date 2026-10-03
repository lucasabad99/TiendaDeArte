import { useCarrito } from '../context/CartContext'

export default function Navbar() {
  const { totalUnidades, abrirCarrito } = useCarrito()

  return (
    <header className="navbar">
      <div className="contenedor navbar__inner">
        <a href="#inicio" className="logo">Taller de Arte</a>
        <nav className="navbar__links">
          <a href="#obras">Obras</a>
          <a href="#sobre-mi">Sobre mí</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <button className="btn-carrito" onClick={abrirCarrito} aria-label={`Abrir carrito, ${totalUnidades} obras`}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z" />
            <path d="M9 7V6a3 3 0 0 1 6 0v1" />
          </svg>
          {totalUnidades > 0 && <span className="btn-carrito__badge">{totalUnidades}</span>}
        </button>
      </div>
    </header>
  )
}
