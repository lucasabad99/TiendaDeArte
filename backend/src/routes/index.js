const express = require('express');
const contactoRoutes = require('./contacto.routes');
const authRoutes = require('./auth.routes');
const productsRoutes = require('./products.routes');
const usersRoutes = require('./users.routes');

const router = express.Router();

router.use('/contacto', contactoRoutes);
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/users', usersRoutes);

router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API Tienda de Arte — v1',
    endpoints: [
      'POST   /api/v1/contacto',
      'POST   /api/v1/auth/register',
      'POST   /api/v1/auth/login',
      'POST   /api/v1/auth/logout',
      'GET    /api/v1/auth/me              (JWT)',
      'GET    /api/v1/products',
      'GET    /api/v1/products/:pid',
      'POST   /api/v1/products             (products:write)',
      'PATCH  /api/v1/products/:pid        (products:write; precio/stock/status: products:price)',
      'DELETE /api/v1/products/:pid        (products:delete)',
      'GET    /api/v1/users                (users:read)',
      'PATCH  /api/v1/users/:id/role       (users:assignRole)',
    ],
  });
});

module.exports = router;
