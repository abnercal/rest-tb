const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql");
const { sucursalScope, assertMismaSucursal } = require("../../utils/scope");
const { errorDeNegocio } = require("../../helpers/variante-helper");
const { calcularArqueo, aCentavos, decimalDeCentavos } = require("../../helpers/caja-helper");

/**
 * Caja registradora.
 *
 *  - Cajas (catálogo por sucursal): CRUD con baja lógica (`estado`).
 *  - Sesiones: apertura -> movimientos/cobros -> cierre con arqueo.
 *  - Movimientos: libro append-only (no se editan ni se borran; un error se compensa con otro movimiento).
 *
 * Concurrencia (orden de locks completo en helpers/caja-helper.js):
 *  - apertura: lock compartido de la caja + UNIQUE parcial en BD (una sola sesión ABIERTA por caja);
 *  - baja/desactivación de caja: lock exclusivo de la caja y chequeo de sesión abierta;
 *  - cierre: la sesión es el PRIMER statement (FOR UPDATE), así el arqueo ve todo cobro ya confirmado;
 *  - movimientos: lock compartido de la sesión (el cierre espera a que commiteen).
 */

const INCLUDE_USUARIO = (as) => ({ association: as, attributes: ["_id", "nombre", "apellido", "username"], required: false });

// ───── helpers ─────

const noEncontrada = (code, message) => errorDeNegocio(404, message, code);

const paginar = (query) => {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  return { hasPagination, page, limit };
};

/** Bloque { data, meta } con el mismo formato que el resto de los listados. */
const armarLista = ({ rows, count, hasPagination, page, limit }) =>
  hasPagination
    ? { data: rows, meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit } }
    : { data: rows, meta: { total: count } };

/** `where` de Caja por sucursal: no-superadmin solo la suya; superadmin puede filtrar con ?idsucursal. */
const whereCajaPorSucursal = (user, query = {}) => {
  const scope = sucursalScope(user);
  if (scope.idsucursal !== undefined) return scope;
  return query.idsucursal !== undefined && query.idsucursal !== "" ? { idsucursal: Number(query.idsucursal) } : {};
};

