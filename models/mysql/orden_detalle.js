// models/orden_detalle.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const OrdenDetalle = dbConnect.define('OrdenDetalle', {
  idorden_detalle: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  precio: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  idorden: {
    type: DataTypes.STRING(25),
    allowNull: false
  },
  idproducto: {
    type: DataTypes.STRING(25),
    allowNull: false
  }
}, {
  tableName: 'orden_detalle', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

// Definir asociaciones si es necesario
// Por ejemplo, si quieres definir las asociaciones con las tablas orden y producto
// OrdenDetalle.belongsTo(Orden, { foreignKey: 'idorden' });
// OrdenDetalle.belongsTo(Producto, { foreignKey: 'idproducto' });

module.exports = OrdenDetalle;
