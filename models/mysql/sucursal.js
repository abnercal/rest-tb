// models/sucursal.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Sucursal = dbConnect.define('Sucursal', {
  idsucursal: {
    field:'idsucursal',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  nombre: {
    field:'nombre',
    type: DataTypes.STRING(45),
    allowNull: false
  },
  direccion: {
    field:'direccion',
    type: DataTypes.STRING(45),
    allowNull: true
  },
  telefono: {
    field:'telefono',
    type: DataTypes.STRING(45),
    allowNull: true
  },
  estado: {
    field:'estado',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  es_principal: {
    field:'es_principal',
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  tableName: 'sucursales', // Nombre de la tabla en la base de datos
  timestamps: false, // Si no tienes columnas de marcas de tiempo (createdAt y updatedAt)
});

Sucursal.associate = (models) => {
  Sucursal.hasMany(models.Compra, {
    foreignKey: 'idsucursal',
    as: 'Compras'
  });

  Sucursal.hasMany(models.Usuario, {
    foreignKey: 'idsucursal',
    as: 'Usuarios'
  });
};

module.exports = Sucursal;
