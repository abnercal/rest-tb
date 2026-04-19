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
    allowNull: true
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
  }
}, {
  tableName: 'orden',
  timestamps: true,
});

Orden.associate = (models) => {
  Orden.belongsTo(models.Cliente, { foreignKey: 'idclientes', as: 'Cliente' });
  Orden.hasMany(models.OrdenDetalle, { foreignKey: 'idorden', as: 'Detalles' });
  Orden.hasOne(models.Pago, { foreignKey: 'idorden', as: 'Pago' });
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
