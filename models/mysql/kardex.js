// models/kardex.js
const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Kardex = dbConnect.define('Kardex', {
  idkardex: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  codigoprod: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idsucursal: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idusuario: {
    field:'idusuario',
    type: DataTypes.INTEGER,
    allowNull: true
  },
  tipo: {
    type: DataTypes.STRING(20), // COMPRA, VENTA, AJUSTE
    allowNull: false
  },
  cantidad: {
    type: DataTypes.DECIMAL(18,2),
    allowNull: false
  },
  stock_anterior: {
    type: DataTypes.DECIMAL(18,2),
    allowNull: false
  },
  stock_nuevo: {
    type: DataTypes.DECIMAL(18,2),
    allowNull: false
  },
  referencia: {
    type: DataTypes.STRING(50), // ID de compra o venta
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  idlote: {
    type: DataTypes.UUID,
    allowNull: true
  },
  idprodPresenta: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'kardex',
  timestamps: false
});

Kardex.associate = (models) => {
    Kardex.belongsTo(models.Sucursal, {
        foreignKey: 'idsucursal',
        as: 'Sucursal'
    });

    Kardex.belongsTo(models.Producto, {
        foreignKey: 'codigoprod',
        as: 'Producto'
    });

    Kardex.belongsTo(models.Usuario, {
    foreignKey: 'idusuario',
    as: 'Usuario'
  })

    Kardex.belongsTo(models.Lote, {
        foreignKey: 'idlote',
        as: 'Lote'
    });

    Kardex.belongsTo(models.ProductoPresentacion, {
        foreignKey: 'idprodPresenta',
        as: 'ProductoPresentacion'
    });

};

module.exports = Kardex;
