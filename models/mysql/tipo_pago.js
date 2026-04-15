// models/tipo_pago.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const TipoPago = dbConnect.define('TipoPago', {
  idtipopago: {
    field:'idtipopago',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    field:'nombre',
    type: DataTypes.STRING(45),
    allowNull: false
  },
  estado: {
    field:'estado',
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  }
}, {
  tableName: 'tipo_pago', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
});

module.exports = TipoPago;
