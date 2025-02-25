// models/pago.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Pago = dbConnect.define('Pago', {
  idpagos: {
    field: "idpagos",
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  estado: {
    field: "estado",
    type: DataTypes.STRING(45),
    allowNull: true,
    defaultValue: null
  },
  importe: {
    field: "importe",
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  idorden: {
    field: "idorden",
    type: DataTypes.STRING(25),
    allowNull: true
  },
  idtipopago: {
    field: "idtipopago",
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_pago: {
    field: "fecha_pago",
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
