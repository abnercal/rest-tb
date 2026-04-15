const { Op } = require("sequelize");
const models = require("../../models/mysql");


const getMarcasFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = { /*estado: 1*/ };
  
  if (search) {
    where.nombre = { [Op.like]: `%${search}%` };
  }
  const { count, rows } = await models.Marca.findAndCountAll({
    where, 
    limit: parseInt(limit), 
    offset, 
    order: [["nombre","ASC"]],
  });
  return { 
    data: rows,
    meta: { 
        total: count, 
        totalPages: Math.ceil(count/parseInt(limit)), 
        currentPage: +page, 
        limit: +limit 
    } 
    };
};
const getMarcaFtr = async (id) => {
  const marca = await models.Marca.findByPk(id);
  if (!marca) {
    const error = new Error("Marca no encontrada");
    error.status = 404;
    throw error;
  }
  return marca;
};

const createMarcaFtr = async (body) => {
  return await models.Marca.create(body);
};

const updateMarcasFtr = async (id, body) => {
  const marca = await getMarcaFtr(id);
  await marca.update(body);
  return marca;
};
const delMarcaFtr = async (id) => {
  const marca = await getMarcaFtr(id);
  await marca.update({ estado: 0 });
  return true;
};

module.exports = {
  getMarcasFtr,
  getMarcaFtr,
  createMarcaFtr,
  updateMarcasFtr,
  delMarcaFtr
};