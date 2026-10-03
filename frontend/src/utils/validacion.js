// Reglas compartidas por los formularios (contacto y checkout). Las mismas que valida el back.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const TELEFONO_RE = /^[\d\s+()-]{6,20}$/

export function validarPersona({ nombre, email, telefono }) {
  const errores = {}
  if (nombre.trim().length < 2) errores.nombre = 'Ingresá tu nombre.'
  if (!EMAIL_RE.test(email)) errores.email = 'Ingresá un email válido.'
  if (telefono && !TELEFONO_RE.test(telefono)) errores.telefono = 'Teléfono inválido.'
  return errores
}
