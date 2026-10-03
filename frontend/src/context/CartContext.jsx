/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { getObras, confirmarCompra } from '../services/obrasService'
import { leerStorage, guardarStorage } from '../utils/formato'

const CARRITO_KEY = 'tienda-arte:carrito'
const CartContext = createContext(null)

// Cada item del carrito: { _id, title, price, thumbnail, cantidad }
// Regla de oro del stock: cantidad en carrito <= stock de la obra. El reducer la hace cumplir siempre.
function carritoReducer(items, accion) {
  switch (accion.type) {
    case 'agregar': {
      const { obra } = accion
      const existente = items.find((i) => i._id === obra._id)
      const cantidad = (existente?.cantidad ?? 0) + 1
      if (cantidad > obra.stock) return items
      if (existente) {
        return items.map((i) => (i._id === obra._id ? { ...i, cantidad } : i))
      }
      return [
        ...items,
        { _id: obra._id, title: obra.title, price: obra.price, thumbnail: obra.thumbnails[0], cantidad },
      ]
    }
    case 'cambiarCantidad': {
      const { id, cantidad, stock } = accion
      if (cantidad <= 0) return items.filter((i) => i._id !== id)
      return items.map((i) => (i._id === id ? { ...i, cantidad: Math.min(cantidad, stock) } : i))
    }
    case 'quitar':
      return items.filter((i) => i._id !== accion.id)
    case 'vaciar':
      return []
    case 'ajustarAlStock': {
      // Si el stock bajó (otra pestaña, otra compra, el back), recortamos el carrito.
      const { obras } = accion
      return items
        .map((i) => {
          const obra = obras.find((o) => o._id === i._id)
          return obra ? { ...i, cantidad: Math.min(i.cantidad, obra.stock) } : { ...i, cantidad: 0 }
        })
        .filter((i) => i.cantidad > 0)
    }
    default:
      return items
  }
}

export function CartProvider({ children }) {
  const [obras, setObras] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [items, dispatch] = useReducer(carritoReducer, [], () => leerStorage(CARRITO_KEY, []))
  const [abierto, setAbierto] = useState(false)

  // Trae las obras del back y recorta el carrito si el stock bajó
  const recargarObras = useCallback(
    () =>
      getObras().then((data) => {
        setObras(data)
        dispatch({ type: 'ajustarAlStock', obras: data })
      }),
    [],
  )

  useEffect(() => {
    recargarObras()
      .catch(() => setErrorCarga(true)) // backend caído: no vaciamos el carrito guardado
      .finally(() => setCargando(false))
  }, [recargarObras])

  useEffect(() => {
    guardarStorage(CARRITO_KEY, items)
  }, [items])

  const cantidadEnCarrito = useCallback(
    (id) => items.find((i) => i._id === id)?.cantidad ?? 0,
    [items],
  )

  // Lo que todavía se puede agregar = stock real - lo que ya está en el carrito
  const disponible = useCallback(
    (id) => {
      const obra = obras.find((o) => o._id === id)
      return obra ? obra.stock - cantidadEnCarrito(id) : 0
    },
    [obras, cantidadEnCarrito],
  )

  const agregar = useCallback((obra) => dispatch({ type: 'agregar', obra }), [])
  const quitar = useCallback((id) => dispatch({ type: 'quitar', id }), [])
  const vaciar = useCallback(() => dispatch({ type: 'vaciar' }), [])
  const cambiarCantidad = useCallback(
    (id, cantidad) => {
      const stock = obras.find((o) => o._id === id)?.stock ?? 0
      dispatch({ type: 'cambiarCantidad', id, cantidad, stock })
    },
    [obras],
  )

  // El servidor valida y descuenta el stock. Después recargamos las obras para mostrar el stock real:
  // si hubo compra, baja; si faltó stock, el carrito se recorta solo con ajustarAlStock.
  const finalizarCompra = useCallback(
    async (comprador) => {
      const resultado = await confirmarCompra(items, comprador)
      if (resultado.ok) dispatch({ type: 'vaciar' })
      await recargarObras().catch(() => {})
      return resultado
    },
    [items, recargarObras],
  )

  const totalUnidades = items.reduce((acc, i) => acc + i.cantidad, 0)
  const total = items.reduce((acc, i) => acc + i.cantidad * i.price, 0)

  const valor = useMemo(
    () => ({
      obras, cargando, errorCarga, items, totalUnidades, total, abierto,
      abrirCarrito: () => setAbierto(true),
      cerrarCarrito: () => setAbierto(false),
      agregar, quitar, vaciar, cambiarCantidad, disponible, cantidadEnCarrito, finalizarCompra,
    }),
    [obras, cargando, errorCarga, items, totalUnidades, total, abierto, agregar, quitar, vaciar, cambiarCantidad, disponible, cantidadEnCarrito, finalizarCompra],
  )

  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>
}

export function useCarrito() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCarrito debe usarse dentro de <CartProvider>')
  return ctx
}
