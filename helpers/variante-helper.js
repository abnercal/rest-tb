/**
 * Variantes (talla/color) en los flujos de STOCK (ventas, compras, anulaciones).
 *
 * La clave de stock es (idsucursal, codigoprod, idvariante). `idvariante = NULL`
 * es "producto sin variantes" y es una clave más: en SQL se consulta SIEMPRE con
 * `idvariante: null` (IS NULL) — jamás se omite el filtro, porque eso mezclaría el
 * stock de todas las variantes del producto.
 *
 * Protocolo de locks (todas las transacciones que MUEVEN stock lo respetan, igual
 * que las que editan variantes en controllers/productos/feature.js):
 *
 *   producto (LOCK IN SHARE MODE)  ->  producto_variante (FOR UPDATE)  ->  almacen (FOR UPDATE)  ->  lote
 *
 * siempre en orden (codigoprod, idvariante con NULL primero). Por qué en este orden:
 *  - Editar/eliminar un producto toma el lock EXCLUSIVO del producto primero; con el
 *    lock compartido de acá, esas operaciones y los movimientos de stock se serializan
 *    ANTES de que cualquiera lea/escriba stock o estado de variantes (cierra la carrera
 *    "deshabilitar variante / cambiar tiene_variantes" vs "comprar/vender").
 *  - Un INSERT en kardex/lote/orden_detalle toma un lock compartido implícito (por las
 *    FOREIGN KEY) sobre la fila del producto: si la transacción de venta lo pidiera
 *    recién al final, mientras otra transacción tiene el producto en exclusivo y espera
 *    la variante/almacén que la venta ya tiene, habría deadlock. Pidiéndolo primero,
 *    el orden es el mismo para todos.
 *  - El lock compartido (no FOR UPDATE) deja que ventas/compras de distintas variantes
 *    del mismo producto corran en paralelo. Se emite como SQL crudo `LOCK IN SHARE MODE`
 *    (válido en MySQL 5.7/8.x y MariaDB) porque Sequelize genera `FOR SHARE`, que
 *    MariaDB y MySQL < 8.0.1 no entienden.
 */
const crypto = require("crypto");
const { QueryTypes } = require("sequelize");
const models = require("../models/mysql");
const { esIdEstricto } = require("../utils/ids");

const errorDeNegocio = (status, message, code, detalles) => {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  if (detalles) error.detalles = detalles;
  return error;
};

/**
 * undefined/null => null (sin variante). Cualquier otra cosa debe ser un entero
 * positivo estricto; arrays, objetos, "", 0, texto => 400 VARIANTE_INVALIDA
 * (no se castea en silencio).
 */
const normalizarIdVariante = (valor) => {
  if (valor === undefined || valor === null) return null;
  if (!esIdEstricto(valor)) {
    throw errorDeNegocio(400, "idvariante debe ser un ID numérico", "VARIANTE_INVALIDA");
  }
  return Number(valor);
};

/**
 * Coherencia entre el producto y el idvariante del detalle (no toca la BD):
 *  - tiene_variantes y sin idvariante  => 400 VARIANTE_REQUERIDA
 *  - sin tiene_variantes y con idvariante => 400 VARIANTE_NO_PERMITIDA
 * @param {{codigoprod?:number, nombre?:string, tiene_variantes?:any}} producto
 * @returns {number|null} idvariante normalizado
 */
const validarCoherenciaVariante = (producto, idvarianteCrudo) => {
  const idvariante = normalizarIdVariante(idvarianteCrudo);
  const tiene = Boolean(producto?.tiene_variantes);
  const nombre = producto?.nombre ? `"${producto.nombre}"` : `#${producto?.codigoprod}`;

  if (tiene && idvariante === null) {
    throw errorDeNegocio(
      400,
      `El producto ${nombre} maneja variantes: idvariante es obligatorio en cada detalle`,
      "VARIANTE_REQUERIDA",
      [{ codigoprod: producto?.codigoprod ?? null }],
    );
  }
  if (!tiene && idvariante !== null) {
    throw errorDeNegocio(
      400,
      `El producto ${nombre} no maneja variantes: no se debe enviar idvariante`,
      "VARIANTE_NO_PERMITIDA",
      [{ codigoprod: producto?.codigoprod ?? null, idvariante }],
    );
  }
  return idvariante;
};

