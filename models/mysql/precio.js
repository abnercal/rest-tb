// models/precio.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Precio = dbConnect.define('Precio', {
  idprecios: {
    field:'idprecios',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  precio: {
    field:'precio',
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    defaultValue: 0
  },
  fechaefecto: {
    field:'fechaefecto',
    type: DataTypes.DATE,
    allowNull: true
  },
  fechafin: {
    field:'fechafin',
    type: DataTypes.DATE,
    allowNull: true
  },
  tipoprecio: {
    field:'tipoprecio',
    type: DataTypes.STRING(45),
    allowNull: true
  },
  idprodPresenta: {
    field:'idprodPresenta',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  idtipoCli: {
    field:'idtipoCli',
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'precios',
  timestamps: true,
});

Precio.associate = (models) => {
  Precio.belongsTo(models.ProductoPresentacion, {
    foreignKey: 'idprodPresenta',
    as: 'ProductoPresentacion',
  });
  Precio.belongsTo(models.TipoCliente, {
    foreignKey: 'idtipoCli',
    as: 'TipoCliente',
  });
};

module.exports = Precio;
