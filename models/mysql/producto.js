// models/producto.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");
const Marca = require("./marca");
const Presentacion = require("./presentacion");
const Categoria = require("./categoria");

const Producto = dbConnect.define('Producto', {
  _id: {
    field: "idproducto",
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false
  },
  codigoprod: {
    field:'codigoprod',
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: true
  },
  nombre: {
    field: "nombre",
    type: DataTypes.STRING(45),
    allowNull: false
  },
  descripcion: {
    field: "descripcion",
    type: DataTypes.STRING(100),
    allowNull: true
  },
  imagen: {
    field: "imagen",
    type: DataTypes.TEXT('medium'),
    allowNull: true
  },
  idmarca: {
    field: "idmarca",
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idpresentacion: {
    field: "idpresentacion",
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  idcategoria: {
    field: "idcategoria",
    type: DataTypes.INTEGER,
    allowNull: true
  },
  estado: {
    field: "estado",
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  precio: {
    field: "precio",
    type: DataTypes.DECIMAL(18, 4),
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'producto', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
});
//Definicion de relaciones
Producto.belongsTo(Marca, {
  foreignKey: 'idmarca',
  as:'Marca'
})
Producto.belongsTo(Presentacion, {
  foreignKey: 'idpresentacion',
  as:'Presentacion'
})
Producto.belongsTo(Categoria, {
  foreignKey: 'idcategoria',
  as:'Categoria'
})

Producto.findAllData  = function(options = {}){
  return Producto.findAll({include:['Marca','Presentacion','Categoria'],...options})
}

Producto.findOneData  = function(codigoprod){
  return Producto.findOne({where:{codigoprod},include:['Marca','Presentacion','Categoria']})
}
module.exports = Producto;
