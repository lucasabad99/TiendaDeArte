// Nombres para mostrar. Los valores (claves) son los mismos que usa el back.

export const ROLES = {
  superadmin: 'Superadmin',
  owner: 'Dueña/o',
  manager: 'Manager',
  editor: 'Editor',
  customer: 'Cliente',
}

export const ESTADOS = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  enviada: 'Enviada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

// Estados de un pago en Mercado Pago (los que no aprueban la orden)
export const MP_ESTADOS = {
  approved: 'aprobado',
  rejected: 'rechazado',
  in_process: 'en revisión',
  pending: 'pendiente (ej. efectivo)',
  authorized: 'autorizado',
  cancelled: 'cancelado',
  refunded: 'devuelto',
}

// Igual que TRANSICIONES en backend/src/models/Order.model.js (el back es quien valida).
export const ACCIONES = {
  pendiente: [{ a: 'pagada', texto: 'Marcar pagada' }, { a: 'cancelada', texto: 'Cancelar' }],
  pagada: [{ a: 'enviada', texto: 'Marcar enviada' }, { a: 'cancelada', texto: 'Cancelar' }],
  enviada: [{ a: 'entregada', texto: 'Marcar entregada' }],
  entregada: [],
  cancelada: [],
}

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })
export const formatearFecha = (iso) => fecha.format(new Date(iso))
