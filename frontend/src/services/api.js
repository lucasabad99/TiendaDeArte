// Helper común para hablar con el back. Manda la cookie de sesión (credentials: 'include')
// y convierte cualquier respuesta que no sea 2xx en un ApiError con su status.

const API_URL = import.meta.env.VITE_API_URL

// Modo token (VITE_AUTH_TOKEN=true): para cuando el front y el back están en dominios distintos
// (ej. staging en netlify.app + onrender.com), donde el navegador no manda la cookie de sesión.
// Guardamos el token del login y lo mandamos en el header Authorization. En producción, con
// front y API bajo el mismo dominio, queda apagado y se usa solo la cookie httpOnly (más segura).
const MODO_TOKEN = import.meta.env.VITE_AUTH_TOKEN === 'true'
const CLAVE_TOKEN = 'tienda-arte:token'

export function guardarToken(token) {
  if (!MODO_TOKEN) return
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token)
    else localStorage.removeItem(CLAVE_TOKEN)
  } catch {
    /* sin almacenamiento: la sesión dura hasta recargar */
  }
}

export function headersDeSesion() {
  if (!MODO_TOKEN) return {}
  try {
    const token = localStorage.getItem(CLAVE_TOKEN)
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export class ApiError extends Error {
  constructor(status, message, cuerpo = {}) {
    super(message)
    this.status = status // 0 = no hubo respuesta (back caído o sin red)
    this.cuerpo = cuerpo
  }
}

// body: objeto (se manda como JSON) o FormData (archivos: el navegador arma el multipart solo)
export async function api(ruta, { method = 'GET', body } = {}) {
  const esArchivos = body instanceof FormData
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      credentials: 'include',
      headers: { ...headersDeSesion(), ...(body && !esArchivos ? { 'Content-Type': 'application/json' } : {}) },
      body: esArchivos ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new ApiError(respuesta.status, cuerpo.message || `Error ${respuesta.status}`, cuerpo)
  return cuerpo.data
}
