const { Op } = require("sequelize");
const models = require("../../models/mysql");
const { obtenerPrecioCorrecto } = require("../../helpers/precio-helper");
const { esIdEstricto } = require("../../utils/ids");

const errorDeNegocio = (status, message, code, detalles) => {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  if (detalles) error.detalles = detalles;
  return error;
};

// idvariante de un precio (CRUD suelto): undefined/null => null (precio genérico). Si viene, debe ser un
// ID estricto de una variante de ESTE producto (el de la presentación) y el producto debe manejar variantes.
// Con `exigirActiva` (precio nuevo o que cambia de variante) la variante debe estar habilitada.
// Sin locks: acá es un INSERT/UPDATE suelto; el flujo con locks es el de productos (nested precios[]).
const resolverVarianteDePrecio = async (idprodPresenta, idvarianteCrudo, exigirActiva) => {
  if (idvarianteCrudo === undefined || idvarianteCrudo === null) return null;
  if (!esIdEstricto(idvarianteCrudo)) {
    throw errorDeNegocio(400, "idvariante debe ser un ID numérico", "PRECIO_VARIANTE_INVALIDA");
  }
  const idvariante = Number(idvarianteCrudo);
  const pp = await models.ProductoPresentacion.findByPk(idprodPresenta, { include: ["Producto"] });
  if (!pp) throw errorDeNegocio(404, "Producto presentación no encontrado");
  if (!pp.Producto?.tiene_variantes) {
    throw errorDeNegocio(
      400,
      "El producto no maneja variantes: el precio no puede indicar idvariante",
      "PRECIO_VARIANTE_NO_PERMITIDA",
      [{ codigoprod: pp.codigoprod, idvariante }],
    );
  }
  const variante = await models.ProductoVariante.findOne({ where: { idvariante, codigoprod: pp.codigoprod } });
  if (!variante) {
    throw errorDeNegocio(
      400,
      `La variante ${idvariante} no existe o no pertenece al producto ${pp.codigoprod}`,
      "PRECIO_VARIANTE_INVALIDA",
      [{ codigoprod: pp.codigoprod, idvariante }],
    );
  }
  if (exigirActiva && Number(variante.estado) !== 1) {
    throw errorDeNegocio(
      400,
      `La variante ${idvariante} del producto ${pp.codigoprod} está deshabilitada`,
      "PRECIO_VARIANTE_INVALIDA",
      [{ codigoprod: pp.codigoprod, idvariante }],
    );
  }
  return idvariante;
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

const getPreciosFtr = async (query) => {
  const { idprodPresenta } = query;
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = {};

  if (idprodPresenta) {
    where.idprodPresenta = idprodPresenta;
  }

  let findOptions = {
    where,
    include: [{ model: models.TipoCliente, as: "TipoCliente" }],
    order: [["idprecios", "DESC"]],
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Precio.findAndCountAll(findOptions);
    return {
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Precio.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
};

const getPrecioFtr = async (id) => {
  const precio = await models.Precio.findByPk(id, {
    include: [{ model: models.TipoCliente, as: "TipoCliente" }],
  });
  if (!precio) {
    const error = new Error("Precio no encontrado");
    error.status = 404;
    throw error;
  }
  return precio;
};

const createPrecioFtr = async (body) => {
  // Validar que ProductoPresentacion existe
  const pp = await models.ProductoPresentacion.findByPk(body.idprodPresenta);
  if (!pp) {
    const error = new Error("Producto presentación no encontrado");
    error.status = 404;
    throw error;
  }

  // Validar que TipoCliente existe
  const tc = await models.TipoCliente.findByPk(body.idtipoCli);
  if (!tc) {
    const error = new Error("Tipo de cliente no encontrado");
    error.status = 404;
    throw error;
  }

  // Precio por variante (opcional): se valida y normaliza; sin la clave el alta es la de siempre.
  const data = { ...body };
  if (body.idvariante !== undefined) {
    data.idvariante = await resolverVarianteDePrecio(body.idprodPresenta, body.idvariante, true);
  }
  return await models.Precio.create(data);
};

const updatePrecioFtr = async (id, body) => {
  const precio = await getPrecioFtr(id);
  const data = { ...body };
  // La presentación y/o la variante cambian: el resultado final debe ser coherente (la variante
  // debe ser del producto de la presentación final). Solo se exige variante activa si CAMBIA de variante.
  if (body.idvariante !== undefined || body.idprodPresenta !== undefined) {
    const idprodFinal = body.idprodPresenta !== undefined ? body.idprodPresenta : precio.idprodPresenta;
    const idvarFinal = body.idvariante !== undefined ? body.idvariante : precio.idvariante;
    // Number() para que "5" (texto) y 5 guardado no cuenten como cambio; un valor inválido (NaN) sí
    // cuenta como cambio y lo rechaza resolverVarianteDePrecio con 400.
    const cambiaVariante = body.idvariante !== undefined &&
      (body.idvariante === null ? null : Number(body.idvariante)) !== (precio.idvariante ?? null);
    const idvariante = await resolverVarianteDePrecio(idprodFinal, idvarFinal, cambiaVariante);
    if (body.idvariante !== undefined) data.idvariante = idvariante;
  }
  await precio.update(data);
  return precio;
};

const deletePrecioFtr = async (id) => {
  const precio = await getPrecioFtr(id);
  await precio.update({ estado: 0 });
  return true;
};

// ─── Endpoint de consulta rápida (by-presentacion) ──────────────────────────

// `idvariante` opcional: con él se resuelve variante -> genérico -> precio_venta (ver precio-helper).
// Sin él, igual que siempre (solo precios genéricos).
const getPrecioByPresentacionFtr = async (idprodPresenta, idtipoCli, idvariante = null) => {
  return await obtenerPrecioCorrecto(idprodPresenta, idtipoCli, 1, idvariante);
};

// ─── Precios por producto (busca todas las presentaciones del producto) ────

const getPreciosByProductoFtr = async (codigoprod) => {
  // Obtener todas las presentaciones del producto
  const presentaciones = await models.ProductoPresentacion.findAll({
    where: { codigoprod },
    attributes: ["idprodPresenta"],
  });

  if (!presentaciones.length) return [];

  const idsPresenta = presentaciones.map((p) => p.idprodPresenta);

  // Buscar precios para esas presentaciones
  const precios = await models.Precio.findAll({
    where: { idprodPresenta: { [Op.in]: idsPresenta } },
    include: [
      { model: models.TipoCliente, as: "TipoCliente" },
      {
        model: models.ProductoPresentacion,
        as: "ProductoPresentacion",
        include: [{ model: models.Presentacion, as: "Presentacion" }],
      },
    ],
    order: [["idprecios", "DESC"]],
  });

  return precios;
};

module.exports = {
  getPreciosFtr,
  getPrecioFtr,
  createPrecioFtr,
  updatePrecioFtr,
  deletePrecioFtr,
  getPrecioByPresentacionFtr,
  getPreciosByProductoFtr,
};