/**
 * Clave de stock para comparar/ordenar: (codigoprod, idvariante con NULL primero).
 * Los IDs de variante son AUTO_INCREMENT desde 1, así que NULL -> 0 queda primero.
 */
const compararClaveStock = (a, b) =>
  Number(a.codigoprod) - Number(b.codigoprod) ||
  Number(a.idvariante ?? 0) - Number(b.idvariante ?? 0);

/**
 * `where` de Almacen/Lote por clave de stock. `idvariante` SIEMPRE explícito
 * (null => IS NULL): nunca undefined ni omitido.
 */
const whereStock = ({ codigoprod, idsucursal, idvariante }) => ({
  codigoprod,
  idsucursal,
  idvariante: idvariante ?? null,
});

/** Lock compartido de la fila del producto + lectura FRESCA (no del snapshot) de sus flags. */
const bloquearProductoCompartido = async (codigoprod, transaction) => {
  const filas = await models.sequelize.query(
    "SELECT codigoprod, nombre, estado, tiene_variantes FROM producto " +
      "WHERE codigoprod = :codigoprod LOCK IN SHARE MODE",
    { replacements: { codigoprod }, type: QueryTypes.SELECT, transaction },
  );
  return filas[0] || null;
};

/** Lectura simple (sin lock) de los flags del producto: para documentos que no mueven stock. */
const leerProducto = async (codigoprod, transaction) => {
  const filas = await models.sequelize.query(
    "SELECT codigoprod, nombre, estado, tiene_variantes FROM producto WHERE codigoprod = :codigoprod",
    { replacements: { codigoprod }, type: QueryTypes.SELECT, transaction },
  );
  return filas[0] || null;
};

/**
 * Un producto dado de baja (estado != 1) no admite movimientos NUEVOS (venta, compra,
 * cotización, conversión). Se evalúa con la fila leída bajo el lock del producto, así que
 * no hay carrera con deleteProductoFtr (que toma el lock exclusivo antes de dar de baja).
 * Las reversas (anular venta/compra) NO llaman a esto: siguen funcionando.
 */
const validarProductoActivo = (producto, codigoprod) => {
  if (!producto || Number(producto.estado) !== 1) {
    const nombre = producto?.nombre ? `"${producto.nombre}"` : `#${codigoprod}`;
    throw errorDeNegocio(400, `El producto ${nombre} está inactivo o no existe`, "PRODUCTO_INACTIVO", [{ codigoprod }]);
  }
};

/**
 * Lee y bloquea (FOR UPDATE) la variante del detalle, verificando que pertenezca al
 * producto y, para movimientos NUEVOS, que esté activa. Con `exigirActiva=false`
 * (reversar un movimiento ya registrado) una variante deshabilitada es válida y una
 * inexistente se ignora (la FK garantiza que existe).
 */
