const express = require('express');
const multer = require('multer');
const imagenes = require('../services/imagenes.service');
const { authJwt, can } = require('../middlewares/auth.middleware');

const router = express.Router();

const MAX_MB = 10;
const MAX_FOTOS = 10;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Los archivos quedan en memoria solo mientras se suben a Cloudinary: nada se guarda en el servidor
const recibir = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: MAX_FOTOS },
  fileFilter: (req, file, cb) => {
    if (TIPOS.includes(file.mimetype)) return cb(null, true);
    const err = new Error(`"${file.originalname}" no es una foto (se aceptan JPG, PNG, WEBP o HEIC).`);
    err.status = 400;
    cb(err);
  },
}).array('fotos', MAX_FOTOS);

// Traduce los errores de multer a mensajes para la persona que sube las fotos
function recibirFotos(req, res, next) {
  recibir(req, res, (err) => {
    if (!err) return next();
    const mensajes = {
      LIMIT_FILE_SIZE: `Cada foto puede pesar hasta ${MAX_MB} MB.`,
      LIMIT_FILE_COUNT: `Podés subir hasta ${MAX_FOTOS} fotos por vez.`,
      LIMIT_UNEXPECTED_FILE: `Podés subir hasta ${MAX_FOTOS} fotos por vez.`,
    };
    const status = err.status || 400;
    return res.status(status).json({ status: 'error', code: status, message: mensajes[err.code] || err.message });
  });
}

// POST /uploads/imagenes  (multipart, campo "fotos") → [{ url, publicId, ancho, alto }]
router.post('/imagenes', authJwt, can('products:write'), (req, res, next) => {
  if (!imagenes.habilitado()) {
    return res.status(503).json({
      status: 'error',
      code: 503,
      message: 'La subida de fotos no está configurada (falta CLOUDINARY_URL). Pegá el link de la imagen.',
    });
  }
  next();
}, recibirFotos, async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ status: 'error', code: 400, message: 'No llegó ninguna foto.' });
    }
    const subidas = await Promise.all(req.files.map((f) => imagenes.subir(f.buffer)));
    return res.status(201).json({ status: 'success', code: 201, data: subidas });
  } catch (err) {
    console.error('[cloudinary]', err?.message || JSON.stringify(err));
    return res.status(502).json({ status: 'error', code: 502, message: 'No se pudieron subir las fotos. Probá de nuevo en un rato.' });
  }
});

module.exports = router;
