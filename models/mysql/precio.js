// models/precio.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Precio = dbConnect.define('Precio', {
  idprecios: {
    field:'idprecios',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  precio: {
    field:'precio',
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    defaultValue: 0
  },
  fechaefecto: {
    field:'fechaefecto',
    type: DataTypes.DATE,
    allowNull: true
  },
  fechafin: {
    field:'fechafin',
    type: DataTypes.DATE,
    allowNull: true
  },
  tipoprecio: {
    field:'tipoprecio',
    type: DataTypes.STRING(45),
    allowNull: true
  },
  codigoprod: {
    field:'codigoprod',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idtipoCli: {
    field:'idtipoCli',
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'precios', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
});


module.exports = Precio;
