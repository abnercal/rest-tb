const models = require("../models/mysql");

/**
 * Tipos de registro auditados en bitacora_registro. Agregar acá si se suma
 * un nuevo dominio con cambios de estado a auditar.
 */
const TIPOS_REGISTRO = {
  ORDEN: "ORDEN",
  COMPRA: "COMPRA",
};

/**
 * Registra un cambio de estado en bitacora_registro.
 *
 * SIEMPRE se llama dentro de la misma transacción que hace el cambio real
 * (pasar `transaction`) para que quede atómico con él — si el cambio de
 * estado falla y hace rollback, el registro de bitácora también se revierte.
 *
 * @param {object} datos
 * @param {string} datos.tiporeg - TIPOS_REGISTRO.ORDEN | TIPOS_REGISTRO.COMPRA
 * @param {string|number} datos.idregistro - id de la Orden/Compra afectada
 * @param {string|null} datos.estadoAnterior - nombre del estado previo (null si es creación)
 * @param {string} datos.estadoNuevo - nombre del estado al que quedó
 * @param {number|null} [datos.codigoemp] - idusuario que ejecutó la acción
 * @param {string} [datos.accion] - descripción corta; si no se pasa, se arma sola
 * @param {import('sequelize').Transaction} transaction
 */
const registrarCambioEstado = async (
  { tiporeg, idregistro, estadoAnterior = null, estadoNuevo, codigoemp = null, accion },
  transaction
) => {
  await models.BitacoraRegistro.create(
    {
      tiporeg,
      idregistro: String(idregistro),
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
      codigoemp,
      accion: accion || `${estadoAnterior ?? "Creado"} -> ${estadoNuevo}`,
      fecha: new Date(),
    },
    { transaction }
  );
};

module.exports = { registrarCambioEstado, TIPOS_REGISTRO };
