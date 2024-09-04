// models/precio.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Precio = dbConnect.define('Precio', {
  idprecios: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(18, 4),
    allowNull: true,
    defaultValue: 0
  },
  fechaefecto: {
    type: DataTypes.DATEONLY, // Utiliza DATEONLY para la fecha sin hora
    allowNull: true
  },
  tipoprecio: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  idproducto: {
    type: DataTypes.STRING(25),
    allowNull: true
  }
}, {
  tableName: 'precios', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

// Definir asociaciones si es necesario
// Por ejemplo, si quieres definir la asociación con la tabla producto
// Precio.belongsTo(Producto, { foreignKey: 'idproducto' });

module.exports = Precio;
