/**
 * Caja registradora: atribución de cobros/pagos a la sesión de caja y cálculo del arqueo.
 *
 * Modelo (decisiones de negocio):
 *  - Un pago de venta / de compra "cuenta como cobrado" SOLO si su estado es "Pagado"
 *    (el Pago inicial de una venta nace "Pendiente" y NO cuenta).
 *  - El pago se asigna a la sesión ABIERTA en el MOMENTO DEL COBRO (no al crear la orden): la sesión
 *    abierta del usuario que cobra (JWT) en la sucursal de la operación; `idcaja` opcional para elegir
 *    la caja. Se guardan `idsesion` + `idusuario` (quien cobra) en el pago.
 *  - Sin sesión abierta: CAJA_OBLIGATORIA=true -> 409 CAJA_NO_ABIERTA (la operación se revierte);
 *    por defecto (false) el pago queda con idsesion NULL y la respuesta lleva una `advertencias`
 *    aditiva. La política aplica SOLO a pagos en efectivo con estado Pagado.
 *  - El libro es append-only: los pagos originales NUNCA se modifican. Anular una venta/compra con
 *    efectivo ya cobrado genera un movimiento compensatorio en la sesión abierta ACTUAL del usuario
 *    (venta -> EGRESO "DEVOLUCION"; compra -> INGRESO "DEVOLUCION COMPRA").
 *  - Importes: se suman en SQL (DECIMAL exacto) y toda la aritmética posterior se hace en centavos
 *    enteros; nunca se suman floats.
 *
 * Orden de locks (todas las transacciones lo respetan; ver también helpers/variante-helper.js):
 *
 *   Orden / Compra (FOR UPDATE)  ->  producto (S)  ->  variante (X)  ->  almacen (X)  ->  lote (X)  ->  caja_sesion
 *
 * Los abonos (registrarPagoFtr / registrarPagoCompraFtr) bloquean la Orden/Compra FOR UPDATE como PRIMER
 * statement y recién después resuelven la sesión; las anulaciones ya lo hacían así.
 *
 * La sesión va SIEMPRE al final: los pagos toman LOCK IN SHARE MODE sobre la fila de caja_sesion; el
 * cierre y los movimientos la toman (FOR UPDATE / SHARE) y no piden ningún otro lock después. El cierre
 * toma la sesión como PRIMER statement de su transacción, así que las lecturas del arqueo (snapshot
 * posterior al lock) ven todo pago ya confirmado, y un pago que llegue después ve la sesión CERRADA
 * (nunca queda un pago colgado de una sesión cerrada). En apertura/baja de caja el orden es caja -> sesión.
 */
const { Op, QueryTypes } = require("sequelize");
const models = require("../models/mysql");
const { esIdEstricto } = require("../utils/ids");
const { errorDeNegocio } = require("./variante-helper");

// ───── estado de cobro ─────

const ESTADO_PAGO_COBRADO = "Pagado";

/**
 * ¿El estado del pago es "Pagado"? Insensible a mayúsculas y SIN trim; el SQL de los agregados compara
 * `LOWER(estado) = 'pagado'`, así que ambos criterios coinciden sin depender de la colación de la columna.
 */
const esPagoCobrado = (estado) =>
  typeof estado === "string" && estado.toLowerCase() === ESTADO_PAGO_COBRADO.toLowerCase();

/** CAJA_OBLIGATORIA (env, default false): sin sesión abierta un cobro en efectivo se rechaza (409). */
const cajaObligatoria = () => ["true", "1", "yes"].includes(String(process.env.CAJA_OBLIGATORIA ?? "").toLowerCase());

// ───── dinero en centavos enteros ─────

/** "123.45" | 123.45 | null -> 12345 (centavos enteros). */
const aCentavos = (valor) => Math.round(Number(valor ?? 0) * 100);
/** 12345 -> 123.45 (number). */
const deCentavos = (centavos) => centavos / 100;
/** 12345 -> "123.45" (string exacto para columnas DECIMAL). */
const decimalDeCentavos = (centavos) => (centavos / 100).toFixed(2);