const cargarVarianteBloqueada = async ({ idvariante, codigoprod, exigirActiva, transaction, bloquear = true }) => {
  const variante = await models.ProductoVariante.findOne({
    where: { idvariante, codigoprod },
    ...(bloquear ? { lock: transaction.LOCK.UPDATE } : {}),
    transaction,
  });
  if (!variante) {
    if (!exigirActiva) return null;
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
  return variante;
};

/**
 * Toma, en el orden del protocolo, los locks de producto (compartido) y de variante
 * (exclusivo) de las líneas de un movimiento de stock. Debe llamarse ANTES de leer o
 * escribir Almacen/Lote.
 *
 * @param {Array<{codigoprod:number, idvariante:number|null}>} lineas
 * @param {object}  opts
 * @param {boolean} opts.validar  true  = movimiento NUEVO (venta/compra/conversión): con los
 *                                datos frescos re-valida coherencia producto/variante y que la
 *                                variante exista, sea del producto y esté activa.
 *                                false = REVERSA de un movimiento ya registrado: solo toma los
 *                                locks (una variante deshabilitada es válida).
 * @param {object}  opts.transaction
 * @param {object}  [opts.detalle]  si viene, se completa con { productos, variantes }: las filas
 *                                  leídas BAJO los locks (producto por codigoprod; variante por
 *                                  "codigoprod:idvariante"), para evaluar advertencias sin releer.
 * @returns {Promise<Map<number, object>>} filas frescas de producto por codigoprod
 */
const bloquearStock = async (lineas, { validar, transaction, detalle }) => {
  const ordenadas = [...lineas].sort(compararClaveStock);
  const productos = new Map();

  for (const { codigoprod } of ordenadas) {
    const cod = Number(codigoprod);
    if (!productos.has(cod)) productos.set(cod, await bloquearProductoCompartido(cod, transaction));
  }

  if (validar) for (const [cod, producto] of productos) validarProductoActivo(producto, cod);

  // La clave de "ya procesada" es (producto, variante): la misma variante pedida bajo OTRO
  // producto debe pasar igual por su chequeo de pertenencia.
  const yaBloqueadas = new Set();
  const variantes = new Map();
  for (const linea of ordenadas) {
    const idvariante = linea.idvariante ?? null;
    if (validar) validarCoherenciaVariante(productos.get(Number(linea.codigoprod)), idvariante);
    if (idvariante === null) continue;
    const clave = `${Number(linea.codigoprod)}:${idvariante}`;
    if (yaBloqueadas.has(clave)) continue;
    yaBloqueadas.add(clave);
    const variante = await cargarVarianteBloqueada({
      idvariante,
      codigoprod: Number(linea.codigoprod),
      exigirActiva: validar,
      transaction,
    });
    variantes.set(clave, variante);
  }
  if (detalle) { detalle.productos = productos; detalle.variantes = variantes; }
  return productos;
};

/**
 * Advertencias de una REVERSA (anular venta / anular compra): la reversa siempre se permite
 * (integridad del kardex), pero si la clave de stock afectada ya no es vendible el stock
 * queda "varado" y hay que avisarlo. Se evalúa con las filas leídas bajo los locks
 * (`detalle` de bloquearStock), sin lecturas ni locks adicionales.
 *
 * Por clave (producto, variante), la primera que aplique:
 *  - PRODUCTO_INACTIVO_CON_STOCK: el producto está dado de baja.
 *  - STOCK_EN_CLAVE_NO_VENDIBLE: el producto exige variantes y el stock cae en la fila SIN
 *    variante, o el producto ya no maneja variantes y el stock cae en una fila de variante.
 *  - STOCK_EN_VARIANTE_DESHABILITADA: la variante está deshabilitada.
 *
 * @param {Array<{codigoprod:number, idvariante:number|null, cantidad:number, stockFinal:number}>} movimientos
 *        un elemento por clave (cantidad = unidades movidas en total, stockFinal = stock resultante)
 * @param {{productos?:Map, variantes?:Map}} detalle
 * @param {"restituyeron"|"descontaron"} verbo
 * @returns {Array<{codigo:string, mensaje:string, codigoprod:number, idvariante?:number}>}
 */
const advertenciasDeReversa = (movimientos, detalle, verbo) => {
  const productos = detalle?.productos;
  const variantes = detalle?.variantes;
  if (!productos) return [];
  const advertencias = [];
  for (const m of movimientos) {
    const codigoprod = Number(m.codigoprod);
    const idvariante = m.idvariante ?? null;
    const producto = productos.get(codigoprod);
    if (!producto) continue;
    // Sin stock en la clave no hay nada varado (p. ej. anular una compra que lo deja en 0).
    if (!(Number(m.stockFinal) > 0)) continue;
    const nombre = producto.nombre ? `"${producto.nombre}"` : `#${codigoprod}`;
    const donde = idvariante === null ? nombre : `${nombre} (variante ${idvariante})`;
    const resumen = `Se ${verbo} ${m.cantidad} unidad(es) de ${donde}; stock actual de esa clave: ${m.stockFinal}.`;
    const tiene = Boolean(producto.tiene_variantes);
    let codigo = null;
    let detalleMsg = "";
    if (Number(producto.estado) !== 1) {
      codigo = "PRODUCTO_INACTIVO_CON_STOCK";
      detalleMsg = "El producto está inactivo: ese stock no se puede vender ni comprar hasta reactivarlo.";
    } else if ((idvariante === null && tiene) || (idvariante !== null && !tiene)) {
      codigo = "STOCK_EN_CLAVE_NO_VENDIBLE";
      detalleMsg = idvariante === null
        ? "El producto ahora exige variantes y ese stock quedó en la fila sin variante: no es vendible hasta reubicarlo (ajuste) o volver el producto a manejar solo stock sin variantes."
        : "El producto ya no maneja variantes y ese stock quedó en una fila de variante: no es vendible hasta reubicarlo (ajuste) o volver a activar las variantes del producto.";
    } else if (idvariante !== null && Number(variantes?.get(`${codigoprod}:${idvariante}`)?.estado) !== 1) {
      codigo = "STOCK_EN_VARIANTE_DESHABILITADA";
      detalleMsg = "La variante está deshabilitada: reactivarla con PUT /productos/" + codigoprod + " (variantes[].estado=1) libera el stock.";
    }
    if (!codigo) continue;
    advertencias.push({
      codigo,
      mensaje: `${resumen} ${detalleMsg}`,
      codigoprod,
      ...(idvariante !== null && { idvariante }),
    });
  }
  return advertencias;
};

/** Agrupa movimientos por clave (producto, variante): suma cantidades y se queda con el último stock. */
const agruparMovimientos = (movimientos) => {
  const porClave = new Map();
  for (const m of movimientos) {
    const clave = `${Number(m.codigoprod)}:${m.idvariante ?? 0}`;
    const previo = porClave.get(clave);
    porClave.set(clave, {
      codigoprod: Number(m.codigoprod),
      idvariante: m.idvariante ?? null,
      cantidad: (previo?.cantidad ?? 0) + Number(m.cantidad),
      stockFinal: Number(m.stockFinal),
    });
  }
  return [...porClave.values()];
};

/**
 * Para documentos que NO mueven stock (cotizaciones): misma validación de que el producto
 * esté activo y de que la variante exista, sea del producto y esté activa, pero SIN locks.
 */
const validarVariantesSinLock = async (lineas, transaction) => {
  const ordenadas = [...lineas].sort(compararClaveStock);
  const codigos = [...new Set(ordenadas.map((l) => Number(l.codigoprod)))];
  for (const cod of codigos) validarProductoActivo(await leerProducto(cod, transaction), cod);

  const vistas = new Set();
  for (const linea of ordenadas) {
    const idvariante = linea.idvariante ?? null;
    if (idvariante === null) continue;
    const clave = `${Number(linea.codigoprod)}:${idvariante}`; // (producto, variante), no solo variante
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    await cargarVarianteBloqueada({
      idvariante,
      codigoprod: Number(linea.codigoprod),
      exigirActiva: true,
      transaction,
      bloquear: false,
    });
  }
};

/**
 * Texto legible de una variante ("talla M, color Rojo"), para mensajes de error.
 * Se usa solo en caminos de error; nunca rompe el flujo si la lectura falla.
 */
const describirVariante = async (idvariante, transaction) => {
  try {
    const v = await models.ProductoVariante.findByPk(idvariante, {
      include: [
        { association: "Talla", attributes: ["nombre"], required: false },
        { association: "Color", attributes: ["nombre"], required: false },
      ],
      transaction,
    });
    const partes = [];
    if (v?.Talla?.nombre) partes.push(`talla ${v.Talla.nombre}`);
    if (v?.Color?.nombre) partes.push(`color ${v.Color.nombre}`);
    if (v?.sku) partes.push(`SKU ${v.sku}`);
    return partes.length ? partes.join(", ") : `variante #${idvariante}`;
  } catch {
    return `variante #${idvariante}`;
  }
};

/** Nombre del producto para mensajes: "Remera (talla M, color Rojo)" o solo "Remera". */
const etiquetaDeStock = async (nombreProducto, idvariante, transaction) =>
  idvariante == null
    ? nombreProducto
    : `${nombreProducto} (${await describirVariante(idvariante, transaction)})`;

/**
 * Almacen de la clave de stock, bloqueado (FOR UPDATE). Protocolo INSERT-PRIMERO:
 *
 *   1. INSERT ... ON DUPLICATE KEY UPDATE idalmacen = idalmacen  (no-op si la clave ya existe)
 *   2. SELECT ... FOR UPDATE por la clave (whereStock)
 *
 * Por qué no "SELECT FOR UPDATE y, si no hay fila, INSERT": el SELECT sobre una clave
 * inexistente toma un GAP LOCK; dos transacciones lo toman a la vez (los gap locks son
 * compatibles entre sí), ambas hacen INSERT y cada una queda esperando el gap de la otra:
 * deadlock 1213, y el UNIQUE nunca llega a saltar. Con INSERT primero no hay gap lock previo:
 * la primera inserta (lock exclusivo sobre el registro nuevo) y la segunda choca con el
 * duplicado, espera ese registro, y al commit de la primera hace el no-op y sigue.
 * El UNIQUE de la BD es sobre la columna generada idvariante_key = IFNULL(idvariante, 0),
 * que NO se escribe (idvariante NULL se enlaza como NULL real).
 *
 * @returns {Promise<{almacen: object, creado: boolean}>} creado = esta transacción insertó la fila
 *          (su stock ya es valoresNuevos.stock); false = ya existía (el caller suma sobre su stock).
 */
const obtenerOCrearAlmacenBloqueado = async ({ codigoprod, idsucursal, idvariante, valoresNuevos = {}, transaction }) => {
  const idalmacen = crypto.randomUUID();
  await models.sequelize.query(
    "INSERT INTO almacen (idalmacen, idsucursal, codigoprod, idvariante, stock, stock_minimo, fecha) " +
      "VALUES (:idalmacen, :idsucursal, :codigoprod, :idvariante, :stock, :stock_minimo, :fecha) " +
      "ON DUPLICATE KEY UPDATE idalmacen = idalmacen",
    {
      replacements: {
        idalmacen,
        idsucursal,
        codigoprod,
        idvariante: idvariante ?? null,
        stock: valoresNuevos.stock ?? 0,
        stock_minimo: valoresNuevos.stock_minimo ?? 0,
        fecha: valoresNuevos.fecha ?? null,
      },
      type: QueryTypes.INSERT,
      transaction,
    },
  );

  const almacen = await models.Almacen.findOne({
    where: whereStock({ codigoprod, idsucursal, idvariante }),
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!almacen) throw new Error("No se pudo crear/leer la fila de Almacen para la clave de stock");
  return { almacen, creado: almacen._id === idalmacen };
};

/** ¿El error es un deadlock (1213) o lock wait timeout (1205) de MySQL? */
const esErrorDeLock = (error) => {
  const codigos = [error?.code, error?.original?.code, error?.parent?.code];
  const errnos = [error?.errno, error?.original?.errno, error?.parent?.errno];
  return codigos.some((c) => c === "ER_LOCK_DEADLOCK" || c === "ER_LOCK_WAIT_TIMEOUT") ||
    errnos.some((n) => n === 1213 || n === 1205);
};

/**
 * Reintenta `fn` (que abre y cierra SU PROPIA transacción) hasta `reintentos` veces más si
 * falla por deadlock/lock timeout. NUNCA reintenta si la transacción ya había hecho commit
 * (error.transaccionConfirmada): eso duplicaría el movimiento.
 */
const reintentarSiDeadlock = async (fn, reintentos = 2) => {
  for (let intento = 0; ; intento++) {
    try {
      return await fn();
    } catch (error) {
      if (intento >= reintentos || !esErrorDeLock(error) || error.transaccionConfirmada) throw error;
    }
  }
};

module.exports = {
  errorDeNegocio,
  normalizarIdVariante,
  validarCoherenciaVariante,
  compararClaveStock,
  whereStock,
  bloquearProductoCompartido,
  bloquearStock,
  validarVariantesSinLock,
  describirVariante,
  etiquetaDeStock,
  obtenerOCrearAlmacenBloqueado,
  validarProductoActivo,
  advertenciasDeReversa,
  agruparMovimientos,
  esErrorDeLock,
  reintentarSiDeadlock,
};
