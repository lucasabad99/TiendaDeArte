const express = require('express');
const rateLimit = require('express-rate-limit');
const contactoController = require('../controllers/contacto.controller');

const router = express.Router();

// Anti-spam: máximo 5 consultas cada 15 minutos por IP
const limiteContacto = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Demasiados mensajes. Probá de nuevo en unos minutos.',
  },
});

router.post('/', limiteContacto, contactoController.enviar);

module.exports = router;