// ───── ids ─────

/** undefined/null/"" -> null; otro valor debe ser un entero positivo estricto (400 CAJA_INVALIDA). */
const normalizarIdCaja = (valor) => {
  if (valor === undefined || valor === null || valor === "") return null;
  if (!esIdEstricto(valor)) throw errorDeNegocio(400, "idcaja debe ser un ID numérico", "CAJA_INVALIDA");
  return Number(valor);
};

// ───── resolución de sesión ─────

/**
 * Sesión ABIERTA del usuario que cobra en la sucursal de la operación, con LOCK IN SHARE MODE
 * (así el cierre —FOR UPDATE— espera a que este cobro commitee y no deja pagos colgados).
 *
 * @param {object} transaction
 * @param {{user:object|null, idsucursal:number, idcaja?:number|string|null}} datos
 * @returns {Promise<object|null>} la fila de caja_sesion bloqueada, o null si no hay sesión abierta
 * @throws 400 CAJA_INVALIDA / 404 CAJA_NO_ENCONTRADA / 400 CAJA_SUCURSAL_INVALIDA / 409 SESION_AMBIGUA
 */
const resolverSesionParaCobro = async (transaction, { user, idsucursal, idcaja } = {}) => {
  const idusuario = user?.id;
  const idcajaN = normalizarIdCaja(idcaja);
  if (idusuario === undefined || idusuario === null || idsucursal === undefined || idsucursal === null) return null;

  let idsCajas;
  if (idcajaN !== null) {
    const caja = await models.Caja.findByPk(idcajaN, { transaction });
    if (!caja) throw errorDeNegocio(404, "Caja no encontrada", "CAJA_NO_ENCONTRADA");
    if (Number(caja.idsucursal) !== Number(idsucursal)) {
      throw errorDeNegocio(400, "La caja no pertenece a la sucursal de la operación", "CAJA_SUCURSAL_INVALIDA");
    }
    idsCajas = [caja.idcaja];
  } else {
    const cajas = await models.Caja.findAll({ attributes: ["idcaja"], where: { idsucursal }, transaction });
    idsCajas = cajas.map((c) => c.idcaja);
    if (idsCajas.length === 0) return null;
  }

  const sesiones = await models.CajaSesion.findAll({
    where: { estado: "ABIERTA", idusuario_apertura: idusuario, idcaja: { [Op.in]: idsCajas } },
    order: [["idsesion", "ASC"]],
    lock: transaction.LOCK.SHARE,
    transaction,
  });
  if (sesiones.length === 0) return null;
  if (sesiones.length > 1) {
    throw errorDeNegocio(
      409,
      "El usuario tiene más de una sesión de caja abierta en la sucursal: enviá idcaja para elegir",
      "SESION_AMBIGUA",
      sesiones.map((s) => ({ idsesion: s.idsesion, idcaja: s.idcaja })),
    );
  }
  return sesiones[0];
};

/** ¿El tipo de pago es efectivo (tipo_pago.es_efectivo = 1)? Un tipo inexistente cuenta como no efectivo. */
const esTipoPagoEfectivo = async (idtipopago, transaction) => {
  if (idtipopago === undefined || idtipopago === null) return false;
  const tipo = await models.TipoPago.findByPk(idtipopago, { transaction });
  return Boolean(tipo && Number(tipo.es_efectivo) === 1);
};

const advertenciaSinSesion = (codigo, mensaje, extra = {}) => ({ code: codigo, codigo, mensaje, ...extra });

/**
 * Qué columnas de caja lleva un pago que se está creando.
 *
 *  - estado distinto de "Pagado": no se cobró nada -> {} (no se toca la BD ni se agrega nada).
 *  - "Pagado" con sesión abierta: { idsesion, idusuario }.
 *  - "Pagado" sin sesión: efectivo + CAJA_OBLIGATORIA -> 409 CAJA_NO_ABIERTA; efectivo -> { idusuario } y
 *    advertencia PAGO_SIN_SESION_DE_CAJA; otro medio (tarjeta/transferencia) -> { idusuario } sin advertencia.
 *
 * Debe llamarse al FINAL de la transacción (después de los locks de stock): ver orden de locks arriba.
 *
 * @param {object} transaction
 * @param {{estado:string, idtipopago:number, user:object|null, idsucursal:number, idcaja?:any}} datos
 * @returns {Promise<{campos:object, advertencias:Array}>}
 */
