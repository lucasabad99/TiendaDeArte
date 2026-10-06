// Helper común para hablar con el back. Manda la cookie de sesión (credentials: 'include')
// y convierte cualquier respuesta que no sea 2xx en un ApiError con su status.

const API_URL = import.meta.env.VITE_API_URL

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
      headers: body && !esArchivos ? { 'Content-Type': 'application/json' } : undefined,
      body: esArchivos ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new ApiError(respuesta.status, cuerpo.message || `Error ${respuesta.status}`, cuerpo)
  return cuerpo.data
}
