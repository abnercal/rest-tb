// models/orden.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Orden = dbConnect.define('Orden', {
  idorden: {
    type: DataTypes.STRING(25),
    primaryKey: true,
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATEONLY, // Utiliza DATEONLY para la fecha sin hora
    allowNull: true
  },
  direccion: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  idclientes: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  estado: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'orden', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

// Definir asociaciones si es necesario
// Por ejemplo, si quieres definir la asociación con la tabla clientes
// Orden.belongsTo(Cliente, { foreignKey: 'idclientes' });

module.exports = Orden;
