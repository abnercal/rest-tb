const models = require("../../models/mysql");
const { esIdEstricto } = require("../../utils/ids");
const {
  errorDeNegocio,
  normalizarIdVariante,
  bloquearProductoCompartido,
  validarProductoActivo,
} = require("../../helpers/variante-helper");
const { validarBarcodeUnico, traducirErrorDeBarcode } = require("../../helpers/barcode-helper");

/**
 * Códigos de barras por presentación (tabla prod_barcode) con variante (talla/color) opcional.
 *
 * Reglas:
 *  - El código de barras se resuelve a UNA sola (presentación, variante). Por eso el valor debe ser
 *    único entre los códigos ACTIVOS de prod_barcode y contra producto_presentacion.codigo_barras
 *    (409 BARCODE_DUPLICADO): chequeo previo (helpers/barcode-helper.js) + el UNIQUE uq_barcode_activo
 *    de la BD (columna generada barcode_activo, fuera del modelo) cuyo error también se traduce a 409.
 *  - Producto con tiene_variantes: el código DEBE indicar idvariante (400 VARIANTE_REQUERIDA), igual que
 *    una línea de venta/compra: una lectura del POS sin variante no se podría usar. Producto sin
 *    variantes: idvariante prohibido (400 VARIANTE_NO_PERMITIDA). La variante debe ser de ESE producto
 *    y estar habilitada (400 VARIANTE_INVALIDA).
 *  - producto_presentacion.codigo_barras (código a nivel presentación) NO cambia: sigue sirviendo para
 *    productos sin variantes y se resuelve en el mismo lookup (fuente "producto_presentacion").
 */

const errorBarcodeInvalido = (message) => errorDeNegocio(400, message, "BARCODE_INVALIDO");

// texto trim 1..100 (el barcode lo escanea un lector: sin espacios alrededor). Nada de castear arrays/objetos.
const normalizarBarcode = (valor) => {
  if (typeof valor !== "string") throw errorBarcodeInvalido("El código de barras debe ser un texto");
  const barcode = valor.trim();
  if (barcode === "") throw errorBarcodeInvalido("El código de barras no puede estar vacío");
  if (barcode.length > 100) throw errorBarcodeInvalido("El código de barras no puede superar 100 caracteres");
  return barcode;
};

const normalizarTipo = (valor) => {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  if (typeof valor !== "string" || valor.trim().length > 30) {
    throw errorBarcodeInvalido("El tipo debe ser un texto de máximo 30 caracteres");
  }
  return valor.trim() === "" ? null : valor.trim();
};

const normalizarEstado = (valor) => {
  if (valor === undefined) return undefined;
  if (valor === true || valor === 1 || valor === "true" || valor === "1") return 1;
  if (valor === false || valor === 0 || valor === "false" || valor === "0") return 0;
  throw errorDeNegocio(400, "El estado debe ser verdadero o falso");
};

const normalizarIdRequerido = (valor, campo) => {
  if (!esIdEstricto(valor)) throw errorDeNegocio(400, `${campo} debe ser un ID numérico`);
  return Number(valor);
};

const INCLUDE_VARIANTE = {
  association: "Variante",
  required: false,
  include: [
    { association: "Talla", attributes: ["_id", "nombre", "tipo"], required: false },
    { association: "Color", attributes: ["_id", "nombre", "hex"], required: false },
  ],
};

// { idvariante, sku, estado, talla, color } (misma forma que "variantes" del producto)
const resumenVariante = (v) => ({
  idvariante: v.idvariante,
  sku: v.sku ?? null,
  estado: v.estado,
  talla: v.Talla ? { id: v.Talla._id, nombre: v.Talla.nombre, tipo: v.Talla.tipo } : null,
  color: v.Color ? { id: v.Color._id, nombre: v.Color.nombre, hex: v.Color.hex ?? null } : null,
});

// idvariante siempre presente (null si no tiene); `variante` solo cuando hay variante.
const toDTO = (b) => ({
  idbarcode: b.idbarcode,
  barcode: b.barcode,
  tipo: b.tipo ?? null,
  estado: b.estado,
  idprodPresenta: b.idprodPresenta,
  idvariante: b.idvariante ?? null,
  ...(b.Variante ? { variante: resumenVariante(b.Variante) } : {}),
});

