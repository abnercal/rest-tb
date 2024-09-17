// models/orden_detalle.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");
const Producto = require("./producto");
const Orden = require("./orden");

const OrdenDetalle = dbConnect.define('OrdenDetalle', {
  _id: {
    field:'idorden_detalle',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  cantidad: {
    field:'cantidad',
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  precio: {
    field:'precio',
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  idorden: {
    field:'idorden',
    type: DataTypes.STRING(36),
    allowNull: false
  },
  codigoprod: {
    field:'codigoprod',
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'orden_detalle',
  timestamps: false,
});

// Asociaciones
OrdenDetalle.belongsTo(Orden, { foreignKey: 'idorden' });
OrdenDetalle.belongsTo(Producto, { foreignKey: 'codigoprod' });

OrdenDetalle.findAllData  = function(){
  return OrdenDetalle.findAll({include:[Orden,Producto]})
}

OrdenDetalle.findOneData  = function(_id){
  return OrdenDetalle.findOne({where:{_id},include:[Orden,Producto]})
}

module.exports = OrdenDetalle;
