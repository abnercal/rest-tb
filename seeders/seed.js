const db = require("../models/mysql");

async function runSeed() {
  const {
    Categoria,
    Marca,
    Presentacion,
    Proveedor,
    Sucursal,
    TipoPago,
    TipoCliente,
    Cliente,
    sequelize
  } = db;

  const transaction = await sequelize.transaction();

  try {
    // Verificamos si la BD ya tiene datos
    const categoriaCount = await Categoria.count();

    if (categoriaCount > 0) {
      console.log("⚠ La base ya tiene datos. Seed cancelado.");
      await transaction.rollback();
      return;
    }

    console.log("🚀 Insertando datos iniciales...");

    // -------------------------------
    // TABLAS BASICAS
    // -------------------------------
    await Categoria.create({ nombre: "Generico", estado: 1 }, { transaction });
    await Marca.create({ nombre: "Generico", estado: 1 }, { transaction });
    await Presentacion.create({ nombre: "Generico", estado: 1 }, { transaction });

    await Proveedor.create({
      _id: "CF",
      nombre: "Generico",
      direccion: "N/A",
      telefono: "00000000",
      email: "generico@email.com",
      estado: 1
    }, { transaction });

    await Sucursal.create({
      idsucursal: "SUC-001",
      nombre: "Principal",
      direccion: "Matriz",
      telefono: "00000000",
      estado: 1
    }, { transaction });

    await TipoPago.bulkCreate([
      { nombre: "Efectivo", estado: 1 },
      { nombre: "Tarjeta", estado: 1 }
    ], { transaction });

    // -------------------------------
    // CLIENTE GENÉRICO
    // -------------------------------
    const tipoClienteGenerico = await TipoCliente.create(
      { nombre: "Generico", estado: 1 },
      { transaction }
    );

    await Cliente.create({
      nit: "CF",
      nombres: "Cliente",
      apellidos: "Generico",
      email: "cliente@demo.com",
      telefono: "00000000",
      estado: 1,
      idtipoCli: tipoClienteGenerico.idtipoCli
    }, { transaction });

    await transaction.commit();
    console.log("✅ Seed ejecutado correctamente");

  } catch (error) {
    await transaction.rollback();
    console.error("❌ Error en seed:", error);
  }
}

module.exports = runSeed;
