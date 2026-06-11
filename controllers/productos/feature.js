const { Op } = require("sequelize");
const models = require("../../models/mysql");
const { deleteImageFile } = require("../../utils/imagen");

const INCLUDE_PRODUCTO = [
  "Marca", "Categoria", "Unidad",
  { association: "Presentaciones", include: ["Presentacion"] },
];
// URL completa de imagen 
const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}${imagePath}`;
};

const toDTO = (req, producto) => {
  const data = typeof producto.toJSON === 'function' ? producto.toJSON() : { ...producto };
  data.imageUrl = buildImageUrl(req, data.imagen);
  return data;
};

const getProductosFtr = async (req, query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { descripcion: { [Op.like]: `%${search}%` } },
      { '$Presentaciones.codigo_barras$': { [Op.like]: `%${search}%` } },
    ];
  }

  let findOptions = {
    where,
    include: INCLUDE_PRODUCTO,
    order: [["nombre", "ASC"]],
    distinct: true,
  };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.Producto.findAndCountAll(findOptions);
    return {
      data: rows.map((p) => toDTO(req, p)),
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.Producto.findAndCountAll(findOptions);
  return { data: rows.map((p) => toDTO(req, p)), meta: { total: count } };
};

const getProductoFtr = async (req, id) => {
  const producto = await models.Producto.findOne({
    where: { codigoprod: id },
    include: INCLUDE_PRODUCTO,
  });
  if (!producto) {
    const error = new Error("Producto no encontrado");
    error.status = 404;
    throw error;
  }
  // Si req es null (llamado internamente sin contexto HTTP) retornar el modelo puro
  return req ? toDTO(req, producto) : producto;
};

const createProductoFtr = async (req, body, file) => {
  const transaction = await models.sequelize.transaction();
  try {
    const { presentaciones, ...productData } = body;
    const imagen = file ? `/productos/${file.filename}` : null;

    const producto = await models.Producto.create(
      { ...productData, imagen },
      { transaction },
    );

    // Crear presentaciones asociadas
    if (presentaciones && presentaciones.length > 0) {
      const rows = presentaciones.map((p) => ({
        codigoprod: producto.codigoprod,
        idpresentacion: p.idpresentacion,
        cantidad_base: p.cantidad_base ?? 1,
        precio_venta: p.precio_venta ?? 0,
        codigo_barras: p.codigo_barras ?? null,
      }));
      await models.ProductoPresentacion.bulkCreate(rows, { transaction });
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
          await existente.update(
            {
              cantidad_base: p.cantidad_base ?? 1,
              precio_venta: p.precio_venta ?? 0,
              codigo_barras: p.codigo_barras ?? null,
              estado: 1,
            },
            { transaction },
          );
        } else {
          await models.ProductoPresentacion.create(
            {
              codigoprod: id,
              idpresentacion: p.idpresentacion,
              cantidad_base: p.cantidad_base ?? 1,
              precio_venta: p.precio_venta ?? 0,
              codigo_barras: p.codigo_barras ?? null,
            },
            { transaction },
          );
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
