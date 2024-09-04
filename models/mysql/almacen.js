// models/almacen.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Almacen = dbConnect.define('Almacen', {
  idalmacen: {
    type: DataTypes.STRING(25),
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  idsucursal: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  idproducto: {
    type: DataTypes.STRING(25),
    allowNull: false
  },
  stock: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  fecha: {
    type: DataTypes.DATEONLY, // Utiliza DATEONLY para la fecha sin hora
    allowNull: true
  }
}, {
  tableName: 'almacen', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

// Definir asociaciones si es necesario
// Por ejemplo, si quieres definir las asociaciones con las tablas sucursales y producto
// Almacen.belongsTo(Sucursal, { foreignKey: 'idsucursal' });
// Almacen.belongsTo(Producto, { foreignKey: 'idproducto' });

module.exports = Almacen;
