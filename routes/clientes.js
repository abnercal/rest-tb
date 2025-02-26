// routes/clientes.js
const { Router } = require('express')
const router = Router();
const clientesController = require('../controllers/clientes');

router.get('/', clientesController.getClientes);
router.get('/:id', clientesController.getClienteById);
router.post('/', clientesController.crearCliente);
router.put('/:id', clientesController.updateCliente);
router.delete('/:id', clientesController.deleteCliente);

module.exports = router;