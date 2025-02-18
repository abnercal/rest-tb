const { response, request } = require("express");
const { Op } = require("sequelize");
const moment = require("moment");
const models = require("../../models/mysql/index");

async function getCompras(req) {
  try {
    const { page = 1, search = "" } = req.query;
    const pageNumber = parseInt(page);

    const limite = 10;
    const desde = limite * (pageNumber - 1);

    let searchCondition = {};

    if (search) {
      // Verificar si el search es una fecha
      const parsedDate = moment(search, "YYYY-MM-DD", true);
      if (parsedDate.isValid()) {
        const startOfDay = parsedDate.startOf("day").toDate();
        const endOfDay = parsedDate.endOf("day").toDate();

        searchCondition = {
          [Op.or]: [
            { direccion: { [Op.like]: `%${search}%` } },
            { fecha: { [Op.between]: [startOfDay, endOfDay] } },
            { "$Proveedor.nombre$": { [Op.like]: `%${search}%` } },
          ],
        };
      } else {
        searchCondition = {
          [Op.or]: [
            { direccion: { [Op.like]: `%${search}%` } },
            { "$Proveedor.nombre$": { [Op.like]: `%${search}%` } },
          ],
        };
      }
    }
    const totalCompras = await models.Compra.count({
      where: searchCondition,
    });

    const compras = await models.Compra.findAllData({
      where: searchCondition,
      limit: limite,
      offset: desde,
      order: [["idcompra", "DESC"]],
    });
    const totalPages = Math.ceil(totalCompras / limite);

    return {
      compras,
      total: totalCompras,
      totalPages: totalPages,
      currentPage: pageNumber,
    };
  } catch (error) {}
}

async function getCompra(req, transaction) {
  const { id } = req.params;
  const compra = await models.Compra.findOneData(id);

  if (!compra) {
    throw { codigo: 404, message: `No existe el registro con el id ${id}` };
  }

  return compra;
}
async function detalleCompra(idcompra) {
  try {
    const encabezado = await models.Compra.findOne({
      attributes: ["idcompra", "fecha", "direccion"],
      include: [
        {
          model: models.Proveedor,
          attributes: ["idproveedor", "nombre"],
        },
      ],
      where: {
        idcompra: idcompra,
      },
      raw: true, // Asegura que el resultado no esté anidado
    });

    const detalles = await models.CompraDetalle.findAll({
      attributes: ["idcompra_detalle", "cantidad", "costo"],
      include: [
        {
          model: models.Compra,
          attributes: [],
          where: {
            idcompra: idcompra,
          },
        },
        {
          model: models.Producto,
          attributes: ["nombre"],
        },
      ],
      raw: true, // Esto asegura que el resultado sea plano (sin anidar los datos de las asociaciones)
    });

    return { encabezado, detalles };
  } catch (error) {
    console.error("Error al obtener los detalles de compra: ", error);
    throw error;
  }
}

async function postCompr12a(req, transaction) {
  const { body } = req;
  const { detalles } = body;

  const compra = await models.Compra.create(body, { transaction });

  for (const detalle of detalles) {
    await models.CompraDetalle.create(
      {
        ...detalle,
        idcompra: compra._id,
      },
      { transaction }
    );

    const almacen = await models.Almacen.findOne({
      where: {
        codigoprod: detalle.codigoprod,
        idsucursal: detalle.idsucursal,
      },
    });

    if (almacen) {
      almacen.stock += detalle.cantidad;
      await almacen.save({ transaction });
    } else {
      await models.Almacen.create(
        {
          codigoprod: detalle.codigoprod,
          idsucursal: detalle.idsucursal,
          stock: detalle.cantidad,
          fecha: new Date(),
        },
        { transaction }
      );
    }
  }

  return compra;
}
async function postCompra(req, transaction) {
  const { body } = req;
  const { detalles } = body;

  try {
    const compra = await models.Compra.create(body, { transaction });
    // Crear los detalles de la compra en bulk
    const detallesConIdCompra = detalles.map((detalle) => ({
      ...detalle,
      idcompra: compra._id,
    }));

    // Crear los detalles en bulk (optimización)
    await models.CompraDetalle.bulkCreate(detallesConIdCompra, { transaction });

    // Procesar el stock en Almacen
    for (const detalle of detalles) {
      const almacen = await models.Almacen.findOne({
        where: {
          codigoprod: detalle.codigoprod,
          idsucursal: detalle.idsucursal,
        },
      });

      if (almacen) {
        // Si el producto ya existe en el almacén, incrementamos el stock
        //almacen.stock += detalle.cantidad;
        almacen.stock = Number(almacen.stock) + Number(detalle.cantidad);

        await almacen.save({ transaction });
      } else {
        // Si no existe, creamos un nuevo registro
        await models.Almacen.create(
          {
            codigoprod: detalle.codigoprod,
            idsucursal: detalle.idsucursal,
            stock: detalle.cantidad,
            fecha: new Date(),
          },
          { transaction }
        );
      }
    }

    // Retornar la compra creada
    return compra;
  } catch (error) {
    console.error("Error en la creación de la compra: ", error);
    throw error; // Lanza el error para que la transacción pueda ser revertida si es necesario
  }
}

async function putCompra(req, transaction) {
  const { id } = req.params;
  const { body } = req;
  const compra = await models.Compra.findByPk(id);

  if (!compra) {
    throw { codigo: 404, message: `No existe el registro con el id ${id}` };
  }

  await compra.update(body, { transaction });
  return compra;
}

async function deleteCompra(req, transaction) {
  const { id } = req.params;
  const compra = await models.Compra.findByPk(id);

  if (!compra) {
    throw { codigo: 404, message: `No existe el registro con el id ${id}` };
  }

  await compra.update({ estado: false }, { transaction });
  return compra;
}

module.exports = {
  getCompras,
  getCompra,
  postCompra,
  putCompra,
  deleteCompra,
  detalleCompra,
};
