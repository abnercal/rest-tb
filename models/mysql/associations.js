module.exports = (db) => {
  const {
    Usuario, Rol, Permiso, UsuarioRol, RolPermiso, Sucursal,
    Producto, ProductoVariante, Talla, Color, PublicoObjetivo,
    Almacen, Lote, Kardex, CompraDetalle, OrdenDetalle, Barcode, Precio,
    Caja, CajaSesion, CajaMovimiento, Pago, PagoCompra,
  } = db;

  // Usuario ↔ Rol (N:M)
  Usuario.belongsToMany(Rol, {
    through: UsuarioRol,
    foreignKey: 'idusuario',
    otherKey: 'idrol',
    as: 'Roles'
  });

  Rol.belongsToMany(Usuario, {
    through: UsuarioRol,
    foreignKey: 'idrol',
    otherKey: 'idusuario',
    as: 'UsuariosRol'
  });

  // Rol ↔ Permiso (N:M)
  Rol.belongsToMany(Permiso, {
    through: RolPermiso,
    foreignKey: 'idrol',
    otherKey: 'idpermiso',
    as: 'Permisos'
  });

  Permiso.belongsToMany(Rol, {
    through: RolPermiso,
    foreignKey: 'idpermiso',
    otherKey: 'idrol',
    as: 'Roles'
  });

  // ─── Variantes de producto (talla / color / público objetivo) ───

  // Producto ↔ ProductoVariante (1:N)
  Producto.hasMany(ProductoVariante, {
    foreignKey: 'codigoprod',
    as: 'Variantes'
  });
  ProductoVariante.belongsTo(Producto, {
    foreignKey: 'codigoprod',
    as: 'Producto'
  });

  // ProductoVariante ↔ Talla / Color
  ProductoVariante.belongsTo(Talla, {
    foreignKey: 'idtalla',
    as: 'Talla'
  });
  Talla.hasMany(ProductoVariante, {
    foreignKey: 'idtalla',
    as: 'Variantes'
  });

  ProductoVariante.belongsTo(Color, {
    foreignKey: 'idcolor',
    as: 'Color'
  });
  Color.hasMany(ProductoVariante, {
    foreignKey: 'idcolor',
    as: 'Variantes'
  });

  // Producto → PublicoObjetivo
  Producto.belongsTo(PublicoObjetivo, {
    foreignKey: 'idpublico',
    as: 'Publico'
  });
  PublicoObjetivo.hasMany(Producto, {
    foreignKey: 'idpublico',
    as: 'Productos'
  });

  // Tablas dependientes de la variante (idvariante NULL = producto sin variantes)
  Almacen.belongsTo(ProductoVariante, { foreignKey: 'idvariante', as: 'Variante' });
  ProductoVariante.hasMany(Almacen, { foreignKey: 'idvariante', as: 'Almacenes' });

  Lote.belongsTo(ProductoVariante, { foreignKey: 'idvariante', as: 'Variante' });
  ProductoVariante.hasMany(Lote, { foreignKey: 'idvariante', as: 'Lotes' });

  Kardex.belongsTo(ProductoVariante, { foreignKey: 'idvariante', as: 'Variante' });
  ProductoVariante.hasMany(Kardex, { foreignKey: 'idvariante', as: 'MovimientosKardex' });

  CompraDetalle.belongsTo(ProductoVariante, { foreignKey: 'idvariante', as: 'Variante' });
  ProductoVariante.hasMany(CompraDetalle, { foreignKey: 'idvariante', as: 'DetallesCompra' });

  OrdenDetalle.belongsTo(ProductoVariante, { foreignKey: 'idvariante', as: 'Variante' });
  ProductoVariante.hasMany(OrdenDetalle, { foreignKey: 'idvariante', as: 'DetallesOrden' });

  Barcode.belongsTo(ProductoVariante, { foreignKey: 'idvariante', as: 'Variante' });
  ProductoVariante.hasMany(Barcode, { foreignKey: 'idvariante', as: 'Barcodes' });

  Precio.belongsTo(ProductoVariante, { foreignKey: 'idvariante', as: 'Variante' });
  ProductoVariante.hasMany(Precio, { foreignKey: 'idvariante', as: 'Precios' });

  // ─── Caja registradora ───

  // Caja → Sucursal
  Caja.belongsTo(Sucursal, { foreignKey: 'idsucursal', as: 'Sucursal' });
  Sucursal.hasMany(Caja, { foreignKey: 'idsucursal', as: 'Cajas' });

  // CajaSesion → Caja / Usuario (apertura y cierre con alias distintos)
  Caja.hasMany(CajaSesion, { foreignKey: 'idcaja', as: 'Sesiones' });
  CajaSesion.belongsTo(Caja, { foreignKey: 'idcaja', as: 'Caja' });
  CajaSesion.belongsTo(Usuario, { foreignKey: 'idusuario_apertura', as: 'UsuarioApertura' });
  CajaSesion.belongsTo(Usuario, { foreignKey: 'idusuario_cierre', as: 'UsuarioCierre' });

  // CajaMovimiento → CajaSesion / Usuario
  CajaSesion.hasMany(CajaMovimiento, { foreignKey: 'idsesion', as: 'Movimientos' });
  CajaMovimiento.belongsTo(CajaSesion, { foreignKey: 'idsesion', as: 'Sesion' });
  CajaMovimiento.belongsTo(Usuario, { foreignKey: 'idusuario', as: 'Usuario' });

  // Pago / PagoCompra → CajaSesion / Usuario (ambos opcionales)
  CajaSesion.hasMany(Pago, { foreignKey: 'idsesion', as: 'Pagos' });
  Pago.belongsTo(CajaSesion, { foreignKey: 'idsesion', as: 'Sesion' });
  Pago.belongsTo(Usuario, { foreignKey: 'idusuario', as: 'Usuario' });

  CajaSesion.hasMany(PagoCompra, { foreignKey: 'idsesion', as: 'PagosCompra' });
  PagoCompra.belongsTo(CajaSesion, { foreignKey: 'idsesion', as: 'Sesion' });
  PagoCompra.belongsTo(Usuario, { foreignKey: 'idusuario', as: 'Usuario' });
};
