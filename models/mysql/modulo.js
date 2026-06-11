const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Modulo = dbConnect.define('Modulo', {
  _id: {
    field: 'idmodulos',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  feature_key: {
    field: 'feature_key',
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  feature_label: {
    field: 'feature_label',
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  permiso_nombre: {
    field: 'permiso_nombre',
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'modulos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Modulo;
