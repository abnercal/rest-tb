const { Op } = require("sequelize");
const db = require("../../models/mysql");
const { successResponse, errorResponse } = require("../../utils/handleError");
const { sucursalScope } = require("../../utils/scope");

const getInventarioCtrl = async (req, res) => {
  try {
    const { sucursal, estado, search } = req.query;

    // Alcance por sucursal: un usuario no-superadmin solo ve la suya.
    const scope = sucursalScope(req.user);
    const whereAlmacen = { ...scope };
    // Solo el superadmin (scope sin idsucursal) puede filtrar por una sucursal puntual.
    if (scope.idsucursal === undefined && sucursal) whereAlmacen.idsucursal = sucursal;

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

      const presentaciones = (p?.Presentaciones || []).map((pp) => ({
        id: pp.idprodPresenta,
        nombre: pp.Presentacion?.nombre || "",
        cantidad_base: Number(pp.cantidad_base) || 1,
        precio: Number(pp.precio_venta) || 0,
      }));

      // Desglose del stock por presentación. `stock` está en unidades base,
      // así que cada presentación equivale a stock / cantidad_base.
      // Se devuelve sin redondeo de presentación (4 decimales solo para
      // evitar ruido de punto flotante); el front decide cómo mostrarlo.
      const round4 = (n) => Math.round(n * 10000) / 10000;
      const ordenadas = [...presentaciones].sort(
        (x, y) => x.cantidad_base - y.cantidad_base
      );
      const stockDesglose = ordenadas.map((pp) => ({
        id: pp.id,
        presentacion: pp.nombre,
        cantidad_base: pp.cantidad_base,
        cantidad: round4(stock / (pp.cantidad_base || 1)),
      }));
      const stockBase = ordenadas[0]?.nombre || p?.Unidad?.nombre || "";

      return {
        idalmacen: a._id,
        idsucursal: a.idsucursal,
        sucursal: a.Sucursal?.nombre || "",
        codigoprod: a.codigoprod,
        producto: p?.nombre || "",
        marca: p?.Marca?.nombre || "",
        categoria: p?.Categoria?.nombre || "",
        unidad: p?.Unidad?.nombre || "",
        presentaciones,
        stock,
        stock_base: stockBase,
        stock_desglose: stockDesglose,
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

    // Resumen para tarjetas KPI en el front (sobre el set ya filtrado).
    const resumen = data.reduce(
      (acc, d) => {
        acc.total += 1;
        acc[d.estado] = (acc[d.estado] || 0) + 1;
        return acc;
      },
      { total: 0, normal: 0, bajo: 0, sin_stock: 0 }
    );

    return successResponse(res, "Reporte de inventario", data, resumen);
  } catch (error) {
    return errorResponse(res, error, "Error al generar reporte de inventario");
  }
};

module.exports = { getInventarioCtrl };
