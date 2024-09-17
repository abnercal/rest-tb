// models/orden.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");
const Cliente = require("./cliente");

const Orden = dbConnect.define('Orden', {
  _id: {
    field:'idorden',
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
  cliente: {
    field:'cliente',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  estado: {
    field:'estado',
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'orden',
  timestamps: true,
});

// Asociaciones
Orden.belongsTo(Cliente, { foreignKey: 'cliente' });

Orden.findAllData  = function(){
  return Orden.findAll({include:Cliente})
}

Orden.findOneData  = function(_id){
  return Orden.findOne({where:{_id},include:Cliente})
}

module.exports = Orden;
