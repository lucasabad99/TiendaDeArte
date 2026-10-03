const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export const formatearPrecio = (valor) => pesos.format(valor)

// localStorage puede fallar (modo privado, cuota llena): nunca rompemos la app por eso.
export function leerStorage(clave, porDefecto) {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? JSON.parse(crudo) : porDefecto
  } catch {
    return porDefecto
  }
}

export function guardarStorage(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    /* sin persistencia, seguimos */
  }
}
