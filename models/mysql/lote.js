// models/lote.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Lote = dbConnect.define('Lote', {
  idlote: {
    field: 'idlote',
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  cantidad_inicial: {
    field: 'cantidad_inicial',
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  cantidad_disponible: {
    field: 'cantidad_disponible',
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  fecha_ingreso: {
    field: 'fecha_ingreso',
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_vencimiento: {
    field: 'fecha_vencimiento',
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  estado: {
    field: 'estado',
    type: DataTypes.TINYINT,
    allowNull: true,
    defaultValue: 1
  },
  codigoprod: {
    field: 'codigoprod',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idsucursal: {
    field: 'idsucursal',
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idcompra_detalle: {
    field: 'idcompra_detalle',
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'lote',
  timestamps: false,
});

Lote.associate = (models) => {
  Lote.belongsTo(models.Producto, {
    foreignKey: 'codigoprod',
    as: 'Producto'
  });
  Lote.belongsTo(models.Sucursal, {
    foreignKey: 'idsucursal',
    as: 'Sucursal'
  });
  Lote.belongsTo(models.CompraDetalle, {
    foreignKey: 'idcompra_detalle',
    as: 'CompraDetalle'
  });
};

module.exports = Lote;
