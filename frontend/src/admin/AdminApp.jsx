import { Link, Navigate, NavLink, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ROLES } from './textos'
import Login from './Login'
import Pedidos from './Pedidos'
import Obras from './Obras'
import Usuarios from './Usuarios'
import MisPedidos from './MisPedidos'

// Cada sección aparece solo si el rol tiene el permiso. "Mis pedidos" es para quien
// no administra pedidos (clientes); el resto los ve todos en "Pedidos".
const SECCIONES = [
  { ruta: 'pedidos', titulo: 'Pedidos', permiso: 'orders:read', Componente: Pedidos },
  { ruta: 'obras', titulo: 'Obras', permiso: 'products:write', Componente: Obras },
  { ruta: 'usuarios', titulo: 'Usuarios', permiso: 'users:read', Componente: Usuarios },
  { ruta: 'mis-pedidos', titulo: 'Mis pedidos', permiso: 'orders:own', salvoSi: 'orders:read', Componente: MisPedidos },
]

export default function AdminApp() {
  return (
    <AuthProvider>
      <Panel />
    </AuthProvider>
  )
}

function Panel() {
  const { usuario, cargando, puede, logout } = useAuth()

  if (cargando) return <div className="admin-centro"><p className="texto-suave">Cargando…</p></div>
  if (!usuario) return <Login />

  const secciones = SECCIONES.filter((s) => puede(s.permiso) && !(s.salvoSi && puede(s.salvoSi)))
  // Rutas absolutas: en React Router 7 un link relativo dentro de /admin/* se resuelve desde la
  // URL actual (/admin/pedidos + obras = /admin/pedidos/obras) y la redirección entraba en bucle.
  const inicio = secciones[0] ? `/admin/${secciones[0].ruta}` : '/'

  return (
    <div className="admin">
      <header className="admin__barra">
        <div className="contenedor admin__barra-inner">
          <Link to="/" className="logo">Taller de Arte</Link>
          <nav className="admin__nav" aria-label="Secciones del panel">
            {secciones.map((s) => (
              <NavLink key={s.ruta} to={`/admin/${s.ruta}`} className={({ isActive }) => `admin__tab ${isActive ? 'admin__tab--activa' : ''}`}>
                {s.titulo}
              </NavLink>
            ))}
          </nav>
          <div className="admin__usuario">
            <span>{usuario.name} <span className="rol">{ROLES[usuario.role] ?? usuario.role}</span></span>
            <button className="btn-texto" onClick={logout}>Salir</button>
          </div>
        </div>
      </header>

      <main className="contenedor admin__main">
        <Routes>
          <Route index element={<Navigate to={inicio} replace />} />
          {secciones.map(({ ruta, Componente }) => (
            <Route key={ruta} path={ruta} element={<Componente />} />
          ))}
          {/* Sección inexistente o sin permiso: a la primera disponible */}
          <Route path="*" element={<Navigate to={inicio} replace />} />
        </Routes>
      </main>
    </div>
  )
}
