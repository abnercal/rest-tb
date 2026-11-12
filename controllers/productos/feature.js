const { Op } = require("sequelize");
const models = require("../../models/mysql");
const { deleteImageFile } = require("../../utils/imagen");
const { esIdEstricto } = require("../../utils/ids");
const { validarCodigoDePresentacionLibre } = require("../../helpers/barcode-helper");

// Variantes (talla/color) del producto. En el listado solo se traen las activas;
// en el detalle (y en la respuesta de crear/editar) se traen todas con su estado.
// "orden" de la talla se trae solo para ordenar en memoria (ver variantesToDTO)
// y se quita del DTO.
// `separate: true` => las variantes se traen en una consulta aparte (no en el JOIN principal).
// Variantes y Presentaciones->Precios son hasMany hermanos: en un mismo JOIN el resultado es el
// PRODUCTO CARTESIANO (presentaciones x precios x variantes). Con precios por variante, los
// precios crecen con las variantes y esa explosión se multiplicaría de nuevo por las variantes.
const includeVariantes = (soloActivas) => ({
  association: "Variantes",
  separate: true,
  ...(soloActivas ? { where: { estado: 1 } } : {}),
  required: false,
  include: [
    { association: "Talla", attributes: ["_id", "nombre", "tipo", "orden"], required: false },
    { association: "Color", attributes: ["_id", "nombre", "hex"], required: false },
  ],
});

const buildIncludeProducto = (soloVariantesActivas = false) => [
  "Marca", "Categoria", "Unidad",
  { association: "Publico", attributes: ["_id", "nombre"], required: false },
  includeVariantes(soloVariantesActivas),
  {
    association: "Presentaciones",
    where: { estado: 1 },
    required: false,
    include: [
      "Presentacion",
      { association: "Precios", where: { estado: 1 }, required: false, include: ["TipoCliente"] },
    ],
  },
];

// Para el listado (y la pantalla de ventas): solo variantes activas.
const INCLUDE_PRODUCTO_LISTADO = buildIncludeProducto(true);
// Para el detalle y las respuestas de crear/editar: todas las variantes.
const INCLUDE_PRODUCTO = buildIncludeProducto(false);

// ─── Variantes: helpers ───────────────────────────────────────────────────────

// Construye un Error de negocio con status HTTP, code (opcional) y detalles
// (opcional): errorResponse (utils/handleError.js) los vuelca a la respuesta.
const errorDeNegocio = (status, message, code, detalles) => {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  if (detalles) error.detalles = detalles;
  return error;
};

const esEnteroPositivo = (v) =>
  (typeof v === "number" && Number.isSafeInteger(v) && v > 0) ||
  (typeof v === "string" && /^\d+$/.test(v.trim()) && Number(v) > 0);

// undefined => undefined ("no vino"); null/"" => null; entero positivo => number.
// Cualquier otra cosa (arrays, objetos, texto) es un 400, no se castea en silencio.
const normalizarIdOpcional = (valor, campo) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor === "") return null;
  if (!esEnteroPositivo(valor)) {
    throw errorDeNegocio(400, `${campo} debe ser un ID numérico`, "VARIANTE_INVALIDA");
  }
  return Number(valor);
};

// undefined => undefined ("no vino"); acepta true/false, 1/0 y "true"/"false"/"1"/"0"
// (multipart/form-data manda todo como texto).
const normalizarBooleano = (valor, campo) => {
  if (valor === undefined) return undefined;
  if (valor === true || valor === 1 || valor === "true" || valor === "1") return true;
  if (valor === false || valor === 0 || valor === "false" || valor === "0") return false;
  throw errorDeNegocio(400, `${campo} debe ser verdadero o falso`);
};

// Las columnas generadas idtalla_key/idcolor_key de la BD hacen IFNULL(x, 0): NULL
// cuenta como un valor más. Esta clave replica esa normalización para detectar
// duplicados en código (el modelo no declara esas columnas).
const clavePar = (idtalla, idcolor) => `${idtalla ?? 0}:${idcolor ?? 0}`;

const etiquetaVariante = (v) => {
  const partes = [];
  if (v.idtalla != null) partes.push(`talla ${v.idtalla}`);
  if (v.idcolor != null) partes.push(`color ${v.idcolor}`);
  if (v.sku) partes.push(`SKU ${v.sku}`);
  return `#${v.idvariante} (${partes.join(", ") || "sin talla ni color"})`;
};

// Normaliza el array "variantes" del body a entradas { idvariante, idtalla, idcolor, sku, estado }.
// Conserva undefined = "no vino" en sku/estado (en el update significa "no tocar ese campo").
// Recibe el array ya validado por el validator, pero no confía en él: es la barrera real.
// NOTA: acá "variantes === undefined" NO se transforma en []: el caller decide qué significa.
const normalizarVariantesEntrantes = (variantes) => {
  if (!Array.isArray(variantes)) {
    throw errorDeNegocio(400, "variantes debe ser un arreglo", "VARIANTE_INVALIDA");
  }
  return variantes.map((v, i) => {
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      throw errorDeNegocio(400, `La variante en la posición ${i} debe ser un objeto`, "VARIANTE_INVALIDA");
    }
    const entrada = {
      idvariante: normalizarIdOpcional(v.idvariante, "idvariante") ?? null,
      idtalla: normalizarIdOpcional(v.idtalla, "idtalla"),
      idcolor: normalizarIdOpcional(v.idcolor, "idcolor"),
      sku: undefined,
      estado: undefined,
    };

    if (v.sku !== undefined) {
      if (v.sku !== null && typeof v.sku !== "string") {
        throw errorDeNegocio(400, "El SKU debe ser un texto", "VARIANTE_INVALIDA");
      }
      const sku = v.sku === null ? "" : v.sku.trim();
      if (sku.length > 60) {
        throw errorDeNegocio(400, "El SKU no puede superar 60 caracteres", "VARIANTE_INVALIDA");
      }
      entrada.sku = sku === "" ? null : sku;
    }

    if (v.estado !== undefined) {
      const estado = normalizarBooleano(v.estado, "El estado de la variante");
      entrada.estado = estado ? 1 : 0;
    }

    // Una entrada nueva (sin idvariante) necesita al menos talla o color.
    if (entrada.idvariante === null && !entrada.idtalla && !entrada.idcolor) {
      throw errorDeNegocio(
        400,
        `La variante en la posición ${i} debe indicar idtalla o idcolor (o idvariante para una existente)`,
        "VARIANTE_INVALIDA",
      );
    }
    return entrada;
  });
};

// Si el público objetivo viene informado (no null/undefined) debe existir y estar activo.
const validarPublicoObjetivo = async (idpublico, transaction) => {
  if (idpublico === undefined || idpublico === null || idpublico === "") return;
  const publico = await models.PublicoObjetivo.findByPk(idpublico, { transaction });
  if (!publico || !publico.estado) {
    throw errorDeNegocio(400, "El público objetivo no existe o está inactivo", "PUBLICO_INVALIDO");
  }
};

