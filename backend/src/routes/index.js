const express = require('express');
const contactoRoutes = require('./contacto.routes');

const router = express.Router();

router.use('/contacto', contactoRoutes);

router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API Tienda de Arte — v1',
    endpoints: ['POST /api/v1/contacto'],
  });
});

module.exports = router;
