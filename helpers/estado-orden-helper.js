/**
 * Helper de resolución del estado de una orden por nombre.
 *
 * Evita hardcodear ids numéricos de `idestado` en los controladores
 * (bug detectado: ESTADO_CREADO = 1 y un idestado === 3 hardcodeado
 * para "anular" no coincidían con el orden real del seed).
 */
const ESTADOS_ORDEN = {
  COTIZACION: "Cotizacion",
  CONFIRMADA: "Confirmada",
  ENTREGADA: "Entregada",
  ANULADA: "Anulada",
};

async function getEstadoOrdenId(nombre) {
  const models = require("../models/mysql");
  const estado = await models.EstadoOrden.findOne({ where: { nombre } });
  if (!estado) {
    const err = new Error(`Estado de orden '${nombre}' no configurado`);
    err.status = 500;
    err.code = "ESTADO_ORDEN_NO_CONFIGURADO";
    throw err;
  }
  return estado.idestado;
}

/**
 * Resuelve el nombre de un estado a partir de su id — usado para armar el
 * "estado_anterior" al registrar en bitácora, cuando solo tenemos el
 * idestado actual de la orden (puede ser Confirmada o Entregada).
 */
async function getEstadoOrdenNombre(idestado) {
  const models = require("../models/mysql");
  const estado = await models.EstadoOrden.findByPk(idestado);
  return estado ? estado.nombre : null;
}

module.exports = { ESTADOS_ORDEN, getEstadoOrdenId, getEstadoOrdenNombre };
