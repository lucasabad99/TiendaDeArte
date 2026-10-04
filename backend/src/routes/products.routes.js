const express = require('express');
const productController = require('../controllers/product.controller');
const { authJwt, can } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', productController.listar);
router.get('/all', authJwt, can('products:write'), productController.listarTodas); // antes de /:pid
router.get('/:pid', productController.obtener);
router.post('/', authJwt, can('products:write'), productController.crear);
router.patch('/:pid', authJwt, can('products:write'), productController.actualizar);
router.delete('/:pid', authJwt, can('products:delete'), productController.eliminar);

module.exports = router;
