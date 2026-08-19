const { dbConnect } = require("../../config/db/connection");
const { DataTypes, Model } = require("sequelize");

const ProductoPresentacion = dbConnect.define('ProductoPresentacion', {
  idprodPresenta: {
    field: 'idprodPresenta',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  codigoprod: {
    field: 'codigoprod',
    type: DataTypes.INTEGER(11),
    allowNull: false,
  },
  idpresentacion: {
    field: 'idpresentacion',
    type: DataTypes.INTEGER(11),
    allowNull: false,
  },
  cantidad_base: {
    field: 'cantidad_base',
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 1,
  },
  precio_venta: {
    field: 'precio_venta',
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    defaultValue: 0,
  },
  codigo_barras: {
    field: 'codigo_barras',
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  estado: {
    field: 'estado',
    type: DataTypes.TINYINT(4),
    allowNull: true,
    defaultValue: 1,
  },
}, {
  tableName: 'producto_presentacion',
  timestamps: false,
});

ProductoPresentacion.associate = (models) => {
  ProductoPresentacion.belongsTo(models.Producto, {
    foreignKey: 'codigoprod',
    as: 'Producto',
  });
  ProductoPresentacion.belongsTo(models.Presentacion, {
    foreignKey: 'idpresentacion',
    as: 'Presentacion',
  });
  ProductoPresentacion.hasMany(models.Precio, {
    foreignKey: 'idprodPresenta',
    as: 'Precios',
  });
};

module.exports = ProductoPresentacion;
