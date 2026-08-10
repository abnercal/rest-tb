const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Orden = dbConnect.define('Orden', {
  _id: {
    field: 'idorden',
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    field: "nombre",
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fecha: {
    field: 'fecha',
    type: DataTypes.DATE,
    allowNull: true
  },
  direccion: {
    field: 'direccion',
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  idcliente: {
    field: 'idclientes',
    type: DataTypes.INTEGER,
    // La columna en BD es NOT NULL: createVentaFtr siempre resuelve un cliente
    // (el elegido o el genérico "Consumidor Final") antes de crear la Orden.
    allowNull: false
  },
  idestado: {
    field: 'idestado',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total: {
    field: 'total_orden',
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  idusuario: {
    field: 'idusuario',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idsucursal: {
    field: 'idsucursal',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  referencia: {
    field: "referencia",
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fecha_limite_pago: {
    field: 'fecha_limite_pago',
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  fecha_conversion: {
    field: 'fecha_conversion',
    type: DataTypes.DATE,
    allowNull: true,
    // Se setea SOLO cuando convertirCotizacionFtr convierte una Cotización en
    // venta. Si está presente, esta orden pasó por Cotización; si es null, se
    // creó directo como venta confirmada (POS) — nunca necesita "Entregada"
    // porque el despacho ya fue inmediato.
  },
}, {
  tableName: 'orden',
  timestamps: true,
});

Orden.associate = (models) => {
  Orden.belongsTo(models.Cliente, { foreignKey: 'idclientes', as: 'Cliente' });
  Orden.hasMany(models.OrdenDetalle, { foreignKey: 'idorden', as: 'Detalles' });
  Orden.hasOne(models.Pago, { foreignKey: 'idorden', as: 'Pago' });
  Orden.hasMany(models.Pago, { foreignKey: 'idorden', as: 'Pagos' });
  Orden.belongsTo(models.EstadoOrden, { foreignKey: 'idestado', as: 'Estado' });
  Orden.belongsTo(models.Sucursal, { foreignKey: 'idsucursal' });
  Orden.belongsTo(models.Usuario, { foreignKey: 'idusuario' });
};

Orden.findAllData = function (options = {}) {
  return Orden.findAll({
    ...options,
    include: [{ association: 'Cliente' }],
  });
};

Orden.findOneData = function (_id, options = {}) {
  return Orden.findOne({
    where: { _id },
    include: [{ association: 'Cliente' }],
    ...options,
  });
};

module.exports = Orden;