// Verifica que las tallas/colores referenciados existan y estén activos.
const validarCatalogosDeVariantes = async (entradas, transaction) => {
  const verificar = async (Modelo, ids, nombre, code) => {
    if (ids.length === 0) return;
    const encontrados = await Modelo.findAll({
      where: { _id: { [Op.in]: ids } },
      attributes: ["_id", "estado"],
      transaction,
    });
    const activos = new Set(encontrados.filter((r) => r.estado).map((r) => r._id));
    const invalidos = ids.filter((id) => !activos.has(id));
    if (invalidos.length > 0) {
      throw errorDeNegocio(
        400,
        `${nombre} no encontrado(s) o inactivo(s): ${invalidos.join(", ")}`,
        code,
      );
    }
  };
  const unicos = (campo) => [...new Set(entradas.map((e) => e[campo]).filter((id) => id != null))];
  await verificar(models.Talla, unicos("idtalla"), "Talla(s)", "TALLA_INVALIDA");
  await verificar(models.Color, unicos("idcolor"), "Color(es)", "COLOR_INVALIDO");
};

// Bloquea (FOR UPDATE) TODAS las variantes del producto, en orden de idvariante.
// Es el mismo mutex por variante que toman ventas/compras/anulaciones antes de tocar
// stock (helpers/variante-helper.js: producto -> variante -> almacen). Hay que llamarlo
// ANTES de leer stock: una lectura de stock "pura" (snapshot REPEATABLE READ) puede estar
// vieja, y una compra/venta en vuelo que ya tiene el lock de la variante haría que lo que
// leemos acá deje de ser cierto apenas ella haga commit. Con el lock tomado, esas
// transacciones esperan, y las lecturas de stock con lock ven siempre lo último confirmado.
const bloquearVariantesDelProducto = (codigoprod, transaction) =>
  models.ProductoVariante.findAll({
    where: { codigoprod },
    order: [["idvariante", "ASC"]],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

// Una variante con stock > 0 (en cualquier fila de Almacen) no se puede deshabilitar.
// PRECONDICIÓN: el caller ya bloqueó las variantes (bloquearVariantesDelProducto). La lectura
// de stock es con lock (FOR UPDATE): lee lo último confirmado, no el snapshot de la transacción.
const validarSinStockEnVariantes = async (variantes, transaction) => {
  if (variantes.length === 0) return;
  const filas = await models.Almacen.findAll({
    where: {
      idvariante: { [Op.in]: variantes.map((v) => v.idvariante) },
      stock: { [Op.gt]: 0 },
    },
    attributes: ["idvariante", "stock"],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (filas.length === 0) return;

  const stockPorVariante = new Map();
  for (const f of filas) {
    stockPorVariante.set(f.idvariante, (stockPorVariante.get(f.idvariante) || 0) + Number(f.stock));
  }
  const detalles = variantes
    .filter((v) => stockPorVariante.has(v.idvariante))
    .map((v) => ({
      idvariante: v.idvariante,
      idtalla: v.idtalla ?? null,
      idcolor: v.idcolor ?? null,
      sku: v.sku ?? null,
      stock: stockPorVariante.get(v.idvariante),
    }));
  const primera = detalles[0];
  throw errorDeNegocio(
    409,
    `No se puede deshabilitar la variante ${etiquetaVariante(primera)}: tiene stock (${primera.stock})`,
    "VARIANTE_CON_STOCK",
    detalles,
  );
};

// Chequeos al cambiar tiene_variantes. Se hacen dentro de la transacción, con el lock
// del producto ya tomado por el caller y lecturas de stock CON lock (FOR UPDATE).
//  - true -> false: no puede haber stock en filas de Almacen asociadas a variantes del producto.
//    Primero se bloquean las variantes (ver bloquearVariantesDelProducto) y recién después se lee el stock.
//  - false -> true: no puede haber stock en filas de Almacen SIN variante (idvariante NULL).
//    Las compras toman el lock (compartido) del producto antes de escribir stock sin variante,
//    así que no pueden colarse entre este chequeo y el cambio del flag.
const validarCambioDeModoDeVariantes = async (codigoprod, actual, nuevo, transaction) => {
  if (actual === nuevo) return;

  if (actual && !nuevo) {
    await bloquearVariantesDelProducto(codigoprod, transaction);
    const filas = await models.Almacen.findAll({
      where: { codigoprod, idvariante: { [Op.ne]: null }, stock: { [Op.gt]: 0 } },
      attributes: ["idvariante", "stock"],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (filas.length > 0) {
      throw errorDeNegocio(
        409,
        "No se puede dejar de manejar variantes: hay stock asociado a variantes de este producto. " +
          "Ajuste o mueva ese stock antes de desactivar las variantes.",
        "STOCK_EN_VARIANTES",
        filas.map((f) => ({ idvariante: f.idvariante, stock: Number(f.stock) })),
      );
    }
  } else if (!actual && nuevo) {
    const filas = await models.Almacen.findAll({
      where: { codigoprod, idvariante: null, stock: { [Op.gt]: 0 } },
      attributes: ["idvariante", "stock"],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (filas.length > 0) {
      throw errorDeNegocio(
        409,
        "No se puede pasar a manejar variantes: el producto tiene stock sin variante. " +
          "Hay que ajustar/mover ese stock antes de pasar a manejar variantes.",
        "STOCK_SIN_VARIANTE",
        filas.map((f) => ({ stock: Number(f.stock) })),
      );
    }
  }
};

// Sincroniza las variantes de un producto con las entradas normalizadas (mismo criterio
// que presentaciones/precios): identifica cada entrada por idvariante (debe pertenecer a
// ESTE producto) o, si no, por el par (idtalla, idcolor); actualiza sku/estado si existe
// (y la reactiva), crea si no existe, y deshabilita (estado=0, NUNCA borra) las
// existentes que no vienen. Sirve también para el create (no hay existentes: todo se crea).
// Una variante deshabilitada sigue ocupando su combinación en la BD (UNIQUE), por eso se
// busca entre TODAS las existentes, no solo las activas.
const sincronizarVariantes = async (codigoprod, entradas, transaction) => {
  // Con lock (FOR UPDATE), no un SELECT de snapshot: bloquea las variantes antes de decidir
  // cuáles deshabilitar y de leer su stock, y ve el estado/sku realmente confirmado.
  const existentes = await bloquearVariantesDelProducto(codigoprod, transaction);

  // 1) Resolver cada entrada contra las existentes
  const resueltas = entradas.map((e) => {
    let existente = null;
    if (e.idvariante !== null) {
      existente = existentes.find((x) => x.idvariante === e.idvariante) || null;
      if (!existente) {
        throw errorDeNegocio(
          404,
          `La variante ${e.idvariante} no existe o no pertenece a este producto`,
          "VARIANTE_NO_ENCONTRADA",
        );
      }
      const cambiaTalla = e.idtalla !== undefined && e.idtalla !== existente.idtalla;
      const cambiaColor = e.idcolor !== undefined && e.idcolor !== existente.idcolor;
      if (cambiaTalla || cambiaColor) {
        throw errorDeNegocio(
          400,
          `No se puede cambiar la talla/color de la variante ${e.idvariante}: cree una variante nueva`,
          "VARIANTE_COMBINACION_INMUTABLE",
        );
      }
    } else {
      const clave = clavePar(e.idtalla, e.idcolor);
      existente = existentes.find((x) => clavePar(x.idtalla, x.idcolor) === clave) || null;
    }
    const idtalla = existente ? existente.idtalla : (e.idtalla ?? null);
    const idcolor = existente ? existente.idcolor : (e.idcolor ?? null);
    return { entrada: e, existente, idtalla, idcolor, clave: clavePar(idtalla, idcolor) };
  });

  // 2) Duplicados dentro del mismo payload (NULL cuenta como 0, igual que la BD)
  const vistas = new Set();
  for (const r of resueltas) {
    if (vistas.has(r.clave)) {
      throw errorDeNegocio(
        409,
        `Variante duplicada en la solicitud (talla ${r.idtalla ?? "sin talla"}, color ${r.idcolor ?? "sin color"})`,
        "VARIANTE_DUPLICADA",
        { idtalla: r.idtalla, idcolor: r.idcolor },
      );
    }
    vistas.add(r.clave);
  }

  // 3) SKU duplicados: dentro del payload y contra variantes de OTROS productos/variantes.
  // La BD compara sin distinguir mayúsculas (collation por defecto), por eso se normaliza.
  const skusVistos = new Set();
  for (const { entrada, existente } of resueltas) {
    const sku = entrada.sku !== undefined ? entrada.sku : existente?.sku;
    if (!sku) continue;
    const k = sku.toLowerCase();
    if (skusVistos.has(k)) {
      throw errorDeNegocio(409, `SKU duplicado en la solicitud: ${sku}`, "SKU_DUPLICADO", { sku });
    }
    skusVistos.add(k);
  }
  const skusNuevos = resueltas
    .filter((r) => r.entrada.sku && (!r.existente || r.existente.sku !== r.entrada.sku))
    .map((r) => r.entrada.sku);
  if (skusNuevos.length > 0) {
    const idsPropios = resueltas.filter((r) => r.existente).map((r) => r.existente.idvariante);
    const choques = await models.ProductoVariante.findAll({
      where: {
        sku: { [Op.in]: skusNuevos },
        ...(idsPropios.length ? { idvariante: { [Op.notIn]: idsPropios } } : {}),
      },
      attributes: ["idvariante", "sku"],
      transaction,
    });
    if (choques.length > 0) {
      throw errorDeNegocio(
        409,
        `El SKU ya está en uso por otra variante: ${choques[0].sku}`,
        "SKU_DUPLICADO",
        { sku: choques[0].sku },
      );
    }
  }

  // 4) Catálogos: solo para las que se crean o se reactivan (una variante activa cuya
  // talla/color se deshabilitó después en el catálogo no debe bloquear editar su SKU).
  const aValidar = resueltas
    .filter((r) => !r.existente || (r.existente.estado !== 1 && r.entrada.estado !== 0))
    .map((r) => ({ idtalla: r.idtalla, idcolor: r.idcolor }));
  await validarCatalogosDeVariantes(aValidar, transaction);

  // 5) Deshabilitar las existentes activas que no vienen (o vienen con estado=0)
  const idsMantenidas = new Set(
    resueltas
      .filter((r) => r.existente && r.entrada.estado !== 0)
      .map((r) => r.existente.idvariante),
  );
  const aDeshabilitar = existentes.filter(
    (x) => x.estado === 1 && !idsMantenidas.has(x.idvariante),
  );
  await validarSinStockEnVariantes(aDeshabilitar, transaction);
  for (const v of aDeshabilitar) {
    await v.update({ estado: 0 }, { transaction });
  }

  // 6) Crear o actualizar (y reactivar) las que vienen
  for (const { entrada, existente, idtalla, idcolor } of resueltas) {
    if (existente) {
      if (entrada.estado === 0) continue; // ya deshabilitada arriba (si estaba activa)
      const cambios = {};
      if (existente.estado !== 1) cambios.estado = 1;
      if (entrada.sku !== undefined && entrada.sku !== existente.sku) cambios.sku = entrada.sku;
      if (Object.keys(cambios).length > 0) await existente.update(cambios, { transaction });
    } else {
      await models.ProductoVariante.create(
        {
          codigoprod,
          idtalla,
          idcolor,
          sku: entrada.sku ?? null,
          estado: entrada.estado ?? 1,
        },
        { transaction },
      );
    }
  }
};

const contarVariantesActivas = (codigoprod, transaction) =>
  models.ProductoVariante.count({ where: { codigoprod, estado: 1 }, transaction });

// Traduce los UNIQUE de producto_variante (combinación y sku) a un 409 legible.
// El resto de errores se devuelve tal cual.
const traducirErrorDeVariantes = (error) => {
  if (error?.name !== "SequelizeUniqueConstraintError") return error;
  const texto = [
    error.parent?.sqlMessage,
    error.original?.sqlMessage,
    error.message,
    ...Object.keys(error.fields || {}),
  ].filter(Boolean).join(" ");

  if (texto.includes("uq_variante_sku")) {
    return errorDeNegocio(409, "El SKU ya está en uso por otra variante", "SKU_DUPLICADO");
  }
  if (texto.includes("uq_variante_combinacion")) {
    return errorDeNegocio(
      409,
      "Ya existe una variante con esa combinación de talla y color para este producto",
      "VARIANTE_DUPLICADA",
    );
  }
  return error;
};

// Valida que todos los idtipoCli referenciados en los arrays "precios" existan.
// Recibe las presentaciones tal como vienen del body (con su .precios opcional).
const validarTiposClienteDePrecios = async (presentaciones, transaction) => {
  const idsTipoCli = [
    ...new Set(
      presentaciones
        .flatMap((p) => p.precios || [])
        .map((pr) => pr.idtipoCli)
        .filter((id) => id !== undefined && id !== null),
    ),
  ];
  if (idsTipoCli.length === 0) return;

  const encontrados = await models.TipoCliente.findAll({
    where: { idtipoCli: { [Op.in]: idsTipoCli } },
    attributes: ["idtipoCli"],
    transaction,
  });
  const idsEncontrados = new Set(encontrados.map((t) => t.idtipoCli));
  const faltantes = idsTipoCli.filter((id) => !idsEncontrados.has(id));
  if (faltantes.length > 0) {
    const error = new Error(`Tipo(s) de cliente no encontrado(s): ${faltantes.join(", ")}`);
    error.status = 404;
    throw error;
  }
};

// producto_presentacion.codigo_barras no puede coincidir con un prod_barcode ACTIVO (409 BARCODE_DUPLICADO).
// Solo se valida si el valor es no vacío y CAMBIA (valorActual = el guardado; undefined en altas).
const validarCodigoBarrasDePresentacion = async (nuevo, valorActual, transaction) => {
  if (typeof nuevo !== "string" || nuevo.trim() === "" || nuevo === valorActual) return;
  await validarCodigoDePresentacionLibre(nuevo, transaction);
};

// ─── Precios por variante ─────────────────────────────────────────────────────
// Cada entrada de `presentaciones[].precios[]` puede traer `idvariante`:
//   ausente / null => precio GENÉRICO de la presentación (el de siempre, precios.idvariante NULL)
//   n              => precio propio de esa variante: pisa al genérico SOLO al vender esa variante
// Un `precios` explícito sincroniza los precios GENÉRICOS como conjunto completo (lo que no viene
// se deshabilita, estado=0, igual que antes). Los precios POR VARIANTE se sincronizan (también como
// conjunto completo) SOLO si el payload trae al menos una entrada con idvariante; sin ninguna, las
// filas de variantes existentes no se tocan. `precios: []` limpia los genéricos y las filas de
// variantes habilitadas. La clave de una fila es (idtipoCli, idvariante-o-NULL). Las filas de
// variantes DESHABILITADAS quedan siempre fuera: no se ofrecen en el DTO y la sincronización no las
// toca (reaparecen si la variante se reactiva). Para quitar el último override dejando los
// genéricos: DELETE /api/precios/:id.
// DTO: Presentaciones[].Precios trae SOLO genéricos (forma de siempre); los de variante van en la clave
// aditiva Presentaciones[].PreciosVariante, que solo existe si hay al menos uno de una variante habilitada.

// Normaliza (in place) los ids de cada precio:
//  - idvariante: undefined se deja como está; null => null; entero estricto => number; cualquier
//    otra cosa (arrays, objetos, texto, 0) => 400.
//  - idtipoCli: un texto numérico ("2", típico de multipart/JSON laxo y que el validator acepta con
//    isInt) pasa a number, para que las comparaciones con las filas guardadas (===) y la validación
//    de existencia no generen duplicados ni falsos 404. Lo que no sea un entero estricto se deja
//    como venía (lo resuelve el validator / la validación de existencia, igual que antes).
const normalizarVariantesDePrecios = (presentaciones) => {
  for (const p of presentaciones) {
    if (!p || !Array.isArray(p.precios)) continue;
    for (const pr of p.precios) {
      if (pr === null || typeof pr !== "object") continue;
      if (typeof pr.idtipoCli === "string" && esIdEstricto(pr.idtipoCli)) pr.idtipoCli = Number(pr.idtipoCli);
      if (pr.idvariante === undefined || pr.idvariante === null) continue;
      if (!esIdEstricto(pr.idvariante)) {
        throw errorDeNegocio(400, "El idvariante de un precio debe ser un ID numérico", "PRECIO_VARIANTE_INVALIDA");
      }
      pr.idvariante = Number(pr.idvariante);
    }
  }
};

const idsDeVariantesEnPrecios = (presentaciones) => [
  ...new Set(
    presentaciones
      .flatMap((p) => (p && Array.isArray(p.precios) ? p.precios : []))
      .map((pr) => pr?.idvariante)
      .filter((id) => id !== undefined && id !== null),
  ),
];

// Un producto sin tiene_variantes no admite precios por variante (no toca la BD).
const exigirProductoConVariantesParaPrecios = (presentaciones, tieneVariantes) => {
  if (tieneVariantes) return;
  const ids = idsDeVariantesEnPrecios(presentaciones);
  if (ids.length > 0) {
    throw errorDeNegocio(
      400,
      "El producto no maneja variantes: los precios no pueden indicar idvariante",
      "PRECIO_VARIANTE_NO_PERMITIDA",
      ids.map((idvariante) => ({ idvariante })),
    );
  }
};

// Toda variante referenciada por un precio debe existir, ser de ESTE producto y estar habilitada
// (un precio nuevo para una variante deshabilitada no tiene sentido: no se puede vender).
// PRECONDICIÓN: el caller ya bloqueó la fila del producto (FOR UPDATE). Las variantes se leen con
// lock (mismo mutex que usan ventas/compras/edición de variantes), así no se pueden deshabilitar
// entre esta validación y el commit.
const validarVariantesDePrecios = async (codigoprod, tieneVariantes, presentaciones, transaction) => {
  exigirProductoConVariantesParaPrecios(presentaciones, tieneVariantes);
  const ids = idsDeVariantesEnPrecios(presentaciones);
  if (ids.length === 0) return;

  const variantes = await bloquearVariantesDelProducto(codigoprod, transaction);
  const porId = new Map(variantes.map((v) => [v.idvariante, v]));
  for (const idvariante of ids) {
    const v = porId.get(idvariante);
    if (!v) {
      throw errorDeNegocio(
        400,
        `La variante ${idvariante} no existe o no pertenece a este producto`,
        "PRECIO_VARIANTE_INVALIDA",
        [{ codigoprod, idvariante }],
      );
    }
    if (Number(v.estado) !== 1) {
      throw errorDeNegocio(
        400,
        `La variante ${idvariante} está deshabilitada: no se le pueden cargar precios`,
        "PRECIO_VARIANTE_INVALIDA",
        [{ codigoprod, idvariante }],
      );
    }
  }
};

// Misma clave (idtipoCli + idvariante-o-NULL) entre una fila existente y una entrada del body.
const mismaClaveDePrecio = (fila, entrada) =>
  fila.idtipoCli === entrada.idtipoCli && (fila.idvariante ?? null) === (entrada.idvariante ?? null);

// Crea las filas de Precio para una presentación recién creada.
const crearPreciosDePresentacion = async (idprodPresenta, precios, transaction) => {
  if (!precios || precios.length === 0) return;
  const rows = precios.map((pr) => ({
    idprodPresenta,
    idtipoCli: pr.idtipoCli,
    idvariante: pr.idvariante ?? null,
    precio: pr.precio,
    tipoprecio: pr.tipoprecio ?? null,
    fechaefecto: pr.fechaefecto ?? null,
    fechafin: pr.fechafin ?? null,
  }));
  await models.Precio.bulkCreate(rows, { transaction });
};

// Sincroniza precios de una presentación existente, igual que se hace con las
// presentaciones del producto: actualiza por idtipoCli si ya existe, crea si es
// nuevo, y deshabilita (estado=0) los que ya no vienen en el array — nunca un
// hard-delete, para no perder el historial de vigencia.
// Solo se consideran los precios actualmente habilitados (estado=1) como
// candidatos a actualizar/deshabilitar: uno ya deshabilitado antes no se toca.
const sincronizarPreciosDePresentacion = async (idprodPresenta, precios, transaction) => {
  // "precios" vino explícito en el body (ver updateProductoFtr), así que un
  // array vacío significa "el usuario quitó todos los precios" y debe
  // deshabilitarlos, no ser tratado como "no tocar nada".
  if (!precios) return;

  // Los precios por variante solo entran al conjunto sincronizable si el payload trae alguno
  // (o es [] = limpiar todo). Sin entradas con idvariante, las filas de variantes no se tocan.
  const incluyeVariantes = precios.length === 0 || precios.some((pr) => pr.idvariante != null);

  const todosActivos = await models.Precio.findAll({
    where: { idprodPresenta, estado: 1, ...(incluyeVariantes ? {} : { idvariante: null }) },
    transaction,
  });

  // Conjunto sincronizable: precios genéricos + (si corresponde) precios de variantes HABILITADAS. Los de
  // una variante deshabilitada ni se actualizan ni se deshabilitan acá (ver nota de "Precios por variante").
  const idsConVariante = [...new Set(todosActivos.filter((a) => a.idvariante != null).map((a) => a.idvariante))];
  let variantesHabilitadas = new Set();
  if (idsConVariante.length > 0) {
    const habilitadas = await models.ProductoVariante.findAll({
      where: { idvariante: { [Op.in]: idsConVariante }, estado: 1 },
      attributes: ["idvariante"],
      transaction,
    });
    variantesHabilitadas = new Set(habilitadas.map((v) => v.idvariante));
  }
  const activos = todosActivos.filter((a) => a.idvariante == null || variantesHabilitadas.has(a.idvariante));

  // Deshabilitar los que ya no vienen en el array entrante (clave: tipo de cliente + variante)
  for (const activo of activos) {
    if (!precios.some((pr) => mismaClaveDePrecio(activo, pr))) {
      await activo.update({ estado: 0 }, { transaction });
    }
  }

  // Crear o actualizar (y reactivar) los que sí vienen
  for (const pr of precios) {
    const existente = activos.find((ex) => mismaClaveDePrecio(ex, pr));
    if (existente) {
      const updateData = { estado: 1 };
      if (pr.precio !== undefined) updateData.precio = pr.precio;
      if (pr.tipoprecio !== undefined) updateData.tipoprecio = pr.tipoprecio;
      if (pr.fechaefecto !== undefined) updateData.fechaefecto = pr.fechaefecto;
      if (pr.fechafin !== undefined) updateData.fechafin = pr.fechafin;
      await existente.update(updateData, { transaction });
    } else {
      await models.Precio.create(
        {
          idprodPresenta,
          idtipoCli: pr.idtipoCli,
          idvariante: pr.idvariante ?? null,
          precio: pr.precio,
          tipoprecio: pr.tipoprecio ?? null,
          fechaefecto: pr.fechaefecto ?? null,
          fechafin: pr.fechafin ?? null,
        },
        { transaction },
      );
    }
  }
};
// URL completa de imagen 
const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${imagePath}`;
};

// Una presentación "califica" para un idtipoCli si tiene un precio específico
// de ese tipo, o si no tiene NINGÚN precio cargado (cae a precio_venta como
// fallback). Si tiene precios pero solo de OTROS tipos (ej. solo mayorista,
// y se pide minorista), no califica: la presentación no se ofreció nunca a
// ese tipo de cliente, así que se excluye en vez de mostrar un precio que
// no le corresponde.
// Con precios por variante: la calificación se decide sobre los precios GENÉRICOS (idvariante
// NULL; sin la columna cargada = genérico, como antes). Si no hay genéricos (solo overrides de
// variantes, o nada) la presentación cae a precio_venta para todos y califica; y un override de
// variante para ese tipo de cliente también la hace calificar.
const presentacionCalifica = (precios, idtipoCli) => {
  if (!precios || precios.length === 0) return true;
  const genericos = precios.filter((p) => p.idvariante == null);
  if (genericos.length === 0) return true;
  return precios.some((p) => p.idtipoCli === idtipoCli);
};

// Filas de precio de variantes DESHABILITADAS (o sin variante cargada): se ignoran. `row.Variante` es el
// include belongsTo (solo atributo estado) que trae la consulta del prefiltro por tipo de cliente.
const precioDeVarianteHabilitada = (p) => p.idvariante == null || Number(p.Variante?.estado) === 1;

// Resuelve, para una presentación ya cargada (con su .Precios activos anidados),
// el precio de lista según el tipo de cliente/venta pedido: si existe un precio
// específico para ese idtipoCli lo usa, si no cae al precio_venta general
// (mismo criterio de fallback que obtenerPrecioCorrecto en precio-helper.js,
// pero sin aplicar descuentos por cantidad: acá es catálogo/listado, todavía
// no hay una cantidad elegida — el descuento se sigue resolviendo recién al
// confirmar la venta, como ya hacía createVentaFtr).
const resolverPrecioPorTipoCliente = (presentacion, idtipoCli) => {
  const precios = presentacion.Precios || [];
  // precio_venta resuelto = el GENÉRICO del tipo de cliente (los de variante no son "el" precio
  // de la presentación: aplican solo a esa variante y viajan aparte en Precios).
  const especifico = precios.find((p) => p.idtipoCli === idtipoCli && p.idvariante == null);
  const deVariantes = precios.filter((p) => p.idtipoCli === idtipoCli && p.idvariante != null);
  return {
    ...presentacion,
    precio_venta: especifico ? Number(especifico.precio) : presentacion.precio_venta,
    // Se recorta a solo el precio que matcheó (o vacío si se usó el fallback a
    // precio_venta) para que el front no tenga que adivinar cuál de todos los
    // precios cargados es "el" precio: precio_venta ya es la única fuente de verdad.
    // Los overrides por variante de ese tipo de cliente quedan en la lista (traen su idvariante);
    // separarPreciosGenericosYDeVariante los pasa luego a PreciosVariante.
    Precios: [...(especifico ? [especifico] : []), ...deVariantes],
  };
};

// Precios de una presentación para el DTO: solo genéricos y de variantes HABILITADAS (las de una
// variante deshabilitada se conservan en la BD pero no se ofrecen).
const preciosVisibles = (precios, idsVariantesHabilitadas) =>
  precios.filter((p) => p.idvariante == null || idsVariantesHabilitadas.has(p.idvariante));

// Contrato aditivo: `Precios` queda SOLO con los genéricos y sin la clave idvariante (forma de siempre,
// para los front que no conocen variantes). Los de variante viajan aparte en `PreciosVariante`
// (misma forma de fila + idvariante), y esa clave solo existe si hay al menos uno.
const separarPreciosGenericosYDeVariante = (presentacion) => {
  if (!Array.isArray(presentacion.Precios)) return presentacion;
  const genericos = presentacion.Precios.filter((p) => p.idvariante == null).map((p) => {
    const { idvariante, ...resto } = p;
    return resto;
  });
  const deVariante = presentacion.Precios.filter((p) => p.idvariante != null);
  return {
    ...presentacion,
    Precios: genericos,
    ...(deVariante.length > 0 ? { PreciosVariante: deVariante } : {}),
  };
};

// Variante -> DTO plano. Orden: Talla.orden, luego la talla (para agrupar), luego
// nombre de color, luego idvariante. Sin talla / sin color van al final de su criterio.
// Se ordena en memoria (no en SQL) para no depender de ORDER BY sobre un hasMany anidado.
const variantesToDTO = (variantes) =>
  [...(variantes || [])]
    .sort((a, b) => {
      const ordA = a.Talla?.orden ?? Number.POSITIVE_INFINITY;
      const ordB = b.Talla?.orden ?? Number.POSITIVE_INFINITY;
      if (ordA !== ordB) return ordA < ordB ? -1 : 1;
      const tallaA = a.Talla?._id ?? Number.POSITIVE_INFINITY;
      const tallaB = b.Talla?._id ?? Number.POSITIVE_INFINITY;
      if (tallaA !== tallaB) return tallaA < tallaB ? -1 : 1;
      if (a.Color && b.Color) {
        const porNombre = a.Color.nombre.localeCompare(b.Color.nombre);
        if (porNombre !== 0) return porNombre;
      } else if (a.Color || b.Color) {
        return a.Color ? -1 : 1;
      }
      return a.idvariante - b.idvariante;
    })
    .map((v) => ({
      idvariante: v.idvariante,
      sku: v.sku ?? null,
      estado: v.estado,
      talla: v.Talla ? { id: v.Talla._id, nombre: v.Talla.nombre, tipo: v.Talla.tipo } : null,
      color: v.Color ? { id: v.Color._id, nombre: v.Color.nombre, hex: v.Color.hex ?? null } : null,
    }));

const toDTO = (req, producto, idtipoCli = null) => {
  const data = typeof producto.toJSON === 'function' ? producto.toJSON() : { ...producto };
  data.imageUrl = buildImageUrl(req, data.imagen);
  // Campos de variantes/público objetivo (se reemplazan las claves crudas de los includes
  // "Publico"/"Variantes" por su forma de DTO). tiene_variantes NULL en BD cuenta como false.
  data.idpublico = data.idpublico ?? null;
  data.publico = data.Publico ? { id: data.Publico._id, nombre: data.Publico.nombre } : null;
  delete data.Publico;
  data.tiene_variantes = Boolean(data.tiene_variantes);
  const idsVariantesHabilitadas = new Set(
    (data.Variantes || []).filter((v) => Number(v.estado) === 1).map((v) => v.idvariante),
  );
  data.variantes = variantesToDTO(data.Variantes);
  delete data.Variantes;
  if (Array.isArray(data.Presentaciones)) {
    data.Presentaciones = data.Presentaciones.map((p) =>
      Array.isArray(p.Precios) ? { ...p, Precios: preciosVisibles(p.Precios, idsVariantesHabilitadas) } : p,
    );
  }
  if (idtipoCli !== null && Array.isArray(data.Presentaciones)) {
    data.Presentaciones = data.Presentaciones
      .filter((p) => presentacionCalifica(p.Precios, idtipoCli))
      .map((p) => resolverPrecioPorTipoCliente(p, idtipoCli));
  }
  if (Array.isArray(data.Presentaciones)) {
    data.Presentaciones = data.Presentaciones.map(separarPreciosGenericosYDeVariante);
  }
  return data;
};

const getProductosFtr = async (req, query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  // Filtro opcional: si viene idtipoCli, el listado incluye solo productos con
  // al menos una presentación que "califique" para ese tipo (ver presentacionCalifica),
  // y cada presentación calificante devuelve su precio_venta resuelto para ese tipo.
  // Si no viene idtipoCli, el listado se comporta exactamente igual que antes.
  const idtipoCliRaw = query.idtipoCli !== undefined && query.idtipoCli !== "" ? parseInt(query.idtipoCli) : null;
  const idtipoCli = Number.isNaN(idtipoCliRaw) ? null : idtipoCliRaw;

  let where = { estado: 1 };

  // Filtro opcional: idpublico filtra por una columna propia de producto, así que va
  // directo al where (sin JOIN: no afecta la paginación). Un valor no numérico es un 400.
  if (query.idpublico !== undefined && query.idpublico !== "") {
    if (!esEnteroPositivo(query.idpublico)) {
      throw errorDeNegocio(400, "idpublico debe ser un ID numérico");
    }
    where.idpublico = Number(query.idpublico);
  }

  if (idtipoCli !== null) {
    // Resolver de una sola vez, en memoria, qué productos tienen al menos una
    // presentación activa que califique para este idtipoCli. Necesario ANTES
    // de armar la paginación: si filtráramos después de traer la página, un
    // producto descartado dejaría la página con menos de `limit` resultados
    // (mismo problema de fondo que el bug de paginación con includes hasMany).
    const presentacionesActivas = await models.ProductoPresentacion.findAll({
      where: { estado: 1 },
      attributes: ["codigoprod"],
      include: [{
        model: models.Precio,
        as: "Precios",
        where: { estado: 1 },
        attributes: ["idtipoCli", "idvariante"],
        required: false,
        // belongsTo (no multiplica filas): solo para ignorar precios de variantes DESHABILITADAS,
        // igual que el DTO (así el prefiltro y toDTO coinciden).
        include: [{ association: "Variante", attributes: ["idvariante", "estado"], required: false }],
      }],
    });

    const codigosCalifican = new Set(
      presentacionesActivas
        .filter((pp) => presentacionCalifica((pp.Precios || []).filter(precioDeVarianteHabilitada), idtipoCli))
        .map((pp) => pp.codigoprod),
    );

    where.codigoprod = { [Op.in]: [...codigosCalifican] };
  }

  if (search) {
    // La búsqueda por código de barras se resuelve aparte, contra
    // ProductoPresentacion directamente, en vez de usar `$Presentaciones.codigo_barras$`
    // en el where de Producto: Presentaciones es un hasMany, y referenciarlo ahí
    // obliga a hacer JOIN a un hasMany en la consulta principal — eso duplica filas
    // y rompe la paginación igual que un `include` hasMany (ver nota más abajo y
    // en getVentasFtr, controllers/ventas/feature.js). Resolviendo los codigoprod
    // coincidentes primero, el filtro queda como un simple `codigoprod IN (...)`.
    const presentacionesMatch = await models.ProductoPresentacion.findAll({
      where: { codigo_barras: { [Op.like]: `%${search}%` }, estado: 1 },
      attributes: ["codigoprod"],
    });
    const codigosProdPorBarcode = presentacionesMatch.map((p) => p.codigoprod);

    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { descripcion: { [Op.like]: `%${search}%` } },
      ...(codigosProdPorBarcode.length ? [{ codigoprod: { [Op.in]: codigosProdPorBarcode } }] : []),
    ];
  }

  if (!hasPagination) {
    const { count, rows } = await models.Producto.findAndCountAll({
      where,
      include: INCLUDE_PRODUCTO_LISTADO,
      order: [["nombre", "ASC"]],
      distinct: true,
    });
    return { data: rows.map((p) => toDTO(req, p, idtipoCli)), meta: { total: count } };
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  // Paso 1: resolver qué codigoprod entran en esta página, SIN los includes
  // hasMany (Presentaciones y su Precios anidado, Variantes) de por medio. Con un hasMany
  // en el include, LIMIT se aplica sobre las filas del JOIN (una por cada
  // presentación/precio), no sobre productos distintos: un producto con varias
  // presentaciones "consume" varias posiciones del limit y terminan devolviéndose
  // menos productos de los pedidos por página.
  const { count, rows: idRows } = await models.Producto.findAndCountAll({
    where,
    attributes: ["codigoprod"],
    order: [["nombre", "ASC"]],
    distinct: true,
    limit,
    offset: (page - 1) * limit,
  });

  const totalPages = Math.ceil(count / limit);
  if (idRows.length === 0) {
    return { data: [], meta: { total: count, totalPages, currentPage: page, limit } };
  }

  // Paso 2: traer esos productos completos (con Presentaciones/Precios/Variantes) para los codigoprod de esta página
  const codigos = idRows.map((r) => r.codigoprod);
  const rows = await models.Producto.findAll({
    where: { codigoprod: { [Op.in]: codigos } },
    include: INCLUDE_PRODUCTO_LISTADO,
    order: [["nombre", "ASC"]],
  });

  return {
    data: rows.map((p) => toDTO(req, p, idtipoCli)),
    meta: { total: count, totalPages, currentPage: page, limit },
  };
};

const getProductoFtr = async (req, id, query = {}) => {
  const producto = await models.Producto.findOne({
    where: { codigoprod: id },
    include: INCLUDE_PRODUCTO,
  });
  if (!producto) {
    const error = new Error("Producto no encontrado");
    error.status = 404;
    throw error;
  }
  const idtipoCli = query.idtipoCli !== undefined && query.idtipoCli !== "" ? parseInt(query.idtipoCli) : null;
  // Si req es null (llamado internamente sin contexto HTTP) retornar el modelo puro
  return req ? toDTO(req, producto, idtipoCli) : producto;
};

const createProductoFtr = async (req, body, file) => {
  const transaction = await models.sequelize.transaction();
  try {
    const { presentaciones, variantes, ...productData } = body;
    const imagen = file ? `/productos/${file.filename}` : null;

    // Variantes: tiene_variantes ausente = false. Con false no se admiten variantes;
    // con true se exige al menos una activa. Todo se valida antes de escribir nada.
    const tieneVariantes = normalizarBooleano(productData.tiene_variantes, "tiene_variantes") ?? false;
    const entradasVariantes = variantes === undefined ? [] : normalizarVariantesEntrantes(variantes);
    if (!tieneVariantes && entradasVariantes.length > 0) {
      throw errorDeNegocio(400, "Para enviar variantes, tiene_variantes debe ser true", "VARIANTES_NO_PERMITIDAS");
    }
    if (tieneVariantes && !entradasVariantes.some((e) => e.estado !== 0)) {
      throw errorDeNegocio(
        400,
        "Un producto con tiene_variantes necesita al menos una variante activa",
        "VARIANTES_REQUERIDAS",
      );
    }
    productData.tiene_variantes = tieneVariantes;

    // Precios por variante (presentaciones[].precios[].idvariante): sin tiene_variantes => 400
    // PRECIO_VARIANTE_NO_PERMITIDA. En el alta las variantes todavía no existen (se crean más abajo y
    // sus IDs recién salen del insert), así que ninguna puede referenciarse: se crea el producto y
    // luego se cargan los precios por variante con un PUT.
    if (Array.isArray(presentaciones)) {
      normalizarVariantesDePrecios(presentaciones);
      exigirProductoConVariantesParaPrecios(presentaciones, tieneVariantes);
      const idsVariantesPrecios = idsDeVariantesEnPrecios(presentaciones);
      if (idsVariantesPrecios.length > 0) {
        throw errorDeNegocio(
          400,
          "No se pueden cargar precios por variante al crear el producto: las variantes todavía no existen. " +
            "Cree el producto y luego asigne los precios por variante al editarlo",
          "PRECIO_VARIANTE_INVALIDA",
          idsVariantesPrecios.map((idvariante) => ({ idvariante })),
        );
      }
    }
    await validarPublicoObjetivo(productData.idpublico, transaction);

    // Validar que las FKs existan
    if (productData.idmarca) {
      const marca = await models.Marca.findByPk(productData.idmarca, { transaction });
      if (!marca) { const err = new Error("La marca no existe"); err.status = 404; throw err; }
    }
    if (productData.idcategoria) {
      const cat = await models.Categoria.findByPk(productData.idcategoria, { transaction });
      if (!cat) { const err = new Error("La categoría no existe"); err.status = 404; throw err; }
    }
    if (productData.idunidad) {
      const und = await models.UnidadMed.findByPk(productData.idunidad, { transaction });
      if (!und) { const err = new Error("La unidad de medida no existe"); err.status = 404; throw err; }
    }

    const producto = await models.Producto.create(
      { ...productData, imagen },
      { transaction },
    );

    // Crear presentaciones asociadas (y, si vienen, sus precios por tipo de cliente)
    if (presentaciones && presentaciones.length > 0) {
      await validarTiposClienteDePrecios(presentaciones, transaction);

      for (const p of presentaciones) {
        await validarCodigoBarrasDePresentacion(p.codigo_barras, undefined, transaction);
        const pp = await models.ProductoPresentacion.create(
          {
            codigoprod: producto.codigoprod,
            idpresentacion: p.idpresentacion,
            cantidad_base: p.cantidad_base ?? 1,
            precio_venta: p.precio_venta ?? 0,
            codigo_barras: p.codigo_barras ?? null,
          },
          { transaction },
        );

        // "precios" es opcional: si el usuario solo maneja precio_venta, no pasa nada.
        await crearPreciosDePresentacion(pp.idprodPresenta, p.precios, transaction);
      }
    }

    // Crear variantes (no hay existentes: todas se crean). No se crean filas de
    // Almacen/Kardex acá: el stock por variante nace al comprar.
    if (entradasVariantes.length > 0) {
      await sincronizarVariantes(producto.codigoprod, entradasVariantes, transaction);
    }

    await transaction.commit();

    const creado = await models.Producto.findOne({
      where: { codigoprod: producto.codigoprod },
      include: INCLUDE_PRODUCTO,
    });
    return toDTO(req, creado);

  } catch (error) {
    await transaction.rollback();
    if (file) deleteImageFile(`/productos/${file.filename}`);
    throw traducirErrorDeVariantes(error);
  }
};

const updateProductoFtr = async (req, id, body, file) => {
  const transaction = await models.sequelize.transaction();
  try {
    const { presentaciones, variantes, ...productData } = body;
    const producto = await getProductoFtr(null, id);
    const imagenAnterior = producto.imagen;

    // Precios por variante: idvariante estricto (400 PRECIO_VARIANTE_INVALIDA) antes de tocar nada.
    if (Array.isArray(presentaciones)) normalizarVariantesDePrecios(presentaciones);
    const tocaPreciosDeVariante = Array.isArray(presentaciones) && idsDeVariantesEnPrecios(presentaciones).length > 0;

    // La imagen solo cambia subiendo un archivo: un "imagen" en el body se ignora
    // (si no, se podría apuntar la columna a una ruta arbitraria).
    delete productData.imagen;
    if (file) {
      productData.imagen = `/productos/${file.filename}`;
    }

    // Variantes. Contrato: variantes ausente (undefined) = no tocar; [] = deshabilitar todas;
    // array con elementos = sincronizar. tiene_variantes ausente = se conserva el valor actual.
    // El bloque solo corre si el body toca algo de variantes (flag o array), para no
    // bloquear ediciones no relacionadas de productos con datos legacy.
    const nuevoFlag = normalizarBooleano(productData.tiene_variantes, "tiene_variantes");
    const tocaVariantes = nuevoFlag !== undefined || variantes !== undefined;
    let entradasVariantes;
    let flagFinal = Boolean(producto.tiene_variantes);
    // Se bloquea la fila del producto: serializa ediciones concurrentes de sus variantes. También cuando
    // algún precio referencia una variante: así esos precios no compiten con deshabilitar/editar variantes.
    const bloqueado = (tocaVariantes || tocaPreciosDeVariante)
      ? await models.Producto.findByPk(id, {
          attributes: ["codigoprod", "tiene_variantes"],
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
      : null;
    if (tocaVariantes) {
      const flagActual = Boolean(bloqueado?.tiene_variantes);
      flagFinal = nuevoFlag === undefined ? flagActual : nuevoFlag;

      entradasVariantes = variantes === undefined ? undefined : normalizarVariantesEntrantes(variantes);
      if (!flagFinal && entradasVariantes && entradasVariantes.length > 0) {
        throw errorDeNegocio(400, "Para enviar variantes, tiene_variantes debe ser true", "VARIANTES_NO_PERMITIDAS");
      }
      // (El mínimo de una variante activa con tiene_variantes=true se verifica AL FINAL,
      // tras sincronizar: así un [] sobre variantes con stock responde 409 antes que 400.)

      await validarCambioDeModoDeVariantes(producto.codigoprod, flagActual, flagFinal, transaction);

      // Al dejar de manejar variantes se deshabilitan las que quedaban activas
      // (mantiene el invariante: tiene_variantes=false => sin variantes activas).
      if (!flagFinal && entradasVariantes === undefined) entradasVariantes = [];

      if (nuevoFlag !== undefined) productData.tiene_variantes = nuevoFlag;
    }

    // Público objetivo: solo se valida si cambia (no bloquear editar un producto cuyo
    // público se deshabilitó después en el catálogo). Va DESPUÉS del lock del producto:
    // una lectura previa fijaría el snapshot (REPEATABLE READ) antes de esperar el lock.
    if (productData.idpublico !== undefined && productData.idpublico !== null
        && Number(productData.idpublico) !== producto.idpublico) {
      await validarPublicoObjetivo(productData.idpublico, transaction);
    }

    await producto.update(productData, { transaction });

    // Precios por variante: producto con variantes (tras este mismo PUT) y variantes de ESTE producto,
    // habilitadas, leídas con lock. (Una variante que este mismo PUT deshabilita después conserva su
    // precio: queda sin ofrecerse, ver "Precios por variante".)
    if (tocaPreciosDeVariante) {
      await validarVariantesDePrecios(
        producto.codigoprod,
        tocaVariantes ? flagFinal : Boolean(bloqueado?.tiene_variantes),
        presentaciones,
        transaction,
      );
    }

    // Actualizar presentaciones: modificar existentes, crear nuevas, soft-delete las removidas
    if (presentaciones && presentaciones.length > 0) {
      await validarTiposClienteDePrecios(presentaciones, transaction);

      const existentes = await models.ProductoPresentacion.findAll({
        where: { codigoprod: id },
        transaction,
      });

      const idsEntrantes = presentaciones.map((p) => p.idpresentacion);

      // Soft-delete las que ya no están
      for (const ex of existentes) {
        if (!idsEntrantes.includes(ex.idpresentacion)) {
          await ex.update({ estado: 0 }, { transaction });
        }
      }

      // Crear o actualizar
      for (const p of presentaciones) {
        const existente = existentes.find((ex) => ex.idpresentacion === p.idpresentacion);
        if (existente) {
          const updateData = { estado: 1 };
          if (p.cantidad_base !== undefined) updateData.cantidad_base = p.cantidad_base;
          if (p.precio_venta !== undefined) updateData.precio_venta = p.precio_venta;
          if (p.codigo_barras !== undefined) {
            await validarCodigoBarrasDePresentacion(p.codigo_barras, existente.codigo_barras, transaction);
            updateData.codigo_barras = p.codigo_barras;
          }
          await existente.update(updateData, { transaction });

          // "precios" es opcional: si no viene, se respeta lo que ya existe
          // (el usuario puede seguir manejando solo precio_venta sin tocar precios).
          if (p.precios !== undefined) {
            await sincronizarPreciosDePresentacion(existente.idprodPresenta, p.precios, transaction);
          }
        } else {
          await validarCodigoBarrasDePresentacion(p.codigo_barras, undefined, transaction);
          const nueva = await models.ProductoPresentacion.create(
            {
              codigoprod: id,
              idpresentacion: p.idpresentacion,
              cantidad_base: p.cantidad_base ?? 1,
              precio_venta: p.precio_venta ?? 0,
              codigo_barras: p.codigo_barras ?? null,
            },
            { transaction },
          );
          await crearPreciosDePresentacion(nueva.idprodPresenta, p.precios, transaction);
        }
      }
    }

    // Sincronizar variantes (solo si el body las tocó). Sin filas de Almacen/Kardex acá.
    if (entradasVariantes !== undefined) {
      await sincronizarVariantes(producto.codigoprod, entradasVariantes, transaction);
    }
    // Invariante de cierre: tiene_variantes=true exige al menos una variante activa.
    if (tocaVariantes && flagFinal) {
      if ((await contarVariantesActivas(producto.codigoprod, transaction)) === 0) {
        throw errorDeNegocio(
          400,
          "Un producto con tiene_variantes necesita al menos una variante activa",
          "VARIANTES_REQUERIDAS",
        );
      }
    }

    await transaction.commit();

    // La imagen anterior se borra recién con la transacción confirmada: si algo falló
    // (p. ej. un 409 de variantes) el producto conserva su imagen.
    if (file) deleteImageFile(imagenAnterior);

    const actualizado = await models.Producto.findOne({
      where: { codigoprod: id },
      include: INCLUDE_PRODUCTO,
    });
    return toDTO(req, actualizado);
  } catch (error) {
    await transaction.rollback();
    if (file) deleteImageFile(`/productos/${file.filename}`);
    throw traducirErrorDeVariantes(error);
  }
};

// Baja lógica. Se bloquea la fila del producto (serializa contra ediciones de variantes),
// se rechaza si queda stock en cualquier almacén (con o sin variante) y se deshabilitan
// sus variantes para mantener el invariante estado=0 => sin variantes activas.
// La imagen NO se borra: el producto sigue existiendo (kardex, ventas históricas).
const deleteProductoFtr = async (id) => {
  const transaction = await models.sequelize.transaction();
  try {
    const producto = await models.Producto.findOne({
      where: { codigoprod: id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!producto) {
      throw errorDeNegocio(404, "Producto no encontrado");
    }

    // Variantes primero (mutex por variante), luego stock con lock: así una venta/compra en
    // vuelo termina antes de leer. Una venta/compra/cotización NUEVA que llegue después toma el
    // lock compartido del producto (espera a este commit), relee producto.estado ya en 0 y
    // responde 400 PRODUCTO_INACTIVO (helpers/variante-helper.js: validarProductoActivo); por eso
    // la carrera queda cerrada también para productos sin variantes. Las anulaciones (reversas)
    // siguen permitidas sobre productos dados de baja.
    await bloquearVariantesDelProducto(producto.codigoprod, transaction);
    const conStock = await models.Almacen.findAll({
      where: { codigoprod: producto.codigoprod, stock: { [Op.gt]: 0 } },
      attributes: ["idvariante", "stock"],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (conStock.length > 0) {
      throw errorDeNegocio(
        409,
        "No se puede eliminar el producto: todavía tiene stock. Ajuste o mueva el stock antes de eliminarlo.",
        "PRODUCTO_CON_STOCK",
        conStock.map((f) => ({ idvariante: f.idvariante ?? null, stock: Number(f.stock) })),
      );
    }

    await models.ProductoVariante.update(
      { estado: 0 },
      { where: { codigoprod: producto.codigoprod }, transaction },
    );
    await producto.update({ estado: 0 }, { transaction });

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  getProductosFtr,
  getProductoFtr,
  createProductoFtr,
  updateProductoFtr,
  deleteProductoFtr,
};
