// models/cliente.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Cliente = dbConnect.define('Cliente', {
  _id: {
    field: "idclientes",
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false
  },
  nit: {
    field: "nit",
    type: DataTypes.STRING(45),
    primaryKey: true,
    allowNull: false
  },
  nombres: {
    field: "nombres",
    type: DataTypes.STRING(45),
    allowNull: false
  },
  apellidos: {
    field: "apellidos",
    type: DataTypes.STRING(45),
    allowNull: false
  },
  email: {
    field: "email",
    type: DataTypes.STRING(45),
    allowNull: true
  },
  telefono: {
    field: "telefono",
    type: DataTypes.STRING(45),
    allowNull: true
  },
  estado: {
    field: "estado",
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  idtipoCli: {
    field: "idtipoCli",
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
