// models/producto_variante.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

// NOTA: las columnas idtalla_key e idcolor_key de la tabla son STORED GENERATED
// (IFNULL(idtalla,0) / IFNULL(idcolor,0)) y respaldan el UNIQUE uq_variante_combinacion.
// NO se declaran en el modelo a proposito: Sequelize intentaria escribirlas en
// INSERT/UPDATE y MySQL rechaza escrituras sobre columnas generadas.
const ProductoVariante = dbConnect.define('ProductoVariante', {
  idvariante: {
    field: 'idvariante',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  sku: {
    field: 'sku',
    type: DataTypes.STRING(60),
    allowNull: true
  },
  estado: {
    field: 'estado',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  codigoprod: {
    field: 'codigoprod',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idtalla: {
    field: 'idtalla',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idcolor: {
    field: 'idcolor',
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'producto_variante',
  timestamps: false,
});

module.exports = ProductoVariante;
