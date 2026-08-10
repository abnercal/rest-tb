/**
 * Seed UNIFICADO — crea todo desde cero:
 * - Roles, permisos, roles_permisos
 * - Módulos (feature→permiso)
 * - Sucursal, superusuario, datos base del catálogo
 *
 * Uso: node seeders/seed.js
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../models/mysql");

const PERMISOS = [
  // Usuarios
  "usuarios:read", "usuarios:create", "usuarios:update", "usuarios:delete",
  // Roles
  "roles:read", "roles:create", "roles:update", "roles:delete",
  // Permisos
  "permisos:read", "permisos:create", "permisos:update", "permisos:delete",
  // Unidades de medida
  "unidades:read", "unidades:create", "unidades:update", "unidades:delete",
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
  // Reportes
  "reporte:read",
  // Precios por tipo de cliente
  "precios:read", "precios:create", "precios:update", "precios:delete",
  // Lotes (control de vencimiento)
  "lotes:read",
  // Descuentos
  "descuentos:read", "descuentos:create", "descuentos:update", "descuentos:delete",
];

const PERMISOS_VENDEDOR = [
  "productos:read", "categorias:read", "marcas:read",
  "presentaciones:read", "unidades:read",
  "proveedores:read", "clientes:read", "ventas:read",
  "ventas:create", "clientes:create", "clientes:update",
  "precios:read",
];

const MODULOS = [
  { feature_key: 'inventario',     feature_label: 'Inventario',      permiso_nombre: 'reporte:read' },
  { feature_key: 'productos',      feature_label: 'Productos',       permiso_nombre: 'productos:read' },
  { feature_key: 'ventas',         feature_label: 'Ventas',          permiso_nombre: 'ventas:read' },
  { feature_key: 'compras',        feature_label: 'Compras',         permiso_nombre: 'compras:read' },
  { feature_key: 'clientes',       feature_label: 'Clientes',        permiso_nombre: 'clientes:read' },
  { feature_key: 'proveedores',    feature_label: 'Proveedores',     permiso_nombre: 'proveedores:read' },
  { feature_key: 'categorias',     feature_label: 'Categorías',      permiso_nombre: 'categorias:read' },
  { feature_key: 'marcas',         feature_label: 'Marcas',          permiso_nombre: 'marcas:read' },
  { feature_key: 'unidades',       feature_label: 'Unidades',        permiso_nombre: 'unidades:read' },
  { feature_key: 'presentaciones', feature_label: 'Presentaciones',  permiso_nombre: 'presentaciones:read' },
  { feature_key: 'sucursales',     feature_label: 'Sucursales',      permiso_nombre: 'sucursales:read' },
  { feature_key: 'usuarios',       feature_label: 'Usuarios',        permiso_nombre: 'usuarios:read' },
  { feature_key: 'roles',          feature_label: 'Roles',           permiso_nombre: 'roles:read' },
  { feature_key: 'permisos',       feature_label: 'Permisos',        permiso_nombre: 'roles:read' },
  { feature_key: 'pos',            feature_label: 'POS',             permiso_nombre: 'ventas:create' },
  { feature_key: 'config',         feature_label: 'Configuración',   permiso_nombre: 'usuarios:read' },
  { feature_key: 'modulos',        feature_label: 'Módulos (Admin)', permiso_nombre: null },
];

async function truncateAll() {
  console.log("🧹 Limpiando base de datos...\n");

  // Recolectar nombres de tablas de los modelos de Sequelize
  const tableNames = Object.values(db)
    .filter(m => m && m.tableName && typeof m.tableName === 'string')
    .map(m => m.tableName)
    // Orden descendente para que las tablas con FK se limpien antes
    .sort((a, b) => b.length - a.length);

  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

  for (const t of tableNames) {
    try {
      await db.sequelize.query(`TRUNCATE TABLE \`${t}\``);
      console.log(`   🗑️  ${t}`);
    } catch {
      // Si falla (vistas, falta de permiso, etc.), ignorar
    }
  }

  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("✅ Base de datos limpia\n");
}

async function runSeed() {
  await truncateAll();

  const transaction = await db.sequelize.transaction();

  try {
    console.log("🌱 Sembrando datos...\n");

    // ── 1. ROLES ──
    const rolSuperAdmin = await db.Rol.create({ nombrerol: "SUPERADMIN" }, { transaction });
    const rolAdmin      = await db.Rol.create({ nombrerol: "ADMIN" },      { transaction });
    const rolVendedor   = await db.Rol.create({ nombrerol: "VENDEDOR" },   { transaction });
    console.log("✅ Roles creados");

    // ── 2. PERMISOS ──
    const permisos = await db.Permiso.bulkCreate(
      PERMISOS.map((nombre) => ({ nombre })),
      { transaction }
    );
    const findPermiso = (nombre) => permisos.find((p) => p.nombre === nombre);
    console.log(`✅ ${permisos.length} permisos creados`);

    // ── 3. ROLES ↔ PERMISOS ──
    // SUPERADMIN → todos
    await db.RolPermiso.bulkCreate(
      permisos.map((p) => ({ idrol: rolSuperAdmin._id, idpermiso: p._id })),
      { transaction }
    );

    // ADMIN → todo excepto roles:*
    const permisosAdmin = permisos.filter((p) => !p.nombre.startsWith("roles:"));
    await db.RolPermiso.bulkCreate(
      permisosAdmin.map((p) => ({ idrol: rolAdmin._id, idpermiso: p._id })),
      { transaction }
    );

    // VENDEDOR → solo los definidos en PERMISOS_VENDEDOR
    const permisosVendedor = PERMISOS_VENDEDOR.map((n) => findPermiso(n)).filter(Boolean);
    await db.RolPermiso.bulkCreate(
      permisosVendedor.map((p) => ({ idrol: rolVendedor._id, idpermiso: p._id })),
      { transaction }
    );
    console.log("✅ Permisos asignados a roles");

    // ── 4. MÓDULOS (feature→permiso) ──
    for (const m of MODULOS) {
      await db.Modulo.findOrCreate({
        where: { feature_key: m.feature_key },
        defaults: m,
        transaction,
      });
    }
    console.log(`✅ ${MODULOS.length} módulos creados`);

    // ── 5. SUCURSAL PRINCIPAL ──
    const sucursal = await db.Sucursal.create(
      { nombre: "Principal", direccion: "Sede Central", telefono: "00000000", estado: 1, es_principal: 1 },
      { transaction }
    );
    console.log("✅ Sucursal principal creada");

    // ── 6. SUPERUSUARIO ──
    const salt = bcrypt.genSaltSync(10);
    const superUsuario = await db.Usuario.create(
      {
        nombre: "Super", apellido: "Admin", username: "superadmin",
        email: "superadmin@sistema.com",
        password: bcrypt.hashSync("Admin1234!", salt),
        codigoemp: "SUPER-001",
        estado: 1, idsucursal: sucursal.idsucursal,
      },
      { transaction }
    );
    await db.UsuarioRol.create(
      { idusuario: superUsuario._id, idrol: rolSuperAdmin._id },
      { transaction }
    );
    console.log("✅ Superusuario creado");
    console.log("   Email:    superadmin@sistema.com");
    console.log("   Password: Admin1234!");

    // ── 7. DATOS BASE DEL CATÁLOGO ──
    const catGen = await db.Categoria.create({ nombre: "Genérico", estado: 1 }, { transaction });
    const marGen = await db.Marca.create({ nombre: "Genérico", estado: 1 }, { transaction });
    const preGen = await db.Presentacion.create({ nombre: "Genérico", estado: 1 }, { transaction });
    const preUnidad = await db.Presentacion.create({ nombre: "Unidad", estado: 1 }, { transaction });
    const preCaja = await db.Presentacion.create({ nombre: "Caja", estado: 1 }, { transaction });
    const undGen = await db.UnidadMed.create({ nombre: "Unidad", abreviatura: "UND", estado: 1 }, { transaction });

    await db.TipoPago.bulkCreate(
      [
        { nombre: "Efectivo", estado: 1 },
        { nombre: "Tarjeta", estado: 1 },
        { nombre: "Transferencia", estado: 1 },
      ],
      { transaction }
    );

    await db.EstadoOrden.bulkCreate(
      [
        { nombre: "Cotizacion", descripcion: "Cotización / proforma, no afecta inventario" },
        { nombre: "Confirmada", descripcion: "Venta confirmada, descuenta inventario" },
        { nombre: "Entregada", descripcion: "Venta entregada al cliente" },
        { nombre: "Anulada", descripcion: "Venta anulada" },
      ],
      { transaction }
    );

    const tipoMayorista = await db.TipoCliente.create({ nombre: "Mayorista", estado: 1 }, { transaction });
    const tipoMinorista = await db.TipoCliente.create({ nombre: "Minorista", estado: 1 }, { transaction });

    await db.Cliente.create(
      { nit: "CF", nombres: "Consumidor", apellidos: "Final", email: "cf@sistema.com",
        telefono: "00000000", direccion: "N/A", estado: 1, idtipoCli: tipoMinorista.idtipoCli },
      { transaction }
    );

    await db.Proveedor.create(
      { nombre: "Proveedor Genérico", direccion: "N/A", telefono: "00000000",
        email: "proveedor@sistema.com", nit: "CF", estado: 1 },
      { transaction }
    );

    const prodGen = await db.Producto.create(
      { nombre: "Producto Genérico", descripcion: "Producto Genérico", imagen: null,
        idmarca: marGen._id, idcategoria: catGen._id,
        idunidad: undGen._id, estado: 1 },
      { transaction }
    );

    // ── 8. PRESENTACIONES DE EJEMPLO + PRECIOS MAYORISTA ──
    const pres1 = await db.ProductoPresentacion.create({
      codigoprod: prodGen.codigoprod,
      idpresentacion: preGen._id,
      cantidad_base: 1,
      precio_venta: 100.00,
      codigo_barras: "7501000000011",
      estado: 1,
    }, { transaction });

    const pres2 = await db.ProductoPresentacion.create({
      codigoprod: prodGen.codigoprod,
      idpresentacion: preUnidad._id,
      cantidad_base: 1,
      precio_venta: 200.00,
      codigo_barras: "7501000000028",
      estado: 1,
    }, { transaction });

    const pres3 = await db.ProductoPresentacion.create({
      codigoprod: prodGen.codigoprod,
      idpresentacion: preCaja._id,
      cantidad_base: 12,
      precio_venta: 50.00,
      codigo_barras: "7501000000035",
      estado: 1,
    }, { transaction });

    // Precios mayoristas: 10% descuento sobre precio_venta
    await db.Precio.create({
      precio: 90.00,
      tipoprecio: "mayorista",
      idprodPresenta: pres1.idprodPresenta,
      idtipoCli: tipoMayorista.idtipoCli,
    }, { transaction });

    await db.Precio.create({
      precio: 180.00,
      tipoprecio: "mayorista",
      idprodPresenta: pres2.idprodPresenta,
      idtipoCli: tipoMayorista.idtipoCli,
    }, { transaction });

    await db.Precio.create({
      precio: 45.00,
      tipoprecio: "mayorista",
      idprodPresenta: pres3.idprodPresenta,
      idtipoCli: tipoMayorista.idtipoCli,
    }, { transaction });

    console.log("✅ Datos base del catálogo creados");

    await transaction.commit();
    console.log("\n🎉 Seed completado exitosamente.\n");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("\n❌ Error en seed:", error.message);
    if (error.errors) {
      error.errors.forEach(e => console.error("   →", e.message, "| field:", e.path, "| value:", e.value));
    }
    console.error("\n  Stack:", error.stack?.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
}

runSeed();
