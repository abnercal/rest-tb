// models/pago.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Pago = dbConnect.define('Pago', {
  idpagos: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(45),
    allowNull: true,
    defaultValue: null
  },
  importe: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  idorden: {
    type: DataTypes.STRING(25),
    allowNull: true
  },
  idtipopago: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_pago: {
    type: DataTypes.DATEONLY, // Utiliza DATEONLY para la fecha sin hora
    allowNull: true
  }
}, {
  tableName: 'pagos', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
  charset: 'utf8mb3' // Asegúrate de que el charset sea consistente con tu base de datos
});

// Definir asociaciones si es necesario
// Por ejemplo, si quieres definir las asociaciones con las tablas orden y tipo_pago
// Pago.belongsTo(Orden, { foreignKey: 'idorden' });
// Pago.belongsTo(TipoPago, { foreignKey: 'idtipopago' });

module.exports = Pago;
