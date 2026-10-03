const express = require('express');
const userController = require('../controllers/user.controller');
const { authJwt, can } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authJwt, can('users:read'), userController.listar);
router.patch('/:id/role', authJwt, can('users:assignRole'), userController.cambiarRol);

module.exports = router;
