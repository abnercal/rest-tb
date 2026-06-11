// models/tipo_cliente.js

const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const TipoCliente = dbConnect.define('TipoCliente', {
  idtipoCli: {
    field:'idtipoCli',
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  nombre: {
    field:'nombre',
    type: DataTypes.STRING(45),
    allowNull: false
  },
  estado: {
    field:'estado',
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: 1
  }
}, {
  tableName: 'tipocli', // Nombre de la tabla en la base de datos
  timestamps: false,
});

TipoCliente.associate = (models) => {
  TipoCliente.hasMany(models.Precio, {
    foreignKey: 'idtipoCli',
    as: 'Precios',
  });
};

module.exports = TipoCliente;
