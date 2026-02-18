// models/tipo_cliente.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const TipoCliente = dbConnect.define('TipoCliente', {
  idtipoCli: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: 1
  }
}, {
  tableName: 'tipoCli', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

module.exports = TipoCliente;
