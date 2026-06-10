// models/orden_detalle.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

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
    type: DataTypes.DECIMAL(18,2),
    allowNull: true,
    defaultValue: 0
  },
  idorden: {
    field:'idorden',
    type: DataTypes.STRING(36),
    allowNull: false
  },
  idprodPresenta: {
    field:'idprodPresenta',
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'orden_detalle',
  timestamps: false,
});

OrdenDetalle.associate = (models) => {
  OrdenDetalle.belongsTo(models.Orden, {
    foreignKey: 'idorden',
    as: 'Orden',
  });
  OrdenDetalle.belongsTo(models.ProductoPresentacion, {
    foreignKey: 'idprodPresenta',
    as: 'ProductoPresentacion',
  });
};

OrdenDetalle.findAllData  = function(){
  return OrdenDetalle.findAll({
    include: [
      { association: 'Orden' },
      { association: 'ProductoPresentacion', include: ['Producto', 'Presentacion'] },
    ],
  });
};

OrdenDetalle.findOneData  = function(_id){
  return OrdenDetalle.findOne({
    where: { _id },
    include: [
      { association: 'Orden' },
      { association: 'ProductoPresentacion', include: ['Producto', 'Presentacion'] },
    ],
  });
};

module.exports = OrdenDetalle;
