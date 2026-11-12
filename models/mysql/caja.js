// models/caja.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

// UNIQUE en BD: (idsucursal, nombre) -> uq_caja_sucursal_nombre
const Caja = dbConnect.define('Caja', {
  idcaja: {
    field: 'idcaja',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre: {
    field: 'nombre',
    type: DataTypes.STRING(45),
    allowNull: false
  },
  estado: {
    field: 'estado',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  idsucursal: {
    field: 'idsucursal',
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'caja',
  timestamps: false,
});

module.exports = Caja;