const atribuirPagoACaja = async (transaction, { estado, idtipopago, user, idsucursal, idcaja }) => {
  if (!esPagoCobrado(estado)) return { campos: {}, advertencias: [] };

  const idusuario = user?.id ?? null;
  const efectivo = await esTipoPagoEfectivo(idtipopago, transaction);

  let sesion = null;
  try {
    sesion = await resolverSesionParaCobro(transaction, { user, idsucursal, idcaja });
  } catch (error) {
    // Un cobro NO efectivo no depende de la caja: la ambigüedad no lo bloquea (queda sin sesión).
    if (efectivo || error.code !== "SESION_AMBIGUA") throw error;
  }

  if (sesion) return { campos: { idsesion: sesion.idsesion, idusuario }, advertencias: [] };

  if (!efectivo) return { campos: { idusuario }, advertencias: [] };

  if (cajaObligatoria()) {
    throw errorDeNegocio(
      409,
      "No hay una sesión de caja abierta para registrar un cobro en efectivo: abrí la caja primero",
      "CAJA_NO_ABIERTA",
    );
  }
  return {
    campos: { idusuario },
    advertencias: [
      advertenciaSinSesion(
        "PAGO_SIN_SESION_DE_CAJA",
        "El pago en efectivo se registró sin sesión de caja abierta: no afecta ningún arqueo de caja.",
      ),
    ],
  };
};

// ───── SQL de agregados (SUM en SQL: DECIMAL exacto) ─────

const SQL_PAGOS_VENTA_POR_TIPO =
  "SELECT tp.idtipopago AS idtipopago, tp.nombre AS nombre, tp.es_efectivo AS es_efectivo, " +
  "COUNT(*) AS operaciones, COALESCE(SUM(p.importe), 0) AS total " +
  "FROM pagos p INNER JOIN tipo_pago tp ON tp.idtipopago = p.idtipopago " +
  "WHERE p.idsesion = :idsesion AND LOWER(p.estado) = :estado " +
  "GROUP BY tp.idtipopago, tp.nombre, tp.es_efectivo ORDER BY tp.idtipopago";

const SQL_PAGOS_COMPRA_POR_TIPO =
  "SELECT tp.idtipopago AS idtipopago, tp.nombre AS nombre, tp.es_efectivo AS es_efectivo, " +
  "COUNT(*) AS operaciones, COALESCE(SUM(pc.importe), 0) AS total " +
  "FROM pagos_compra pc INNER JOIN tipo_pago tp ON tp.idtipopago = pc.idtipopago " +
  "WHERE pc.idsesion = :idsesion AND LOWER(pc.estado) = :estado " +
  "GROUP BY tp.idtipopago, tp.nombre, tp.es_efectivo ORDER BY tp.idtipopago";

const SQL_MOVIMIENTOS_POR_CONCEPTO =
  "SELECT m.tipo AS tipo, m.concepto AS concepto, COUNT(*) AS operaciones, COALESCE(SUM(m.importe), 0) AS total " +
  "FROM caja_movimiento m WHERE m.idsesion = :idsesion GROUP BY m.tipo, m.concepto ORDER BY m.tipo, m.concepto";

const consultar = (sql, replacements, transaction) =>
  models.sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction });

const esEfectivoFila = (f) => Number(f.es_efectivo) === 1;

/** Suma { operaciones, centavos } de las filas que cumplan `pred`. */
const acumular = (filas, pred = () => true) =>
  filas.filter(pred).reduce(
    (acc, f) => ({ operaciones: acc.operaciones + Number(f.operaciones), centavos: acc.centavos + aCentavos(f.total) }),
    { operaciones: 0, centavos: 0 },
  );

const bloque = ({ operaciones, centavos }) => ({ operaciones, total: deCentavos(centavos) });

