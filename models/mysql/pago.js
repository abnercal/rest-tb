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
    type: DataTypes.DECIMAL(18,2),
    allowNull: true,
    defaultValue: 0
  },
  idorden: {
    field: "idorden",
    type: DataTypes.STRING(36),
    allowNull: true
  },
  idtipopago: {
    field: "idtipopago",
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_pago: {
    field: "fecha_pago",
    type: DataTypes.DATE, 
    allowNull: true
  }
}, {
  tableName: 'pagos', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
});


module.exports = Pago;
