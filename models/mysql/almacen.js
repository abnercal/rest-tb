// models/almacen.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Almacen = dbConnect.define('Almacen', {
  _id: {
    field:'idalmacen',
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    field:'nombre',
    type: DataTypes.STRING(45),
    allowNull: true
  },
  idsucursal: {
    field:'idsucursal',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  codigoprod: {
    field:'codigoprod',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  stock: {
    field:'stock',
    type: DataTypes.DECIMAL(18,2),
    allowNull: false,
    defaultValue: 0
  },
  fecha: {
    field:'fecha',
    type: DataTypes.DATE,
    allowNull: true
  },
  stock_minimo: {
    field:'stock_minimo',
    type: DataTypes.DECIMAL(18,2),
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'almacen',
  timestamps: false,
});

// Asociaciones
Almacen.associate = (models) => {
  Almacen.belongsTo(models.Sucursal, { 
    foreignKey: 'idsucursal',
    as: 'Sucursal'
  });
  Almacen.belongsTo(models.Producto, { 
    foreignKey: 'codigoprod',
    as: 'Producto'
  });
}

Almacen.findAllData  = function(){
  return Almacen.findAll({include:['Sucursal','Producto']})
}

Almacen.findOneData  = function(_id){
  return Almacen.findOne({where:{_id},include:['Sucursal','Producto']})
}
module.exports = Almacen;
