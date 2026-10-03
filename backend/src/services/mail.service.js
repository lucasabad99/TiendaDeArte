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
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function enviarConsulta({ nombre, email, telefono, motivoTexto, mensaje }) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: env.MAIL_FROM,
    to: env.CONTACT_TO || 'artista@tallerdearte.local',
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

  const vistaPrevia = nodemailer.getTestMessageUrl(info);
  if (vistaPrevia) console.log(`[mail] Ver el mail de prueba: ${vistaPrevia}`);

  return info;
}

module.exports = { enviarConsulta };
