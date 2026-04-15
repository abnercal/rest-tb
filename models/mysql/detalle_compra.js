// models/compra_detalle.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const CompraDetalle = dbConnect.define('CompraDetalle', {
  _id: {
    field:'idcompra_detalle',
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
  costo: {
    field:'costo',
    type: DataTypes.DECIMAL(18,2),
    allowNull: true,
    defaultValue: 0
  },
  idcompra: {
    field:'idcompra',
    type: DataTypes.STRING(36),
    allowNull: false
  },
  codigoprod: {
    field:'codigoprod',
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'compra_detalle',
  timestamps: false,
});

// Asociaciones
CompraDetalle.associate = (models) => {
  CompraDetalle.belongsTo(models.Compra, { 
    foreignKey: 'idcompra',
    as: 'Compras'
  });
  CompraDetalle.belongsTo(models.Producto, { 
    foreignKey: 'codigoprod',
    as: 'Producto'
  });
}
CompraDetalle.findAllData  = function(){
  return CompraDetalle.findAll({include:[Compras,Producto]})
}

CompraDetalle.findOneData  = function(_id){
  return CompraDetalle.findOne({where:{_id},include:[Compras,Producto]})
}
module.exports = CompraDetalle;
