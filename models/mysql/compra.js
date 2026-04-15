// models/compra.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Compra = dbConnect.define('Compra', {
  _id: {
    field:'idcompra',
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    field: "nombre",
    type: DataTypes.STRING(100),
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
  },
  total: {
    field:'total_compra',
    type: DataTypes.DECIMAL,
    allowNull: true,
  },
  idusuario: {
    field:'idusuario',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idsucursal: {
    field:'idsucursal',
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'compra',
  timestamps: true,
});
Compra.associate = (models) => {
  Compra.belongsTo(models.Proveedor, {
    foreignKey: 'idproveedor',
    as:'Proveedor'
  })
  Compra.belongsTo(models.Sucursal, {
    foreignKey: 'idsucursal',
    as:'Sucursal'
  })
  Compra.belongsTo(models.Usuario, {
    foreignKey: 'idusuario',
    as: 'Usuario'
  })
}
Compra.findAllData  = function(options){
  return Compra.findAll({...options,include:['Proveedor','Sucursal','Usuario']})
}

Compra.findOneData  = function(_id){
  return Compra.findOne({where:{_id},include:['Proveedor','Sucursal','Usuario']})
}

module.exports = Compra;
