// Envío del formulario de contacto: POST {API}/contacto (el back manda el mail con nodemailer).
// Si algo falla, lanza un error y el componente muestra el aviso de "No se pudo enviar".

const API_URL = import.meta.env.VITE_API_URL

export async function enviarConsulta(datos) {
  const respuesta = await fetch(`${API_URL}/contacto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
  const cuerpo = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(cuerpo.message || `Error ${respuesta.status}`)
  return { ok: true }
}
