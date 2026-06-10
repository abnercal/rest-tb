const { Op } = require("sequelize");
const db = require("../../models/mysql");
const { successResponse, errorResponse } = require("../../utils/handleError");

const getInventarioCtrl = async (req, res) => {
  try {
    const { sucursal, estado, search } = req.query;

    const whereAlmacen = {};
    if (sucursal) whereAlmacen.idsucursal = sucursal;

    const almacenes = await db.Almacen.findAll({
      where: whereAlmacen,
      include: [
        {
          model: db.Producto,
          as: "Producto",
          include: [
            { association: "Marca" },
            { association: "Categoria" },
            { association: "Unidad" },
            {
              association: "Presentaciones",
              include: ["Presentacion"],
              required: false,
            },
          ],
        },
        { association: "Sucursal" },
      ],
      order: [
        ["stock", "ASC"],
      ],
    });

    // Agregar estado calculado
    let data = almacenes.map((a) => {
      const stock = Number(a.stock) || 0;
      const minimo = Number(a.stock_minimo) || 0;
      const p = a.Producto;

      let estado = "normal";
      if (stock <= 0) estado = "sin_stock";
      else if (stock <= minimo) estado = "bajo";

      return {
        idalmacen: a._id,
        idsucursal: a.idsucursal,
        sucursal: a.Sucursal?.nombre || "",
        codigoprod: a.codigoprod,
        producto: p?.nombre || "",
        marca: p?.Marca?.nombre || "",
        categoria: p?.Categoria?.nombre || "",
        unidad: p?.Unidad?.nombre || "",
        presentaciones: (p?.Presentaciones || []).map((pp) => ({
          id: pp.idprodPresenta,
          nombre: pp.Presentacion?.nombre || "",
          cantidad_base: Number(pp.cantidad_base) || 1,
          precio: Number(pp.precio_venta) || 0,
        })),
        stock,
        stock_minimo: minimo,
        estado,
      };
    });

    // Filtros adicionales
    if (estado === "bajo") data = data.filter((d) => d.estado === "bajo");
    else if (estado === "sin_stock") data = data.filter((d) => d.estado === "sin_stock");
    else if (estado === "normal") data = data.filter((d) => d.estado === "normal");

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (d) =>
          d.producto.toLowerCase().includes(s) ||
          d.marca.toLowerCase().includes(s) ||
          String(d.codigoprod).includes(s)
      );
    }

    return successResponse(res, "Reporte de inventario", data);
  } catch (error) {
    return errorResponse(res, error, "Error al generar reporte de inventario");
  }
};

module.exports = { getInventarioCtrl };
