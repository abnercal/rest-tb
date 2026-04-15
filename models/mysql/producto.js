// models/producto.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes, Model } = require("sequelize");

const Producto = dbConnect.define('Producto', {
  codigoprod: {
    field:'codigoprod',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
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
    allowNull: false,
    defaultValue: 1
  },
  precio: {
    field: "precio",
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    defaultValue: 0
  },
  idunidad: {
    field: "idunidad",
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'producto', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
});
//Definicion de relaciones
Producto.associate = (models) => {
  Producto.belongsTo(models.Marca, {
    foreignKey: 'idmarca',
    as:'Marca'
  })
  Producto.belongsTo(models.Presentacion, {
    foreignKey: 'idpresentacion',
    as:'Presentacion'
  })
  Producto.belongsTo(models.Categoria, {
    foreignKey: 'idcategoria',
    as:'Categoria'
  })
  Producto.belongsTo(models.UnidadMed, {
    foreignKey: 'idunidad',
    as:'Unidad'
  })
} 

Producto.findAllData  = function(options = {}){
  return Producto.findAll({include:['Marca','Presentacion','Categoria','Unidad'],...options})
}

Producto.findOneData  = function(codigoprod){
  return Producto.findOne({where:{codigoprod},include:['Marca','Presentacion','Categoria','Unidad']})
}
module.exports = Producto;
