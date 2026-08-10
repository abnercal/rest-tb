// models/pago_compra.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const PagoCompra = dbConnect.define('PagoCompra', {
  idpagos_compra: {
    field: "idpagos_compra",
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
  fecha_pago: {
    field: "fecha_pago",
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  idcompra: {
    field: "idcompra",
    type: DataTypes.STRING(36),
    allowNull: false
  },
  idtipopago: {
    field: "idtipopago",
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'pagos_compra', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
});

PagoCompra.associate = (models) => {
  PagoCompra.belongsTo(models.Compra, {
    foreignKey: 'idcompra',
    as: 'Compra'
  });
  PagoCompra.belongsTo(models.TipoPago, {
    foreignKey: 'idtipopago',
    as: 'TipoPago'
  });
};

module.exports = PagoCompra;
