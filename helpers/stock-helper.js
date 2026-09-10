const models = require("../models/mysql");

/** Tolerancia para comparar DECIMAL(18,2). */
const EPS = 0.001;

/**
 * Invariante de inventario para productos que controlan vencimiento:
 * `Almacen.stock` debe ser igual a la suma de `cantidad_disponible` de sus
 * lotes activos (estado = 1). Si no coincide, el inventario de ese producto
 * está descuadrado y no se debe seguir moviéndolo hasta reconciliar.
 *
 * Se invoca DENTRO de la transacción de venta, con los lotes ya leídos bajo lock.
 *
 * @param {string} nombreProd
 * @param {number} stockAlmacen  - Almacen.stock actual
 * @param {Array}  lotes         - lotes activos (instancias Sequelize)
 * @throws {Error} 409 STOCK_DESCUADRADO si el descuadre supera EPS
 */
const assertInvarianteLotes = (nombreProd, stockAlmacen, lotes) => {
  const sumaLotes = lotes.reduce((s, l) => s + Number(l.cantidad_disponible), 0);
  if (Math.abs(sumaLotes - Number(stockAlmacen)) > EPS) {
    const error = new Error(
      `Inventario descuadrado para "${nombreProd}": Almacen.stock=${stockAlmacen} ` +
        `vs suma de lotes=${sumaLotes}. Corré la reconciliación de stock ` +
        `(node scripts/reconciliar-stock.js) antes de seguir vendiendo este producto.`
    );
    error.status = 409;
    error.code = "STOCK_DESCUADRADO";
    throw error;
  }
};

/**
 * Reconcilia `Almacen.stock` contra la suma de lotes activos, SOLO para
 * productos con `controla_vencimiento = true` (para el resto no hay segunda
 * fuente de verdad: `Almacen.stock` es la única y no se toca).
 *
 * @param {object}  [opts]
 * @param {number}  [opts.codigoprod]      acotar a un producto
 * @param {number}  [opts.idsucursal]      acotar a una sucursal
 * @param {boolean} [opts.aplicar=false]   si true, ajusta Almacen.stock = suma de lotes
 * @returns {Promise<{revisados:number, descuadres:Array, corregidos:number}>}
 */
const reconciliarStock = async ({ codigoprod, idsucursal, aplicar = false } = {}) => {
  const whereAlmacen = {};
  if (codigoprod !== undefined) whereAlmacen.codigoprod = codigoprod;
  if (idsucursal !== undefined) whereAlmacen.idsucursal = idsucursal;

  const almacenes = await models.Almacen.findAll({
    where: whereAlmacen,
    include: [
      {
        model: models.Producto,
        as: "Producto",
        attributes: ["codigoprod", "nombre", "controla_vencimiento"],
        where: { controla_vencimiento: true },
        required: true,
      },
    ],
  });

  const descuadres = [];
  let corregidos = 0;
  const t = aplicar ? await models.sequelize.transaction() : null;

  try {
    for (const a of almacenes) {
      const sumaLotes =
        (await models.Lote.sum("cantidad_disponible", {
          where: { codigoprod: a.codigoprod, idsucursal: a.idsucursal, estado: 1 },
          transaction: t || undefined,
        })) || 0;

      const stockActual = Number(a.stock);
      const diferencia = Number(sumaLotes) - stockActual;

      if (Math.abs(diferencia) > EPS) {
        descuadres.push({
          codigoprod: a.codigoprod,
          producto: a.Producto?.nombre,
          idsucursal: a.idsucursal,
          stockAlmacen: stockActual,
          sumaLotes: Number(sumaLotes),
          diferencia,
        });

        if (aplicar) {
          await a.update({ stock: Number(sumaLotes) }, { transaction: t });
          corregidos++;
        }
      }
    }

    if (t) await t.commit();
  } catch (err) {
    if (t) await t.rollback();
    throw err;
  }

  return { revisados: almacenes.length, descuadres, corregidos };
};

module.exports = { assertInvarianteLotes, reconciliarStock };
