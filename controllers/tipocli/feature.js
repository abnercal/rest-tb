const { Op } = require("sequelize");
const models = require("../../models/mysql");


const getTiposlCieFtr = async (query) => {
  const search = query.search || "";
  const hasPagination = query.page !== undefined || query.limit !== undefined;

  let where = { /*estado: 1*/ };
  
  if (search) {
    where.nombre = { [Op.like]: `%${search}%` };
  }

  let findOptions = { where, order: [["nombre","ASC"]] };

  if (hasPagination) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    findOptions.limit = limit;
    findOptions.offset = (page - 1) * limit;

    const { count, rows } = await models.TipoCliente.findAndCountAll(findOptions);
    return { 
      data: rows,
      meta: { total: count, totalPages: Math.ceil(count / limit), currentPage: page, limit },
    };
  }

  const { count, rows } = await models.TipoCliente.findAndCountAll(findOptions);
  return { data: rows, meta: { total: count } };
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