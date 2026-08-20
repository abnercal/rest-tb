const { Op } = require("sequelize");
const models = require("../../models/mysql");
const { deleteImageFile } = require("../../utils/imagen");

const INCLUDE_PRODUCTO = [
  "Marca", "Categoria", "Unidad",
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

// Crea las filas de Precio para una presentación recién creada.
const crearPreciosDePresentacion = async (idprodPresenta, precios, transaction) => {
  if (!precios || precios.length === 0) return;
  const rows = precios.map((pr) => ({
    idprodPresenta,
    idtipoCli: pr.idtipoCli,
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

  const activos = await models.Precio.findAll({
    where: { idprodPresenta, estado: 1 },
    transaction,
  });

  const idsTipoCliEntrantes = precios.map((pr) => pr.idtipoCli);

  // Deshabilitar los que ya no vienen en el array entrante
  for (const activo of activos) {
    if (!idsTipoCliEntrantes.includes(activo.idtipoCli)) {
      await activo.update({ estado: 0 }, { transaction });
    }
  }

  // Crear o actualizar (y reactivar) los que sí vienen
  for (const pr of precios) {
    const existente = activos.find((ex) => ex.idtipoCli === pr.idtipoCli);
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
const presentacionCalifica = (precios, idtipoCli) => {
  if (!precios || precios.length === 0) return true;
  return precios.some((p) => p.idtipoCli === idtipoCli);
};

// Resuelve, para una presentación ya cargada (con su .Precios activos anidados),
// el precio de lista según el tipo de cliente/venta pedido: si existe un precio
// específico para ese idtipoCli lo usa, si no cae al precio_venta general
// (mismo criterio de fallback que obtenerPrecioCorrecto en precio-helper.js,
// pero sin aplicar descuentos por cantidad: acá es catálogo/listado, todavía
// no hay una cantidad elegida — el descuento se sigue resolviendo recién al
// confirmar la venta, como ya hacía createVentaFtr).
const resolverPrecioPorTipoCliente = (presentacion, idtipoCli) => {
  const especifico = (presentacion.Precios || []).find((p) => p.idtipoCli === idtipoCli);
  return {
    ...presentacion,
    precio_venta: especifico ? Number(especifico.precio) : presentacion.precio_venta,
    // Se recorta a solo el precio que matcheó (o vacío si se usó el fallback a
    // precio_venta) para que el front no tenga que adivinar cuál de todos los
    // precios cargados es "el" precio: precio_venta ya es la única fuente de verdad.
    Precios: especifico ? [especifico] : [],
  };
};

const toDTO = (req, producto, idtipoCli = null) => {
  const data = typeof producto.toJSON === 'function' ? producto.toJSON() : { ...producto };
  data.imageUrl = buildImageUrl(req, data.imagen);
  if (idtipoCli !== null && Array.isArray(data.Presentaciones)) {
    data.Presentaciones = data.Presentaciones
      .filter((p) => presentacionCalifica(p.Precios, idtipoCli))
      .map((p) => resolverPrecioPorTipoCliente(p, idtipoCli));
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

  if (idtipoCli !== null) {
    // Resolver de una sola vez, en memoria, qué productos tienen al menos una
    // presentación activa que califique para este idtipoCli. Necesario ANTES
    // de armar la paginación: si filtráramos después de traer la página, un
    // producto descartado dejaría la página con menos de `limit` resultados
    // (mismo problema de fondo que el bug de paginación con includes hasMany).
    const presentacionesActivas = await models.ProductoPresentacion.findAll({
      where: { estado: 1 },
      attributes: ["codigoprod"],
      include: [{ model: models.Precio, as: "Precios", where: { estado: 1 }, attributes: ["idtipoCli"], required: false }],
    });

    const codigosCalifican = new Set(
      presentacionesActivas
        .filter((pp) => presentacionCalifica(pp.Precios, idtipoCli))
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
      include: INCLUDE_PRODUCTO,
      order: [["nombre", "ASC"]],
      distinct: true,
    });
    return { data: rows.map((p) => toDTO(req, p, idtipoCli)), meta: { total: count } };
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  // Paso 1: resolver qué codigoprod entran en esta página, SIN los includes
  // hasMany (Presentaciones, y su Precios anidado) de por medio. Con un hasMany
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

  // Paso 2: traer esos productos completos (con Presentaciones/Precios) para los codigoprod de esta página
  const codigos = idRows.map((r) => r.codigoprod);
  const rows = await models.Producto.findAll({
    where: { codigoprod: { [Op.in]: codigos } },
    include: INCLUDE_PRODUCTO,
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
    const { presentaciones, ...productData } = body;
    const imagen = file ? `/productos/${file.filename}` : null;

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

    await transaction.commit();

    const creado = await models.Producto.findOne({
      where: { codigoprod: producto.codigoprod },
      include: INCLUDE_PRODUCTO,
    });
    return toDTO(req, creado);

  } catch (error) {
    await transaction.rollback();
    if (file) deleteImageFile(`/productos/${file.filename}`);
    throw error;
  }
};

const updateProductoFtr = async (req, id, body, file) => {
  const transaction = await models.sequelize.transaction();
  try {
    const { presentaciones, ...productData } = body;
    const producto = await getProductoFtr(null, id);

    if (file) {
      deleteImageFile(producto.imagen);
      productData.imagen = `/productos/${file.filename}`;
    }

    await producto.update(productData, { transaction });

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
          if (p.codigo_barras !== undefined) updateData.codigo_barras = p.codigo_barras;
          await existente.update(updateData, { transaction });

          // "precios" es opcional: si no viene, se respeta lo que ya existe
          // (el usuario puede seguir manejando solo precio_venta sin tocar precios).
          if (p.precios !== undefined) {
            await sincronizarPreciosDePresentacion(existente.idprodPresenta, p.precios, transaction);
          }
        } else {
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

    await transaction.commit();

    const actualizado = await models.Producto.findOne({
      where: { codigoprod: id },
      include: INCLUDE_PRODUCTO,
    });
    return toDTO(req, actualizado);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteProductoFtr = async (id) => {
  const producto = await getProductoFtr(null,id);
  deleteImageFile(producto.imagen);
  await producto.update({ estado: 0 });
  return true;
};

module.exports = {
  getProductosFtr,
  getProductoFtr,
  createProductoFtr,
  updateProductoFtr,
  deleteProductoFtr,
};
