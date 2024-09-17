// models/compra.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");
const Proveedor = require("./proveedor");

const Compra = dbConnect.define('Compra', {
  _id: {
    field:'idcompra',
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  fecha: {
    field:'fecha',
    type: DataTypes.DATE,
    allowNull: true
  },
  direccion: {
    field:'direccion',
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  estado: {
    field:'estado',
    type: DataTypes.BOOLEAN,
    defaultValue: 1,
    allowNull: true
  },
  idproveedor: {
    field:'idproveedor',
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'compra',
  timestamps: true,
});

Compra.belongsTo(Proveedor, {
  foreignKey: 'idproveedor'
})

Compra.findAllData  = function(){
  return Compra.findAll({include:Proveedor})
}

Compra.findOneData  = function(_id){
  return Compra.findOne({where:{_id},include:Proveedor})
}

module.exports = Compra;
