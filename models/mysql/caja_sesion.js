// models/caja_sesion.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

// NOTA: la columna idcaja_abierta de la tabla es STORED GENERATED
// (IF(estado = 'ABIERTA', idcaja, NULL)) y respalda el UNIQUE uq_sesion_abierta_por_caja
// (una sola sesion ABIERTA por caja). NO se declara en el modelo a proposito:
// Sequelize intentaria escribirla y MySQL rechaza escrituras sobre columnas generadas.
// Una segunda apertura simultanea falla con SequelizeUniqueConstraintError.
const CajaSesion = dbConnect.define('CajaSesion', {
  idsesion: {
    field: 'idsesion',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  idusuario_apertura: {
    field: 'idusuario_apertura',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idusuario_cierre: {
    field: 'idusuario_cierre',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idcaja: {
    field: 'idcaja',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha_apertura: {
    field: 'fecha_apertura',
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fecha_cierre: {
    field: 'fecha_cierre',
    type: DataTypes.DATE,
    allowNull: true
  },
  monto_apertura: {
    field: 'monto_apertura',
    type: DataTypes.DECIMAL(18,2),
    allowNull: false,
    defaultValue: 0
  },
  monto_esperado: {
    field: 'monto_esperado',
    type: DataTypes.DECIMAL(18,2),
    allowNull: true
  },
  monto_contado: {
    field: 'monto_contado',
    type: DataTypes.DECIMAL(18,2),
    allowNull: true
  },
  diferencia: {
    field: 'diferencia',
    type: DataTypes.DECIMAL(18,2),
    allowNull: true
  },
  estado: {
    field: 'estado',
    type: DataTypes.ENUM('ABIERTA', 'CERRADA'),
    allowNull: false,
    defaultValue: 'ABIERTA'
  },
  observaciones: {
    field: 'observaciones',
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'caja_sesion',
  timestamps: false,
});

module.exports = CajaSesion;
