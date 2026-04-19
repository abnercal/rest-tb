require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../models/mysql");

async function runSeed() {
  const transaction = await db.sequelize.transaction();

  try {
    // Verificar si ya existe data
    const rolCount = await db.Rol.count();
    if (rolCount > 0) {
      console.log("  Seed ya fue ejecutado. Cancelando...");
      await transaction.rollback();
      return;
    }

    console.log(" Iniciando seed...");

    // ─────────────────────────────────────────
    // 1. ROLES
    // ─────────────────────────────────────────
    const rolSuperAdmin = await db.Rol.create({ nombrerol: "SUPERADMIN" }, { transaction });
    const rolAdmin      = await db.Rol.create({ nombrerol: "ADMIN" },      { transaction });
    const rolVendedor   = await db.Rol.create({ nombrerol: "VENDEDOR" },   { transaction });

    console.log(" Roles creados");

    // ─────────────────────────────────────────
    // 2. PERMISOS  (formato módulo:acción)
    // ─────────────────────────────────────────
    const permisosDef = [
      // Usuarios
      "usuarios:read", "usuarios:create", "usuarios:update", "usuarios:delete",
      // Roles y permisos
      "roles:read", "roles:create", "roles:update", "roles:delete",
      // Marcas
      "marcas:read", "marcas:create", "marcas:update", "marcas:delete",
      // Categorías
      "categorias:read", "categorias:create", "categorias:update", "categorias:delete",
      // Presentaciones
      "presentaciones:read", "presentaciones:create", "presentaciones:update", "presentaciones:delete",
      // Productos
      "productos:read", "productos:create", "productos:update", "productos:delete",
      // Proveedores
      "proveedores:read", "proveedores:create", "proveedores:update", "proveedores:delete",
      // Clientes
      "clientes:read", "clientes:create", "clientes:update", "clientes:delete",
      // Compras
      "compras:read", "compras:create", "compras:update", "compras:delete",
      // Ventas
      "ventas:read", "ventas:create", "ventas:update", "ventas:delete",
      // Sucursales
      "sucursales:read", "sucursales:create", "sucursales:update", "sucursales:delete",
    ];

    const permisos = await db.Permiso.bulkCreate(
      permisosDef.map((nombre) => ({ nombre })),
      { transaction }
    );

    console.log(" Permisos creados");

    // Helper para buscar permiso por nombre
    const find = (nombre) => permisos.find((p) => p.nombre === nombre);

    // ─────────────────────────────────────────
    // 3. ASIGNAR PERMISOS A ROLES
    // ─────────────────────────────────────────

    // SUPERADMIN → TODOS los permisos
    await db.RolPermiso.bulkCreate(
      permisos.map((p) => ({ idrol: rolSuperAdmin._id, idpermiso: p._id })),
      { transaction }
    );

    // ADMIN → Todo excepto gestión de roles/permisos
    const permisosAdmin = permisos.filter(
      (p) => !p.nombre.startsWith("roles:")
    );
    await db.RolPermiso.bulkCreate(
      permisosAdmin.map((p) => ({ idrol: rolAdmin._id, idpermiso: p._id })),
      { transaction }
    );

    // VENDEDOR → Solo lectura general + crear/editar clientes + crear ventas
    const permisosVendedor = permisos.filter((p) =>
      p.nombre.endsWith(":read") ||
      ["ventas:create", "clientes:create", "clientes:update"].includes(p.nombre)
    );
    await db.RolPermiso.bulkCreate(
      permisosVendedor.map((p) => ({ idrol: rolVendedor._id, idpermiso: p._id })),
      { transaction }
    );

    console.log(" Permisos asignados a roles");

    // ─────────────────────────────────────────
    // 4. SUCURSAL PRINCIPAL
    // ─────────────────────────────────────────
    const sucursal = await db.Sucursal.create(
      {
        nombre:      "Principal",
        direccion:   "Sede Central",
        telefono:    "00000000",
        estado:      1,
        es_principal: 1,
      },
      { transaction }
    );

    console.log(" Sucursal principal creada");

    // ─────────────────────────────────────────
    // 5. SUPERUSUARIO
    // ─────────────────────────────────────────
    const salt         = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync("Admin1234!", salt);

    const superUsuario = await db.Usuario.create(
      {
        nombre:     "Super",
        apellido:   "Admin",
        username:   "superadmin",
        email:      "superadmin@sistema.com",
        password:   passwordHash,
        estado:     1,
        idsucursal: sucursal.idsucursal,
      },
      { transaction }
    );

    // Asignar rol SUPERADMIN al superusuario
    await db.UsuarioRol.create(
      { idusuario: superUsuario._id, idrol: rolSuperAdmin._id },
      { transaction }
    );

    console.log("Superusuario creado");
    console.log("  Email:    superadmin@sistema.com");
    console.log("  Password: Admin1234!");

    // ─────────────────────────────────────────
    // 6. DATOS BASE DEL CATÁLOGO
    // ─────────────────────────────────────────
    const categoriaGenerica    = await db.Categoria.create(    { nombre: "Genérico", estado: 1 }, { transaction });
    const marcaGenerica        = await db.Marca.create(        { nombre: "Genérico", estado: 1 }, { transaction });
    const presentacionGenerica = await db.Presentacion.create( { nombre: "Genérico", estado: 1 }, { transaction });
    const unidadGenerica       = await db.UnidadMed.create(
      { nombre: "Unidad", abreviatura: "UND", estado: 1 },
      { transaction }
    );

    await db.TipoPago.bulkCreate(
      [
        { nombre: "Efectivo", estado: 1 },
        { nombre: "Tarjeta",  estado: 1 },
        { nombre: "Transferencia", estado: 1 },
      ],
      { transaction }
    );

    await db.EstadoOrden.bulkCreate(
      [
        { nombre: "Nuevo", descripcion: "Nueva venta" },
        { nombre: "Anulado",  descripcion: "Anulacion de venta" },
        { nombre: "Credito", descripcion: "Credito venta" },
      ],
      { transaction }
    );

    const tipoClienteGenerico = await db.TipoCliente.create(
      { nombre: "Consumidor Final", estado: 1 },
      { transaction }
    );

    // Cliente genérico (CF)
    await db.Cliente.create(
      {
        nit:       "CF",
        nombres:   "Consumidor",
        apellidos: "Final",
        email:     "cf@sistema.com",
        telefono:  "00000000",
        estado:    1,
        idtipoCli: tipoClienteGenerico.idtipoCli,
      },
      { transaction }
    );

    // Proveedor genérico
    await db.Proveedor.create(
      {
        nombre:    "Proveedor Genérico",
        direccion: "N/A",
        telefono:  "00000000",
        email:     "proveedor@sistema.com",
        nit:       "CF",
        estado:    1,
      },
      { transaction }
    );

    // Producto genérico de ejemplo
    await db.Producto.create(
      {
        nombre:         "Producto Genérico",
        descripcion:    "Producto Genérico",
        imagen:         null,
        idmarca:        marcaGenerica._id,
        idpresentacion: presentacionGenerica._id,
        idcategoria:    categoriaGenerica._id,
        idunidad:       unidadGenerica._id,
        estado:         1,
        precio:         0,
      },
      { transaction }
    );

    console.log(" Datos base del catálogo creados");

    // ─────────────────────────────────────────
    // COMMIT
    // ─────────────────────────────────────────
    await transaction.commit();
    console.log("\n Seed ejecutado correctamente\n");

  } catch (error) {
    await transaction.rollback();
    console.error(" Error en seed:", error.message);
    throw error;
  }
}

module.exports = runSeed;
