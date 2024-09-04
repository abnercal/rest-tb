// models/cliente.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Cliente = dbConnect.define('Cliente', {
  idclientes: {
    type: DataTypes.STRING(25),
    primaryKey: true,
    allowNull: false
  },
  nombres: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  apellidos: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  email: {
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
  },
  idtipoCli: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'clientes', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

// Definir asociaciones si es necesario
// Por ejemplo, si quieres definir la asociación con la tabla tipoCli
// Cliente.belongsTo(TipoCli, { foreignKey: 'idtipoCli' });

module.exports = Cliente;
