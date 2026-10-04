import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { cambiarRol, getUsuarios } from '../services/adminService'
import { useDatos } from './useDatos'
import { ROLES, formatearFecha } from './textos'

export default function Usuarios() {
  const { usuario: yo, acceso, puede, manejarError } = useAuth()
  const { datos: usuarios, cargando, error, setDatos } = useDatos(getUsuarios)
  const [ocupado, setOcupado] = useState(null)
  const [aviso, setAviso] = useState(null)

  const asignables = acceso?.rolesAsignables ?? []
  // Mismas reglas que el back: no a uno mismo, y solo a quien tenga un rol que yo pueda asignar
  const editable = (u) => puede('users:assignRole') && u._id !== yo._id && asignables.includes(u.role)

  async function cambiar(u, role) {
    setOcupado(u._id)
    setAviso(null)
    try {
      const actualizado = await cambiarRol(u._id, role)
      setDatos((lista) => lista.map((x) => (x._id === actualizado._id ? actualizado : x)))
      setAviso({ tipo: 'ok', texto: `${u.name} ahora es ${ROLES[role].toLowerCase()}.` })
    } catch (err) {
      setAviso({ tipo: 'error', texto: manejarError(err) })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section>
      <div className="admin__encabezado">
        <h1>Usuarios</h1>
      </div>

      <p className="texto-suave admin__ayuda">
        Quien se registra entra como <strong>cliente</strong>. Desde acá le das otro rol:{' '}
        <strong>editor</strong> carga obras sin tocar precios, <strong>manager</strong> maneja obras, precios y pedidos
        {asignables.includes('owner') && <>, <strong>dueña/o</strong> además administra usuarios</>}.
      </p>
      {aviso && <p className={`aviso aviso--${aviso.tipo}`} role="status">{aviso.texto}</p>}

      {cargando ? (
        <p className="texto-suave">Cargando usuarios…</p>
      ) : error ? (
        <p className="aviso aviso--error">{error}</p>
      ) : (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Alta</th><th>Rol</th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}{u._id === yo._id && <span className="texto-suave"> (vos)</span>}</td>
                  <td>{u.email}</td>
                  <td className="texto-suave">{formatearFecha(u.createdAt)}</td>
                  <td>
                    {editable(u) ? (
                      <select value={u.role} onChange={(e) => cambiar(u, e.target.value)} disabled={ocupado === u._id}
                        aria-label={`Rol de ${u.name}`}>
                        {asignables.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                      </select>
                    ) : (
                      <span className="rol">{ROLES[u.role] ?? u.role}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
