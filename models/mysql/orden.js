// models/orden.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");
const Cliente = require('./cliente');
const OrdenDetalle = require('./orden_detalle');
const Pago = require('./pago');

const Orden = dbConnect.define('Orden', {
  _id: {
    field:'idorden',
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  fecha: {
    field:'fecha',
    type: DataTypes.DATE,
    allowNull: true
  },
  direccion: {
    field:'direccion',
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  cliente: {
    field:'cliente',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  estado: {
    field:'estado',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total: {
    field:'total_orden',
    type: DataTypes.DECIMAL,
    allowNull: true,
  }
}, {
  tableName: 'orden',
  timestamps: true,
});

// Asociaciones
Orden.associate = () => {
  Orden.belongsTo(Cliente, { foreignKey: 'cliente', as: 'Cliente' });
  Orden.hasMany(OrdenDetalle, { foreignKey: 'idorden', as: 'Detalles' });
  Orden.hasOne(Pago, { foreignKey: 'idorden', as: 'Pago' });
};

Orden.findAllData = function (options = {}) {
  return Orden.findAll({
    include: [{ model: Cliente, as: 'Cliente' }], // Incluir el cliente
    ...options, // Aplicar opciones adicionales (where, limit, offset, etc.)
  });
};

Orden.findOneData = function (_id, options = {}) {
  return Orden.findOne({
    where: { _id },
    include: [{ model: Cliente, as: 'Cliente' }], // Incluir el cliente
    ...options, // Aplicar opciones adicionales
  });
};

module.exports = Orden;
