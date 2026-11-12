// models/caja_movimiento.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const CajaMovimiento = dbConnect.define('CajaMovimiento', {
  idmovimiento: {
    field: 'idmovimiento',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  tipo: {
    field: 'tipo',
    type: DataTypes.ENUM('INGRESO', 'EGRESO'),
    allowNull: false
  },
  concepto: {
    field: 'concepto',
    type: DataTypes.STRING(45),
    allowNull: false
  },
  importe: {
    field: 'importe',
    type: DataTypes.DECIMAL(18,2),
    allowNull: false
  },
  descripcion: {
    field: 'descripcion',
    type: DataTypes.STRING(255),
    allowNull: true
  },
  referencia: {
    field: 'referencia',
    type: DataTypes.STRING(50),
    allowNull: true
  },
  fecha: {
    field: 'fecha',
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  idsesion: {
    field: 'idsesion',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idusuario: {
    field: 'idusuario',
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'caja_movimiento',
  timestamps: false,
});

module.exports = CajaMovimiento;
