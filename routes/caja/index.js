const { Router } = require('express');
const ctrl = require('../../controllers/caja');
const { verifyJWT, checkPermiso } = require('../../middlewares/auth/verifyJWT');
const {
  createCajaValidator,
  updateCajaValidator,
  abrirSesionValidator,
  cerrarSesionValidator,
  movimientoValidator,
  idParamValidator,
  idCajaParamValidator,
  listadoCajasValidator,
  listadoSesionesValidator,
  sesionActualValidator,
  listadoMovimientosValidator,
} = require('../../middlewares/validators/caja');

const router = Router();

// Las rutas fijas (/sesiones, /sesion-actual) van ANTES de /:id para que no se interpreten como un id.
// caja:read/create/update/delete = catálogo de cajas y consultas; caja:operar = abrir/cerrar/movimientos.

// Sesiones
router.get('/sesion-actual',          verifyJWT, checkPermiso("caja:read"),   sesionActualValidator,        ctrl.getSesionActualCtrl);
router.get('/sesiones',               verifyJWT, checkPermiso("caja:read"),   listadoSesionesValidator,     ctrl.getSesionesCtrl);
router.get('/sesiones/:id',           verifyJWT, checkPermiso("caja:read"),   idParamValidator,             ctrl.getSesionCtrl);
router.get('/sesiones/:id/arqueo',    verifyJWT, checkPermiso("caja:read"),   idParamValidator,             ctrl.getArqueoCtrl);
router.post('/sesiones/:id/cerrar',   verifyJWT, checkPermiso("caja:operar"), idParamValidator, cerrarSesionValidator, ctrl.cerrarSesionCtrl);

// Movimientos (libro append-only: sin PUT ni DELETE)
router.get('/sesiones/:id/movimientos',  verifyJWT, checkPermiso("caja:read"),   idParamValidator, listadoMovimientosValidator, ctrl.getMovimientosCtrl);
router.post('/sesiones/:id/movimientos', verifyJWT, checkPermiso("caja:operar"), idParamValidator, movimientoValidator,         ctrl.crearMovimientoCtrl);

// Cajas (catálogo)
router.get('/',                 verifyJWT, checkPermiso("caja:read"),   listadoCajasValidator,         ctrl.getCajasCtrl);
router.post('/',                verifyJWT, checkPermiso("caja:create"), createCajaValidator,           ctrl.createCajaCtrl);
router.post('/:idcaja/abrir',   verifyJWT, checkPermiso("caja:operar"), idCajaParamValidator, abrirSesionValidator, ctrl.abrirCajaCtrl);
router.get('/:id',              verifyJWT, checkPermiso("caja:read"),   idParamValidator,              ctrl.getCajaCtrl);
router.put('/:id',              verifyJWT, checkPermiso("caja:update"), idParamValidator, updateCajaValidator, ctrl.updateCajaCtrl);
router.delete('/:id',           verifyJWT, checkPermiso("caja:delete"), idParamValidator,              ctrl.delCajaCtrl);

module.exports = router;
