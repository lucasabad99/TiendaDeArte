// Sesión: el back guarda el token en una cookie httpOnly (el JS de la página no puede leerla,
// así un script malicioso no puede robarla). Acá solo pedimos login/logout y quién soy.
import { api } from './api'

export const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } })
export const registrar = (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password } })
export const logout = () => api('/auth/logout', { method: 'POST' })
export const quienSoy = () => api('/auth/me')
