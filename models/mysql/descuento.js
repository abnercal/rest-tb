// models/descuento.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Descuento = dbConnect.define('Descuento', {
  iddescuentos: {
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
  fechaIni: {
    type: DataTypes.DATEONLY, // Utiliza DATEONLY para la fecha sin hora
    allowNull: true
  },
  fechaFin: {
    type: DataTypes.DATEONLY, // Utiliza DATEONLY para la fecha sin hora
    allowNull: true
  },
  minimo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idproducto: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  estado: {
    type: DataTypes.TINYINT, // Para valores pequeños como -128 a 127
    allowNull: true
  }
}, {
  tableName: 'descuentos', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

// Definir asociaciones si es necesario
// Por ejemplo, si quieres definir la asociación con la tabla producto
// Descuento.belongsTo(Producto, { foreignKey: 'idproducto' });

module.exports = Descuento;
