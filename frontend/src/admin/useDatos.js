import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Carga datos del back para una sección del panel. `cargar` tiene que venir memorizado
// (useCallback) para no recargar en cada render. Si el back responde 401, vuelve al login.
export function useDatos(cargar) {
  const { manejarError } = useAuth()
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null })

  const pedir = useCallback(
    (esVigente = () => true) =>
      cargar()
        .then((datos) => esVigente() && setEstado({ datos, cargando: false, error: null }))
        .catch((err) => esVigente() && setEstado({ datos: null, cargando: false, error: manejarError(err) })),
    [cargar, manejarError],
  )

  // Si `cargar` cambia (ej. otro filtro) mientras una respuesta vieja viaja, la descartamos
  useEffect(() => {
    let vigente = true
    pedir(() => vigente)
    return () => {
      vigente = false
    }
  }, [pedir])

  const recargar = useCallback(() => {
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    return pedir()
  }, [pedir])

  // Para actualizar la lista en pantalla después de una acción, sin volver a pedir todo
  const setDatos = useCallback((fn) => setEstado((e) => ({ ...e, datos: fn(e.datos) })), [])

  return { ...estado, recargar, setDatos }
}
