// models/sucursal.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Sucursal = dbConnect.define('Sucursal', {
  idsucursal: {
    type: DataTypes.STRING(25),
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  }
}, {
  tableName: 'sucursales', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

module.exports = Sucursal;
