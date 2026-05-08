const { Op } = require("sequelize");
const models = require("../../models/mysql");


const getTiposlCieFtr = async (query) => {
  const { page = 1, limit = 20, search = "" } = query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = { /*estado: 1*/ };
  
  if (search) {
    where.nombre = { [Op.like]: `%${search}%` };
  }
  const { count, rows } = await models.TipoCliente.findAndCountAll({
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
const getTipoClieFtr = async (id) => {
  const tipoClie = await models.TipoCliente.findByPk(id);
  if (!tipoClie) {
    const error = new Error("Tipo cliente no encontrada");
    error.status = 404;
    throw error;
  }
  return tipoClie;
};

module.exports = {
  getTiposlCieFtr,
  getTipoClieFtr,
};