/**
 * Unicidad de códigos de barras (compartida por controllers/barcodes y controllers/productos).
 *
 * Un valor escaneado debe resolverse a UNA sola (presentación, variante). Reglas:
 *  - entre los códigos ACTIVOS de prod_barcode el valor es único (la BD lo refuerza con el UNIQUE
 *    uq_barcode_activo sobre la columna generada barcode_activo = IF(estado = 1, barcode, NULL);
 *    esa columna NO está en el modelo de Sequelize);
 *  - un prod_barcode activo no puede coincidir con un producto_presentacion.codigo_barras.
 */
const { Op } = require("sequelize");
const models = require("../models/mysql");
const { errorDeNegocio } = require("./variante-helper");

const errorBarcodeDuplicado = (barcode, detalles) =>
  errorDeNegocio(409, `El código de barras ${barcode} ya está en uso`, "BARCODE_DUPLICADO", detalles);

// El valor no puede estar ya en uso por otro prod_barcode activo ni como código de presentación.
const validarBarcodeUnico = async (barcode, idbarcodeExcluir, transaction) => {
  const enUso = await models.Barcode.findOne({
    where: {
      barcode,
      estado: 1,
      ...(idbarcodeExcluir != null ? { idbarcode: { [Op.ne]: idbarcodeExcluir } } : {}),
    },
    transaction,
  });
  const enPresentacion = enUso
    ? null
    : await models.ProductoPresentacion.findOne({ where: { codigo_barras: barcode, estado: 1 }, transaction });
  if (enUso || enPresentacion) {
    throw errorBarcodeDuplicado(
      barcode,
      [enUso ? { idbarcode: enUso.idbarcode } : { idprodPresenta: enPresentacion.idprodPresenta }],
    );
  }
};

// Para producto_presentacion.codigo_barras: no puede coincidir con un prod_barcode ACTIVO.
const validarCodigoDePresentacionLibre = async (codigoBarras, transaction) => {
  const enUso = await models.Barcode.findOne({ where: { barcode: codigoBarras, estado: 1 }, transaction });
  if (enUso) throw errorBarcodeDuplicado(codigoBarras, [{ idbarcode: enUso.idbarcode }]);
};

// Traduce el UNIQUE uq_barcode_activo (carrera entre dos altas del mismo valor) a 409; el resto pasa tal cual.
const traducirErrorDeBarcode = (error) => {
  const unico = error?.name === "SequelizeUniqueConstraintError" || error?.parent?.errno === 1062 ||
    error?.original?.errno === 1062 || error?.parent?.code === "ER_DUP_ENTRY" || error?.original?.code === "ER_DUP_ENTRY";
  if (!unico) return error;
  const texto = [
    error.parent?.sqlMessage,
    error.original?.sqlMessage,
    error.message,
    ...Object.keys(error.fields || {}),
  ].filter(Boolean).join(" ");
  if (texto.includes("uq_barcode_activo")) {
    return errorDeNegocio(409, "El código de barras ya está en uso", "BARCODE_DUPLICADO");
  }
  return error;
};

module.exports = { validarBarcodeUnico, validarCodigoDePresentacionLibre, traducirErrorDeBarcode };