/**
 * Arqueo de una sesión: desglose + monto esperado.
 *
 *   esperado = monto_apertura + ventas cobradas en EFECTIVO - compras pagadas en EFECTIVO
 *              + ingresos manuales - egresos manuales (incluye devoluciones)
 *
 * Los pagos NO efectivo se informan por tipo y NO afectan el esperado.
 *
 * @param {object} sesion  fila de caja_sesion (monto_apertura DECIMAL)
 * @param {object} transaction  se espera que sea la transacción que ya bloqueó/leyó la sesión
 * @returns {Promise<{arqueo:object, esperadoCentavos:number}>}
 */
const calcularArqueo = async (sesion, transaction) => {
  const replacements = { idsesion: sesion.idsesion, estado: ESTADO_PAGO_COBRADO.toLowerCase() };
  const ventas = await consultar(SQL_PAGOS_VENTA_POR_TIPO, replacements, transaction);
  const compras = await consultar(SQL_PAGOS_COMPRA_POR_TIPO, replacements, transaction);
  const movs = await consultar(SQL_MOVIMIENTOS_POR_CONCEPTO, { idsesion: sesion.idsesion }, transaction);

  const aperturaC = aCentavos(sesion.monto_apertura);
  const ventasEf = acumular(ventas, esEfectivoFila);
  const comprasEf = acumular(compras, esEfectivoFila);
  const ingresos = acumular(movs, (f) => f.tipo === "INGRESO");
  const egresos = acumular(movs, (f) => f.tipo === "EGRESO");
  const esperadoC = aperturaC + ventasEf.centavos - comprasEf.centavos + ingresos.centavos - egresos.centavos;

  const porTipo = (filas) =>
    filas
      .filter((f) => !esEfectivoFila(f))
      .map((f) => ({
        idtipopago: f.idtipopago,
        nombre: f.nombre,
        operaciones: Number(f.operaciones),
        total: deCentavos(aCentavos(f.total)),
      }));

  const ventasOtros = porTipo(ventas);
  const comprasOtros = porTipo(compras);

  const arqueo = {
    idsesion: sesion.idsesion,
    idcaja: sesion.idcaja,
    estado: sesion.estado,
    monto_apertura: deCentavos(aperturaC),
    ventas_efectivo: bloque(ventasEf),
    compras_efectivo: bloque(comprasEf),
    ingresos_manuales: bloque(ingresos),
    egresos_manuales: bloque(egresos),
    monto_esperado: deCentavos(esperadoC),
    // Informativo: no afecta el esperado
    otros_medios_pago: { ventas: ventasOtros, compras: comprasOtros },
    movimientos_por_concepto: movs.map((f) => ({
      tipo: f.tipo,
      concepto: f.concepto,
      operaciones: Number(f.operaciones),
      total: deCentavos(aCentavos(f.total)),
    })),
    operaciones: {
      ventas: ventas.reduce((a, f) => a + Number(f.operaciones), 0),
      compras: compras.reduce((a, f) => a + Number(f.operaciones), 0),
      movimientos: movs.reduce((a, f) => a + Number(f.operaciones), 0),
    },
  };
  return { arqueo, esperadoCentavos: esperadoC };
};

// ───── compensación por anulación (libro append-only) ─────

const REGLAS_COMPENSACION = {
  venta: {
    modelo: "Pago",
    campoReferencia: "idorden",
    tipo: "EGRESO",
    concepto: "DEVOLUCION",
    codigoAdvertencia: "DEVOLUCION_SIN_SESION_DE_CAJA",
    etiqueta: "venta",
  },
  compra: {
    modelo: "PagoCompra",
    campoReferencia: "idcompra",
    tipo: "INGRESO",
    concepto: "DEVOLUCION COMPRA",
    codigoAdvertencia: "DEVOLUCION_SIN_SESION_DE_CAJA",
    etiqueta: "compra",
  },
};

/**
 * Efectivo "Pagado" de UNA orden/compra que entró a alguna caja (idsesion no nulo), en centavos.
 * Una sola lectura de pagos (casi siempre vacía) + los tipos de pago efectivo; suma en centavos enteros.
 */
