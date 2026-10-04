const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporterPromise = null;

// Se crea una sola vez. Sin SMTP configurado (solo en desarrollo) usamos Ethereal:
// un SMTP de prueba que no entrega nada, pero deja ver cada mail en un link.
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (env.SMTP_HOST) {
        return nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        });
      }
      const cuenta = await nodemailer.createTestAccount();
      console.log(`[mail] Sin SMTP configurado: usando Ethereal (${cuenta.user})`);
      return nodemailer.createTransport({
        host: cuenta.smtp.host,
        port: cuenta.smtp.port,
        secure: cuenta.smtp.secure,
        auth: { user: cuenta.user, pass: cuenta.pass },
      });
    })().catch((err) => {
      transporterPromise = null; // que el próximo intento vuelva a probar
      throw err;
    });
  }
  return transporterPromise;
}

const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const TIENDA = () => env.CONTACT_TO || 'artista@tallerdearte.local';

async function enviar(opciones) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: env.MAIL_FROM, ...opciones });
  const vistaPrevia = nodemailer.getTestMessageUrl(info);
  if (vistaPrevia) console.log(`[mail] Ver el mail de prueba: ${vistaPrevia}`);
  return info;
}

async function enviarConsulta({ nombre, email, telefono, motivoTexto, mensaje }) {
  return enviar({
    to: TIENDA(),
    replyTo: `${nombre} <${email}>`, // "Responder" en el mail le contesta directo a quien escribió
    subject: `[Web] ${motivoTexto} — ${nombre}`,
    text: [
      `Nombre: ${nombre}`,
      `Email: ${email}`,
      `Teléfono: ${telefono || '—'}`,
      `Motivo: ${motivoTexto}`,
      '',
      mensaje,
    ].join('\n'),
    html: `
      <p><strong>Nombre:</strong> ${escapar(nombre)}<br>
      <strong>Email:</strong> ${escapar(email)}<br>
      <strong>Teléfono:</strong> ${escapar(telefono || '—')}<br>
      <strong>Motivo:</strong> ${escapar(motivoTexto)}</p>
      <p style="white-space:pre-wrap">${escapar(mensaje)}</p>
    `,
  });
}

function detallePedido(orden) {
  const lineas = orden.items.map((i) => `${i.cantidad} × ${i.title} — ${pesos.format(i.price * i.cantidad)}`);
  const text = [...lineas, '', `Total: ${pesos.format(orden.total)}`].join('\n');
  const html = `
    <table cellpadding="6" style="border-collapse:collapse">
      ${orden.items
        .map((i) => `<tr><td>${i.cantidad} ×</td><td>${escapar(i.title)}</td><td align="right">${pesos.format(i.price * i.cantidad)}</td></tr>`)
        .join('')}
      <tr><td></td><td><strong>Total</strong></td><td align="right"><strong>${pesos.format(orden.total)}</strong></td></tr>
    </table>`;
  return { text, html };
}

// Dos mails por pedido: aviso a la tienda y confirmación al comprador.
// pagado: true cuando el pago ya se acreditó por Mercado Pago (si no, se coordina a mano).
async function enviarAvisosPedido(orden, { pagado = false } = {}) {
  const { nombre, email, telefono, nota } = orden.comprador;
  const detalle = detallePedido(orden);
  const siguiente = pagado
    ? 'Tu pago ya está acreditado. Te escribimos a la brevedad para coordinar el envío.'
    : 'Te escribimos a la brevedad para coordinar el pago y el envío.';

  const aTienda = enviar({
    to: TIENDA(),
    replyTo: `${nombre} <${email}>`,
    subject: `[Web] ${pagado ? 'Pedido PAGADO' : 'Nuevo pedido'} ${orden.code} — ${nombre}`,
    text: [
      `Pedido ${orden.code}${pagado ? ` — PAGADO por Mercado Pago (pago ${orden.mpPaymentId})` : ''}`,
      `Comprador: ${nombre} · ${email} · ${telefono || 'sin teléfono'}`,
      nota ? `Nota: ${nota}` : '',
      '',
      detalle.text,
    ].join('\n'),
    html: `
      <p><strong>Pedido ${escapar(orden.code)}</strong>${pagado ? ` — <strong style="color:#2f7a4f">PAGADO</strong> por Mercado Pago (pago ${escapar(orden.mpPaymentId)})` : ''}<br>
      <strong>Comprador:</strong> ${escapar(nombre)} · ${escapar(email)} · ${escapar(telefono || 'sin teléfono')}</p>
      ${nota ? `<p><strong>Nota:</strong> <span style="white-space:pre-wrap">${escapar(nota)}</span></p>` : ''}
      ${detalle.html}
    `,
  });

  const aComprador = enviar({
    to: `${nombre} <${email}>`,
    replyTo: TIENDA(),
    subject: `${pagado ? 'Pago confirmado' : 'Recibimos tu pedido'} ${orden.code} — Taller de Arte`,
    text: [
      `Hola ${nombre}, ¡gracias por tu compra!`,
      '',
      detalle.text,
      '',
      siguiente,
    ].join('\n'),
    html: `
      <p>Hola ${escapar(nombre)}, ¡gracias por tu compra!</p>
      <p>Número de pedido: <strong>${escapar(orden.code)}</strong></p>
      ${detalle.html}
      <p>${siguiente}</p>
    `,
  });

  return Promise.all([aTienda, aComprador]);
}

module.exports = { enviarConsulta, enviarAvisosPedido };
