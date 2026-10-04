// Estado del pago de un pedido. paymentId es el que agrega Mercado Pago a la URL al volver:
// el back lo verifica con MP antes de dar el pedido por pagado.
import { api } from './api'

export const confirmarPago = (code, paymentId) =>
  api('/payments/confirmar', { method: 'POST', body: { code, paymentId } })