const efectivoCobradoEnCajaCentavos = async (regla, idreferencia, transaction) => {
  const candidatos = await models[regla.modelo].findAll({
    where: { [regla.campoReferencia]: idreferencia, idsesion: { [Op.ne]: null } },
    transaction,
  });
  const pagos = candidatos.filter((p) => esPagoCobrado(p.estado));
  if (pagos.length === 0) return 0;

  const idsTipos = [...new Set(pagos.map((p) => p.idtipopago))];
  const efectivos = await models.TipoPago.findAll({
    where: { idtipopago: { [Op.in]: idsTipos }, es_efectivo: 1 },
    transaction,
  });
  const idsEfectivo = new Set(efectivos.map((t) => t.idtipopago));
  return pagos.filter((p) => idsEfectivo.has(p.idtipopago)).reduce((acc, p) => acc + aCentavos(p.importe), 0);
};

/**
 * Al anular una venta/compra: si tenía efectivo ya "Pagado" que entró a una sesión de caja, registra un
 * movimiento compensatorio en la sesión ABIERTA actual del usuario (los pagos originales no se tocan).
 *  - venta  -> EGRESO  "DEVOLUCION"         (sale efectivo de la caja)
 *  - compra -> INGRESO "DEVOLUCION COMPRA"  (vuelve efectivo a la caja)
 * Sin sesión abierta: CAJA_OBLIGATORIA=true -> 409 CAJA_NO_ABIERTA (la anulación se revierte); si no,
 * advertencia DEVOLUCION_SIN_SESION_DE_CAJA. Sin efectivo cobrado en caja no hace nada.
 *
 * Va al FINAL de la transacción de anulación (la sesión es el último lock del orden).
 *
 * @param {object} transaction
 * @param {{tipo:"venta"|"compra", idreferencia:string, descripcion?:string, user:object|null, idsucursal:number, idcaja?:any}} datos
 * @returns {Promise<{advertencias:Array, movimiento:object|null}>}
 */
const compensarAnulacion = async (transaction, { tipo, idreferencia, descripcion, user, idsucursal, idcaja }) => {
  const regla = REGLAS_COMPENSACION[tipo];
  const centavos = await efectivoCobradoEnCajaCentavos(regla, idreferencia, transaction);
  if (centavos <= 0) return { advertencias: [], movimiento: null };

  const sesion = await resolverSesionParaCobro(transaction, { user, idsucursal, idcaja });
  if (!sesion) {
    if (cajaObligatoria()) {
      throw errorDeNegocio(
        409,
        `No hay una sesión de caja abierta para registrar la devolución de efectivo de la ${regla.etiqueta}: abrí la caja primero`,
        "CAJA_NO_ABIERTA",
      );
    }
    return {
      advertencias: [
        advertenciaSinSesion(
          regla.codigoAdvertencia,
          `La ${regla.etiqueta} tenía ${decimalDeCentavos(centavos)} en efectivo cobrado en caja y se anuló sin sesión de caja abierta: ` +
            "no se registró el movimiento compensatorio (hacelo manualmente con POST /cajas/sesiones/:id/movimientos).",
          { importe: deCentavos(centavos) },
        ),
      ],
      movimiento: null,
    };
  }

  const movimiento = await models.CajaMovimiento.create(
    {
      tipo: regla.tipo,
      concepto: regla.concepto,
      importe: decimalDeCentavos(centavos),
      descripcion: descripcion ?? null,
      referencia: String(idreferencia),
      fecha: new Date(),
      idsesion: sesion.idsesion,
      idusuario: user.id,
    },
    { transaction },
  );
  return { advertencias: [], movimiento };
};

module.exports = {
  ESTADO_PAGO_COBRADO,
  esPagoCobrado,
  cajaObligatoria,
  aCentavos,
  deCentavos,
  decimalDeCentavos,
  normalizarIdCaja,
  resolverSesionParaCobro,
  esTipoPagoEfectivo,
  atribuirPagoACaja,
  calcularArqueo,
  compensarAnulacion,
};