/** "2026-11-12" -> inicio/fin de ese día; un timestamp completo se usa tal cual. */
const limiteDeFecha = (valor, extremo) => {
  const m = moment(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return m.toDate();
  return (extremo === "inicio" ? m.startOf("day") : m.endOf("day")).toDate();
};

const conTransaccion = async (fn) => {
  const transaction = await models.sequelize.transaction();
  try {
    const resultado = await fn(transaction);
    await transaction.commit();
    return resultado;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/** true / 1 / "true" / "1" -> 1; el resto (false, 0, "false", "0") -> 0. La columna es INT: nunca se escribe el texto. */
const estadoANumero = (v) => (v === true || v === 1 || v === "true" || v === "1" ? 1 : 0);

const handleUniqueCaja = (error) => {
  if (error.name === "SequelizeUniqueConstraintError") {
    return errorDeNegocio(409, "Ya existe una caja con ese nombre en la sucursal", "CAJA_DUPLICADA");
  }
  return error;
};

// ───── cajas (catálogo) ─────

const getCajasFtr = async (query, user) => {
  const where = whereCajaPorSucursal(user, query);
  if (query.search) where.nombre = { [Op.like]: `%${query.search}%` };
  if (query.estado !== undefined && query.estado !== "") where.estado = query.estado === "true" ? 1 : query.estado === "false" ? 0 : Number(query.estado);

  const { hasPagination, page, limit } = paginar(query);
  const options = {
    where,
    include: [{ association: "Sucursal", attributes: ["idsucursal", "nombre"], required: false }],
    order: [["idsucursal", "ASC"], ["nombre", "ASC"]],
    ...(hasPagination && { limit, offset: (page - 1) * limit }),
  };
  const { count, rows } = await models.Caja.findAndCountAll(options);
  return armarLista({ rows, count, hasPagination, page, limit });
};

const getCajaFtr = async (id, user, transaction) => {
  const caja = await models.Caja.findByPk(id, {
    include: [{ association: "Sucursal", attributes: ["idsucursal", "nombre"], required: false }],
    transaction,
  });
  if (!caja) throw noEncontrada("CAJA_NO_ENCONTRADA", "Caja no encontrada");
  assertMismaSucursal(caja, user);
  return caja;
};

const createCajaFtr = async (body, user) => {
  // No-superadmin: siempre su sucursal (se ignora la del body). Superadmin: la del body o, si falta, la suya.
  const scope = sucursalScope(user);
  const idsucursal = scope.idsucursal ?? body.idsucursal ?? user?.idsucursal;
  if (idsucursal === undefined || idsucursal === null) {
    throw errorDeNegocio(400, "La sucursal es obligatoria", "SUCURSAL_REQUERIDA");
  }
  const sucursal = await models.Sucursal.findByPk(idsucursal);
  if (!sucursal) throw errorDeNegocio(404, "Sucursal no encontrada", "SUCURSAL_NO_ENCONTRADA");

  try {
    const caja = await models.Caja.create({
      nombre: body.nombre,
      idsucursal,
      ...(body.estado !== undefined && { estado: estadoANumero(body.estado) }),
    });
    return caja;
  } catch (error) {
    throw handleUniqueCaja(error);
  }
};

/** ¿La caja tiene una sesión ABIERTA? (consulta bajo el lock de la caja que ya tiene el caller). */
const sesionAbiertaDe = (idcaja, transaction) =>
  models.CajaSesion.findOne({ where: { idcaja, estado: "ABIERTA" }, transaction });

const bloquearCajaParaCambio = async (id, user, transaction) => {
  const caja = await models.Caja.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!caja) throw noEncontrada("CAJA_NO_ENCONTRADA", "Caja no encontrada");
  assertMismaSucursal(caja, user);
  return caja;
};

const errorCajaConSesionAbierta = (sesion) =>
  errorDeNegocio(
    409,
    "La caja tiene una sesión abierta: cerrala antes de desactivarla",
    "CAJA_CON_SESION_ABIERTA",
    [{ idsesion: sesion.idsesion }],
  );

const updateCajaFtr = async (id, body, user) => {
  await conTransaccion(async (transaction) => {
    const caja = await bloquearCajaParaCambio(id, user, transaction);

    const data = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.estado !== undefined) {
      data.estado = estadoANumero(body.estado);
    }
    // Desactivar una caja con sesión abierta dejaría cobros sin caja operativa
    if (data.estado === 0 && Number(caja.estado) !== 0) {
      const abierta = await sesionAbiertaDe(caja.idcaja, transaction);
      if (abierta) throw errorCajaConSesionAbierta(abierta);
    }
    try {
      await caja.update(data, { transaction });
    } catch (error) {
      throw handleUniqueCaja(error);
    }
  });
  return getCajaFtr(id, user);
};

const delCajaFtr = async (id, user) => {
  await conTransaccion(async (transaction) => {
    const caja = await bloquearCajaParaCambio(id, user, transaction);
    const abierta = await sesionAbiertaDe(caja.idcaja, transaction);
    if (abierta) throw errorCajaConSesionAbierta(abierta);
    await caja.update({ estado: 0 }, { transaction });
  });
  return true;
};

// ───── sesiones ─────

const INCLUDE_SESION = () => [
  { association: "Caja", attributes: ["idcaja", "nombre", "idsucursal"], required: false },
  INCLUDE_USUARIO("UsuarioApertura"),
  INCLUDE_USUARIO("UsuarioCierre"),
];

/** Sesión + validación de sucursal (404 si es de otra). Sin lock: solo lectura. */
const cargarSesion = async (id, user, transaction, lock) => {
  const sesion = await models.CajaSesion.findByPk(id, { transaction, ...(lock && { lock }) });
  if (!sesion) throw noEncontrada("SESION_NO_ENCONTRADA", "Sesión de caja no encontrada");
  const caja = await models.Caja.findByPk(sesion.idcaja, { transaction });
  assertMismaSucursal(caja, user);
  return { sesion, caja };
};

const getSesionFtr = async (id, user, transaction) => {
  const sesion = await models.CajaSesion.findByPk(id, { include: INCLUDE_SESION(), transaction });
  if (!sesion) throw noEncontrada("SESION_NO_ENCONTRADA", "Sesión de caja no encontrada");
  assertMismaSucursal(sesion.Caja ?? (await models.Caja.findByPk(sesion.idcaja, { transaction })), user);
  return sesion;
};

const abrirCajaFtr = async (idcaja, body, user) => {
  const idsesion = await conTransaccion(async (transaction) => {
    // Lock compartido de la caja: serializa contra desactivarla/darla de baja (que la toman exclusiva).
    const caja = await models.Caja.findByPk(idcaja, { transaction, lock: transaction.LOCK.SHARE });
    if (!caja) throw noEncontrada("CAJA_NO_ENCONTRADA", "Caja no encontrada");
    assertMismaSucursal(caja, user);
    if (Number(caja.estado) !== 1) throw errorDeNegocio(409, "La caja está inactiva", "CAJA_INACTIVA");

    const yaAbierta = await sesionAbiertaDe(caja.idcaja, transaction);
    if (yaAbierta) {
      throw errorDeNegocio(409, "La caja ya tiene una sesión abierta", "CAJA_YA_ABIERTA", [{ idsesion: yaAbierta.idsesion }]);
    }

    // Un usuario solo puede tener UNA sesión abierta por sucursal: así el cobro sin idcaja nunca es ambiguo
    // (SESION_AMBIGUA queda solo como defensa para datos preexistentes). Lectura sin lock dentro de la
    // transacción: dos aperturas simultáneas del MISMO usuario en cajas DISTINTAS pueden colarse las dos
    // (no hay UNIQUE que lo impida); es una carrera aceptada y, si ocurre, SESION_AMBIGUA la hace visible.
    const cajasDeLaSucursal = await models.Caja.findAll({ attributes: ["idcaja"], where: { idsucursal: caja.idsucursal }, transaction });
    const propia = await models.CajaSesion.findOne({
      where: { estado: "ABIERTA", idusuario_apertura: user.id, idcaja: { [Op.in]: cajasDeLaSucursal.map((c) => c.idcaja) } },
      transaction,
    });
    if (propia) {
      throw errorDeNegocio(
        409,
        "El usuario ya tiene una sesión de caja abierta en esta sucursal: cerrala antes de abrir otra",
        "USUARIO_CON_SESION_ABIERTA",
        [{ idsesion: propia.idsesion, idcaja: propia.idcaja }],
      );
    }

    try {
      const sesion = await models.CajaSesion.create(
        {
          idcaja: caja.idcaja,
          idusuario_apertura: user.id,
          monto_apertura: decimalDeCentavos(aCentavos(body.monto_apertura)),
          fecha_apertura: new Date(),
          estado: "ABIERTA",
          observaciones: body.observaciones ?? null,
        },
        { transaction },
      );
      return sesion.idsesion;
    } catch (error) {
      // UNIQUE parcial (idcaja_abierta): otra apertura simultánea ganó la carrera
      if (error.name === "SequelizeUniqueConstraintError") {
        throw errorDeNegocio(409, "La caja ya tiene una sesión abierta", "CAJA_YA_ABIERTA");
      }
      throw error;
    }
  });
  return getSesionFtr(idsesion, user);
};

/**
 * Sesión ABIERTA con su resumen en vivo.
 *  - con ?idcaja: la sesión abierta de esa caja (de la sucursal del usuario);
 *  - sin idcaja: la sesión abierta del usuario (si tiene más de una: 409 SESION_AMBIGUA, enviar idcaja).
 */
const getSesionActualFtr = async (query, user) => {
  return conTransaccion(async (transaction) => {
    const where = { estado: "ABIERTA" };
    let idcaja = null;
    if (query.idcaja !== undefined && query.idcaja !== "") {
      idcaja = Number(query.idcaja);
      const caja = await models.Caja.findByPk(idcaja, { transaction });
      if (!caja) throw noEncontrada("CAJA_NO_ENCONTRADA", "Caja no encontrada");
      assertMismaSucursal(caja, user);
      where.idcaja = idcaja;
    } else {
      where.idusuario_apertura = user.id;
    }

    const sesiones = await models.CajaSesion.findAll({ where, order: [["idsesion", "ASC"]], transaction });
    if (sesiones.length === 0) throw noEncontrada("SESION_NO_ENCONTRADA", "No hay una sesión de caja abierta");
    if (sesiones.length > 1) {
      throw errorDeNegocio(409, "Hay más de una sesión abierta: enviá idcaja", "SESION_AMBIGUA", sesiones.map((s) => ({ idsesion: s.idsesion, idcaja: s.idcaja })));
    }

    const sesion = await getSesionFtr(sesiones[0].idsesion, user, transaction);
    const { arqueo } = await calcularArqueo(sesion, transaction);
    return { ...sesion.toJSON(), arqueo };
  });
};

const getSesionesFtr = async (query, user) => {
  const where = {};
  if (query.idcaja !== undefined && query.idcaja !== "") where.idcaja = Number(query.idcaja);
  if (query.estado !== undefined && query.estado !== "") where.estado = String(query.estado).toUpperCase();
  if (query.idusuario !== undefined && query.idusuario !== "") where.idusuario_apertura = Number(query.idusuario);

  // desde/hasta (fecha_apertura): una fecha sola (YYYY-MM-DD) abarca el día completo
  const rango = {};
  if (query.desde) rango[Op.gte] = limiteDeFecha(query.desde, "inicio");
  if (query.hasta) rango[Op.lte] = limiteDeFecha(query.hasta, "fin");
  if (Reflect.ownKeys(rango).length) where.fecha_apertura = rango;

  // Alcance por sucursal vía la caja (belongsTo: el LIMIT no sufre el problema de hasMany)
  const cajaWhere = whereCajaPorSucursal(user, query);
  const { hasPagination, page, limit } = paginar(query);
  const { count, rows } = await models.CajaSesion.findAndCountAll({
    where,
    include: [
      {
        association: "Caja",
        attributes: ["idcaja", "nombre", "idsucursal"],
        required: true,
        ...(Object.keys(cajaWhere).length && { where: cajaWhere }),
      },
      INCLUDE_USUARIO("UsuarioApertura"),
      INCLUDE_USUARIO("UsuarioCierre"),
    ],
    order: [["fecha_apertura", "DESC"], ["idsesion", "DESC"]],
    ...(hasPagination && { limit, offset: (page - 1) * limit }),
  });
  return armarLista({ rows, count, hasPagination, page, limit });
};

const estadoSesion = (sesion) => String(sesion.estado);

const errorSesionNoAbierta = (sesion) =>
  errorDeNegocio(409, "La sesión de caja no está abierta", "SESION_NO_ABIERTA", [{ idsesion: sesion.idsesion, estado: estadoSesion(sesion) }]);

const cerrarSesionFtr = async (id, body, user) => {
  const resultado = await conTransaccion(async (transaction) => {
    // PRIMER statement: lock exclusivo de la sesión. Espera a los cobros/movimientos en vuelo (que la
    // tienen compartida) y, al obtenerlo, el snapshot de las lecturas siguientes ya incluye todo lo confirmado.
    const { sesion } = await cargarSesion(id, user, transaction, transaction.LOCK.UPDATE);
    if (estadoSesion(sesion) !== "ABIERTA") throw errorSesionNoAbierta(sesion);

    const { arqueo, esperadoCentavos } = await calcularArqueo(sesion, transaction);
    const contadoCentavos = aCentavos(body.monto_contado);
    const diferenciaCentavos = contadoCentavos - esperadoCentavos;

    await sesion.update(
      {
        monto_esperado: decimalDeCentavos(esperadoCentavos),
        monto_contado: decimalDeCentavos(contadoCentavos),
        diferencia: decimalDeCentavos(diferenciaCentavos),
        idusuario_cierre: user.id,
        fecha_cierre: new Date(),
        estado: "CERRADA",
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
      },
      { transaction },
    );

    return {
      idsesion: sesion.idsesion,
      arqueo: { ...arqueo, estado: "CERRADA" },
      monto_contado: contadoCentavos / 100,
      diferencia: diferenciaCentavos / 100,
    };
  });

  const sesion = await getSesionFtr(resultado.idsesion, user);
  return {
    ...sesion.toJSON(),
    arqueo: { ...resultado.arqueo, monto_contado: resultado.monto_contado, diferencia: resultado.diferencia },
  };
};

const getArqueoFtr = async (id, user) => {
  return conTransaccion(async (transaction) => {
    // Lecturas dentro de una sola transacción: sesión + agregados ven el mismo snapshot
    const { sesion } = await cargarSesion(id, user, transaction);
    const { arqueo } = await calcularArqueo(sesion, transaction);
    if (estadoSesion(sesion) === "CERRADA") {
      return {
        ...arqueo,
        monto_contado: sesion.monto_contado === null ? null : Number(sesion.monto_contado),
        diferencia: sesion.diferencia === null ? null : Number(sesion.diferencia),
        monto_esperado_al_cierre: sesion.monto_esperado === null ? null : Number(sesion.monto_esperado),
      };
    }
    return arqueo;
  });
};

// ───── movimientos ─────

const crearMovimientoFtr = async (idsesion, body, user) => {
  const idmovimiento = await conTransaccion(async (transaction) => {
    // Lock compartido de la sesión: el cierre (FOR UPDATE) espera a que este movimiento commitee
    const { sesion } = await cargarSesion(idsesion, user, transaction, transaction.LOCK.SHARE);
    if (estadoSesion(sesion) !== "ABIERTA") throw errorSesionNoAbierta(sesion);

    const movimiento = await models.CajaMovimiento.create(
      {
        tipo: body.tipo,
        concepto: body.concepto,
        importe: decimalDeCentavos(aCentavos(body.importe)),
        descripcion: body.descripcion ?? null,
        referencia: body.referencia ?? null,
        fecha: new Date(),
        idsesion: sesion.idsesion,
        idusuario: user.id,
      },
      { transaction },
    );
    return movimiento.idmovimiento;
  });
  return models.CajaMovimiento.findByPk(idmovimiento, { include: [INCLUDE_USUARIO("Usuario")] });
};

const getMovimientosFtr = async (idsesion, query, user) => {
  await cargarSesion(idsesion, user);
  const where = { idsesion };
  if (query.tipo) where.tipo = String(query.tipo).toUpperCase();

  const { hasPagination, page, limit } = paginar(query);
  const { count, rows } = await models.CajaMovimiento.findAndCountAll({
    where,
    include: [INCLUDE_USUARIO("Usuario")],
    order: [["fecha", "ASC"], ["idmovimiento", "ASC"]],
    ...(hasPagination && { limit, offset: (page - 1) * limit }),
  });
  return armarLista({ rows, count, hasPagination, page, limit });
};

module.exports = {
  getCajasFtr,
  getCajaFtr,
  createCajaFtr,
  updateCajaFtr,
  delCajaFtr,
  abrirCajaFtr,
  getSesionActualFtr,
  getSesionesFtr,
  getSesionFtr,
  cerrarSesionFtr,
  getArqueoFtr,
  crearMovimientoFtr,
  getMovimientosFtr,
};
