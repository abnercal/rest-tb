const { Router } = require('express');
const ctrl = require('../../controllers/modulos');
const { verifyJWT } = require('../../middlewares/auth/verifyJWT');

const router = Router();

const soloSuperAdmin = (req, res, next) => {
  const { roles = [] } = req.user || {};
  if (!roles.includes('SUPERADMIN')) {
    return res.status(403).json({
      ok: false,
      errors: { msg: 'Se requiere rol SUPERADMIN' },
    });
  }
  next();
};

// Público (auth): devuelve mapa feature_key → permiso_nombre (DEBE ir antes de /:id)
router.get('/public/mapa', verifyJWT, async (req, res) => {
  try {
    const feature = require('../../controllers/modulos/feature');
    const { successResponse } = require('../../utils/handleError');
    const result = await feature.getModulosFtr();
    const mapa = {};
    for (const m of result) {
      mapa[m.feature_key] = m.permiso_nombre;
    }
    return successResponse(res, 'Mapa feature→permiso', mapa);
  } catch (error) {
    const { errorResponse } = require('../../utils/handleError');
    return errorResponse(res, error, 'Error al obtener mapa');
  }
});

// Súper admin: CRUD completo
router.get('/',    verifyJWT, soloSuperAdmin, ctrl.getModulosCtrl);
router.get('/:id', verifyJWT, soloSuperAdmin, ctrl.getModuloCtrl);
router.put('/:id', verifyJWT, soloSuperAdmin, ctrl.updateModuloCtrl);

module.exports = router;
