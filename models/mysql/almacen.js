// models/almacen.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");
const Producto = require("./producto");
const Sucursal = require("./sucursal");

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
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  fecha: {
    field:'fecha',
    type: DataTypes.DATE, // Utiliza DATEONLY para la fecha sin hora
    allowNull: true
  }
}, {
  tableName: 'almacen',
  timestamps: false,
});

// Asociaciones
Almacen.belongsTo(Sucursal, { foreignKey: 'idsucursal' });
Almacen.belongsTo(Producto, { foreignKey: 'codigoprod' });

Almacen.findAllData  = function(){
  return Almacen.findAll({include:[Sucursal,Producto]})
}

Almacen.findOneData  = function(_id){
  return Almacen.findOne({where:{_id},include:[Sucursal,Producto]})
}
module.exports = Almacen;
