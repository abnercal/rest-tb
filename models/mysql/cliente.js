// models/cliente.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Cliente = dbConnect.define('Cliente', {
  _id: {
    field: "idclientes",
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nit: {
    field: "nit",
    type: DataTypes.STRING(15),
    allowNull: true
  },
  nombres: {
    field: "nombres",
    type: DataTypes.STRING(45),
    allowNull: false
  },
  apellidos: {
    field: "apellidos",
    type: DataTypes.STRING(45),
    allowNull: true
  },
  direccion: {
    field: "direccion",
    type: DataTypes.STRING(150),
    allowNull: true
  },
  email: {
    field: "email",
    type: DataTypes.STRING(50),
    allowNull: true
  },
  telefono: {
    field: "telefono",
    type: DataTypes.STRING(15),
    allowNull: true
  },
  estado: {
    field: "estado",
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  idtipoCli: {
    field: "idtipoCli",
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'clientes', 
  timestamps: false, 
});

Cliente.associate = (models) => {
  Cliente.belongsTo(models.TipoCliente, {
    foreignKey: 'idtipoCli',
    as:'tipoClie'
  })
}

Cliente.findAllData  = function(options = {}){
  return Cliente.findAll({include:['tipoClie'],...options})
}

Cliente.findOneData  = function(_id){
  return Cliente.findOne({where:{_id},include:['tipoClie']})
}

module.exports = Cliente;
