/**
 * Reconciliación de stock.
 *
 * Compara `Almacen.stock` con la suma de lotes activos, SOLO para productos
 * que controlan vencimiento. Para el resto, `Almacen.stock` es la única fuente
 * de verdad y no hay nada que reconciliar.
 *
 *   node scripts/reconciliar-stock.js                    → solo reporta descuadres
 *   node scripts/reconciliar-stock.js --aplicar          → además ajusta Almacen.stock = suma de lotes
 *   node scripts/reconciliar-stock.js --producto=4        → acota a un producto
 *   node scripts/reconciliar-stock.js --sucursal=1        → acota a una sucursal
 */
require("dotenv").config();
const { reconciliarStock } = require("../helpers/stock-helper");
const { dbConnect, dbConnnectonMySql } = require("../config/db/connection");

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
};

(async () => {
  await dbConnnectonMySql();

  const aplicar = process.argv.includes("--aplicar");
  const codigoprod = arg("producto") ? Number(arg("producto")) : undefined;
  const idsucursal = arg("sucursal") ? Number(arg("sucursal")) : undefined;

  const res = await reconciliarStock({ codigoprod, idsucursal, aplicar });

  console.log(`\nProductos con lote revisados: ${res.revisados}`);

  if (res.descuadres.length === 0) {
    console.log("OK: todo cuadrado, nada que reconciliar.");
  } else {
    console.log(`\n${res.descuadres.length} descuadre(s):\n`);
    console.table(res.descuadres);
    console.log(
      aplicar
        ? `\nCorregidos: ${res.corregidos} (Almacen.stock ajustado a la suma de lotes).`
        : `\nCorré de nuevo con --aplicar para corregir.`
    );
  }

  await dbConnect.close();
  process.exit(0);
})().catch((e) => {
  console.error("Error en la reconciliación:", e);
  process.exit(1);
});
