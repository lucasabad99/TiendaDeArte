/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import { guardarToken } from '../services/api'

const AuthContext = createContext(null)
const SIN_SESION = { usuario: null, acceso: null }

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(SIN_SESION)
  const [cargando, setCargando] = useState(true)

  // Al entrar, preguntamos al back si ya hay una sesión abierta (la cookie viaja sola)
  useEffect(() => {
    authService
      .quienSoy()
      .then((d) => setSesion({ usuario: d.user, acceso: d.acceso }))
      .catch(() => setSesion(SIN_SESION))
      .finally(() => setCargando(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await authService.login(email, password)
    guardarToken(d.token) // solo si VITE_AUTH_TOKEN=true (ver services/api.js)
    setSesion({ usuario: d.user, acceso: d.acceso })
  }, [])

  const registrar = useCallback(
    async (name, email, password) => {
      await authService.registrar(name, email, password)
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    await authService.logout().catch(() => {})
    guardarToken(null)
    setSesion(SIN_SESION)
  }, [])

  // Solo para mostrar/ocultar cosas en pantalla: el back vuelve a chequear cada permiso.
  const puede = useCallback(
    (permiso) => {
      const lista = sesion.acceso?.permisos ?? []
      return lista.includes('*') || lista.includes(permiso)
    },
    [sesion.acceso],
  )

  // Si el back responde 401 (sesión vencida o usuario borrado), volvemos al login.
  const manejarError = useCallback((err) => {
    if (err?.status === 401) {
      guardarToken(null)
      setSesion(SIN_SESION)
    }
    return err?.message || 'Ocurrió un error inesperado.'
  }, [])

  const valor = useMemo(
    () => ({ ...sesion, cargando, login, registrar, logout, puede, manejarError }),
    [sesion, cargando, login, registrar, logout, puede, manejarError],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
