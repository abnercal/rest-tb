const { Op } = require("sequelize");
const models = require("../../models/mysql");
const { deleteImageFile } = require("../../utils/imagen");

const INCLUDE_PRODUCTO = ["Marca", "Presentacion", "Categoria", "Unidad"];
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
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = { estado: 1 };
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { descripcion: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await models.Producto.findAndCountAll({
    where,
    include: INCLUDE_PRODUCTO,
    limit: parseInt(limit),
    offset,
    order: [["nombre", "ASC"]],
    distinct: true,
  });

  return {
    data: rows.map((p) => toDTO(req, p)),
    meta: {
      total: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      limit: parseInt(limit),
    },
  };
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
    const imagen = file ? `/productos/${file.filename}` : null;
    const producto = await models.Producto.create({...body, imagen}, { transaction });
    await transaction.commit();
    
    /*return models.Producto.findOne({
      where: { codigoprod: producto.codigoprod },
      include: INCLUDE_PRODUCTO,
    });*/

    const creado = await models.Producto.findOne({
      where: { codigoprod: producto.codigoprod },
      include: INCLUDE_PRODUCTO,
    });
    return toDTO(req, creado);

  } catch (error) {
    await transaction.rollback();
    // Si falló el create pero ya se guardó el archivo, borrarlo
    if (file) deleteImageFile(`/productos/${file.filename}`);
    throw error;
  }
};

const updateProductoFtr = async (req, id, body, file) => {
  const transaction = await models.sequelize.transaction();
  try {
    // Usamos getProductoFtr sin req para obtener el modelo Sequelize puro
    const producto = await getProductoFtr(null, id);

    if (file) {
      deleteImageFile(producto.imagen);              // borra la vieja del disco
      body.imagen = `/productos/${file.filename}`;
    }

    await producto.update(body, { transaction });
    await transaction.commit();
    /*return models.Producto.findOne({
      where: { codigoprod: id },
      include: INCLUDE_PRODUCTO,
    }); */

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