// ─── Validaciones con locks (alta/edición) ───────────────────────────────────

// Producto/variante bajo el protocolo de locks de variantes (helpers/variante-helper.js): producto
// compartido -> variante FOR UPDATE. `exigirActiva`: alta o cambio de variante (una variante ya
// asociada y luego deshabilitada no impide editar el tipo, p. ej.).
const resolverVariante = async (producto, codigoprod, idvarianteCrudo, exigirActiva, transaction) => {
  const idvariante = normalizarIdVariante(idvarianteCrudo);
  const tiene = Boolean(producto.tiene_variantes);
  const nombre = producto.nombre ? `"${producto.nombre}"` : `#${codigoprod}`;

  if (tiene && idvariante === null) {
    throw errorDeNegocio(
      400,
      `El producto ${nombre} maneja variantes: el código de barras debe indicar idvariante`,
      "VARIANTE_REQUERIDA",
      [{ codigoprod }],
    );
  }
  if (!tiene && idvariante !== null) {
    throw errorDeNegocio(
      400,
      `El producto ${nombre} no maneja variantes: no se debe enviar idvariante`,
      "VARIANTE_NO_PERMITIDA",
      [{ codigoprod, idvariante }],
    );
  }
  if (idvariante === null) return null;

  const variante = await models.ProductoVariante.findOne({
    where: { idvariante, codigoprod },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!variante) {
    throw errorDeNegocio(
      400,
      `La variante ${idvariante} no existe o no pertenece al producto ${codigoprod}`,
      "VARIANTE_INVALIDA",
      [{ codigoprod, idvariante }],
    );
  }
  if (exigirActiva && Number(variante.estado) !== 1) {
    throw errorDeNegocio(
      400,
      `La variante ${idvariante} del producto ${codigoprod} está deshabilitada`,
      "VARIANTE_INVALIDA",
      [{ codigoprod, idvariante }],
    );
  }
  return idvariante;
};

// Presentación activa de un producto activo, con el producto bloqueado (compartido) y leído fresco.
const cargarPresentacionYProducto = async (idprodPresenta, transaction) => {
  const pp = await models.ProductoPresentacion.findByPk(idprodPresenta, { transaction });
  if (!pp || Number(pp.estado) !== 1) {
    throw errorDeNegocio(404, "Presentación no encontrada");
  }
  const producto = await bloquearProductoCompartido(pp.codigoprod, transaction);
  validarProductoActivo(producto, pp.codigoprod);
  return { pp, producto };
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

const getBarcodesFtr = async (query = {}) => {
  const where = {};
  if (query.idprodPresenta !== undefined && query.idprodPresenta !== "") {
    where.idprodPresenta = normalizarIdRequerido(query.idprodPresenta, "idprodPresenta");
  }
  if (query.idvariante !== undefined && query.idvariante !== "") {
    where.idvariante = normalizarIdRequerido(query.idvariante, "idvariante");
  }
  if (query.estado !== undefined && query.estado !== "") {
    where.estado = normalizarEstado(query.estado);
  }
  const include = [INCLUDE_VARIANTE];
  if (query.codigoprod !== undefined && query.codigoprod !== "") {
    include.push({
      association: "ProductoPresentacion",
      attributes: ["idprodPresenta", "codigoprod"],
      where: { codigoprod: normalizarIdRequerido(query.codigoprod, "codigoprod") },
      required: true,
    });
  }

  const options = { where, include, order: [["idbarcode", "DESC"]] };
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  if (hasPagination) {
    // page >= 1; limit por defecto 20, entre 1 y 200 (negativo/cero/NaN nunca llegan a LIMIT)
    const pageNum = parseInt(query.page);
    const limitNum = parseInt(query.limit);
    const page = Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum >= 1 ? Math.min(limitNum, 200) : 20;
    options.limit = limit;
    options.offset = (page - 1) * limit;
    const { count, rows } = await models.Barcode.findAndCountAll(options);
    return {
      data: rows.map(toDTO),
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }
  const { count, rows } = await models.Barcode.findAndCountAll(options);
  return { data: rows.map(toDTO), meta: { total: count } };
};

const getBarcodeFtr = async (id) => {
  const barcode = await models.Barcode.findByPk(normalizarIdRequerido(id, "id"), { include: [INCLUDE_VARIANTE] });
  if (!barcode) throw errorDeNegocio(404, "Código de barras no encontrado");
  return toDTO(barcode);
};

const createBarcodeFtr = async (body = {}) => {
  const barcode = normalizarBarcode(body.barcode);
  const tipo = normalizarTipo(body.tipo);
  const idprodPresenta = normalizarIdRequerido(body.idprodPresenta, "idprodPresenta");
  // Formato de idvariante antes de abrir la transacción (400 sin tocar la BD)
  normalizarIdVariante(body.idvariante);

  const transaction = await models.sequelize.transaction();
  try {
    const { pp, producto } = await cargarPresentacionYProducto(idprodPresenta, transaction);
    const idvariante = await resolverVariante(producto, pp.codigoprod, body.idvariante, true, transaction);
    await validarBarcodeUnico(barcode, null, transaction);

    const creado = await models.Barcode.create(
      { barcode, tipo: tipo ?? null, estado: 1, idprodPresenta, idvariante },
      { transaction },
    );
    await transaction.commit();
    return getBarcodeFtr(creado.idbarcode);
  } catch (error) {
    await transaction.rollback();
    throw traducirErrorDeBarcode(error);
  }
};

// Editable: barcode, tipo, estado, idvariante. La presentación no cambia (se crea otro código).
const updateBarcodeFtr = async (id, body = {}) => {
  const idbarcode = normalizarIdRequerido(id, "id");
  const cambios = {};
  if (body.barcode !== undefined) cambios.barcode = normalizarBarcode(body.barcode);
  const tipo = normalizarTipo(body.tipo);
  if (tipo !== undefined) cambios.tipo = tipo;
  const estado = normalizarEstado(body.estado);
  if (estado !== undefined) cambios.estado = estado;
  if (body.idvariante !== undefined) normalizarIdVariante(body.idvariante);

  const transaction = await models.sequelize.transaction();
  try {
    const fila = await models.Barcode.findByPk(idbarcode, { transaction, lock: transaction.LOCK.UPDATE });
    if (!fila) throw errorDeNegocio(404, "Código de barras no encontrado");

    const pp = await models.ProductoPresentacion.findByPk(fila.idprodPresenta, { transaction });
    const producto = await bloquearProductoCompartido(pp.codigoprod, transaction);

    if (body.idvariante !== undefined) {
      validarProductoActivo(producto, pp.codigoprod);
      const cambiaVariante = (normalizarIdVariante(body.idvariante)) !== (fila.idvariante ?? null);
      cambios.idvariante = await resolverVariante(producto, pp.codigoprod, body.idvariante, cambiaVariante, transaction);
    }

    // Unicidad si cambia el valor o si se reactiva
    const quedaActivo = Boolean(cambios.estado ?? fila.estado);
    const seReactiva = cambios.estado === 1 && !fila.estado;
    if (quedaActivo && (cambios.barcode !== undefined || seReactiva)) {
      await validarBarcodeUnico(cambios.barcode ?? fila.barcode, fila.idbarcode, transaction);
    }

    await fila.update(cambios, { transaction });
    await transaction.commit();
    return getBarcodeFtr(idbarcode);
  } catch (error) {
    await transaction.rollback();
    throw traducirErrorDeBarcode(error);
  }
};

// Baja lógica (estado=0): el código deja de resolverse en el lookup.
const deleteBarcodeFtr = async (id) => {
  const barcode = await models.Barcode.findByPk(normalizarIdRequerido(id, "id"));
  if (!barcode) throw errorDeNegocio(404, "Código de barras no encontrado");
  await barcode.update({ estado: 0 });
  return true;
};

// ─── Lookup (escaneo del POS) ────────────────────────────────────────────────

const INCLUDE_LOOKUP_PRESENTACION = {
  association: "ProductoPresentacion",
  where: { estado: 1 },
  required: true,
  include: [
    { association: "Producto", where: { estado: 1 }, required: true },
    { association: "Presentacion", required: false },
  ],
};

const armarLookup = ({ fuente, barcode, tipo, idbarcode, pp, variante }) => {
  const idvariante = variante ? variante.idvariante : null;
  const tieneVariantes = Boolean(pp.Producto.tiene_variantes);
  return {
    barcode,
    fuente,
    tipo: tipo ?? null,
    ...(idbarcode !== undefined ? { idbarcode } : {}),
    idprodPresenta: pp.idprodPresenta,
    codigoprod: pp.codigoprod,
    producto: { codigoprod: pp.codigoprod, nombre: pp.Producto.nombre, tiene_variantes: tieneVariantes },
    presentacion: {
      idpresentacion: pp.idpresentacion,
      nombre: pp.Presentacion?.nombre ?? null,
      cantidad_base: pp.cantidad_base,
      precio_venta: pp.precio_venta,
    },
    idvariante,
    // Solo con variante: resumen talla/color/sku para llenar la línea del POS
    ...(variante ? { variante: resumenVariante(variante) } : {}),
    // Producto con variantes escaneado por un código SIN variante (código a nivel presentación): el POS
    // debe pedir la variante antes de agregar la línea.
    requiere_variante: tieneVariantes && idvariante === null,
  };
};

/**
 * Resuelve un código escaneado a (presentación, variante). Busca en prod_barcode (activos) y, si no
 * hay, en producto_presentacion.codigo_barras. Solo presentaciones/productos activos. Si hay más de
 * una coincidencia distinta => 409 BARCODE_AMBIGUO (datos viejos duplicados: no se adivina).
 */
const lookupBarcodeFtr = async (valor) => {
  const barcode = normalizarBarcode(valor);

  const filas = await models.Barcode.findAll({
    where: { barcode, estado: 1 },
    include: [INCLUDE_LOOKUP_PRESENTACION, INCLUDE_VARIANTE],
  });
  const candidatos = filas.map((b) => ({
    fuente: "prod_barcode",
    barcode: b.barcode,
    tipo: b.tipo,
    idbarcode: b.idbarcode,
    pp: b.ProductoPresentacion,
    variante: b.Variante || null,
  }));

  const presentaciones = await models.ProductoPresentacion.findAll({
    where: { codigo_barras: barcode, estado: 1 },
    include: [
      { association: "Producto", where: { estado: 1 }, required: true },
      { association: "Presentacion", required: false },
    ],
  });
  for (const pp of presentaciones) {
    candidatos.push({ fuente: "producto_presentacion", barcode: pp.codigo_barras, tipo: null, pp, variante: null });
  }

  // Misma (presentación, variante) por dos fuentes no es ambigüedad: se queda la de prod_barcode.
  const vistos = new Map();
  for (const c of candidatos) {
    const clave = `${c.pp.idprodPresenta}:${c.variante ? c.variante.idvariante : 0}`;
    if (!vistos.has(clave)) vistos.set(clave, c);
  }
  if (vistos.size === 0) {
    throw errorDeNegocio(404, "Código de barras no encontrado", "BARCODE_NO_ENCONTRADO");
  }
  if (vistos.size > 1) {
    throw errorDeNegocio(
      409,
      `El código de barras ${barcode} corresponde a más de un producto/variante`,
      "BARCODE_AMBIGUO",
      [...vistos.values()].map((c) => ({
        idprodPresenta: c.pp.idprodPresenta,
        idvariante: c.variante ? c.variante.idvariante : null,
      })),
    );
  }

  const [candidato] = vistos.values();
  if (candidato.variante && Number(candidato.variante.estado) !== 1) {
    throw errorDeNegocio(
      400,
      `La variante ${candidato.variante.idvariante} asociada a este código está deshabilitada`,
      "VARIANTE_INVALIDA",
      [{ codigoprod: candidato.pp.codigoprod, idvariante: candidato.variante.idvariante }],
    );
  }
  return armarLookup(candidato);
};

module.exports = {
  getBarcodesFtr,
  getBarcodeFtr,
  createBarcodeFtr,
  updateBarcodeFtr,
  deleteBarcodeFtr,
  lookupBarcodeFtr,
};
