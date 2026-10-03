const mailService = require('../services/mail.service');

const MOTIVOS = {
  consulta: 'Consulta por una obra',
  encargo: 'Encargo personalizado',
  envio: 'Envíos y pagos',
  otro: 'Otro',
};

// Mismas reglas que el formulario del front: nunca confiamos solo en la validación del navegador.
function validar(body) {
  const errores = {};
  const texto = (v) => (typeof v === 'string' ? v.trim() : '');

  const datos = {
    nombre: texto(body.nombre),
    email: texto(body.email),
    telefono: texto(body.telefono),
    motivo: texto(body.motivo),
    mensaje: texto(body.mensaje),
  };

  if (datos.nombre.length < 2 || datos.nombre.length > 100) errores.nombre = 'Nombre inválido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email) || datos.email.length > 200) errores.email = 'Email inválido.';
  if (datos.telefono && !/^[\d\s+()-]{6,20}$/.test(datos.telefono)) errores.telefono = 'Teléfono inválido.';
  if (!MOTIVOS[datos.motivo]) datos.motivo = 'otro';
  if (datos.mensaje.length < 10 || datos.mensaje.length > 5000) errores.mensaje = 'El mensaje debe tener entre 10 y 5000 caracteres.';

  return { datos, errores };
}

async function enviar(req, res, next) {
  try {
    // Honeypot: si un bot completó el campo oculto, respondemos OK sin mandar nada
    if (req.body.website) {
      return res.status(200).json({ status: 'success', code: 200, message: 'Mensaje recibido' });
    }

    const { datos, errores } = validar(req.body);
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Datos inválidos', errores });
    }

    await mailService.enviarConsulta({ ...datos, motivoTexto: MOTIVOS[datos.motivo] });

    return res.status(200).json({ status: 'success', code: 200, message: 'Mensaje recibido' });
  } catch (err) {
    next(err);
  }
}

module.exports = { enviar };
