const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");
const Proveedor = dbConnect.define(
  "Proveedor",
  {
    _id: {
      field: "idproveedor",
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      
    },
    nombre: {
      field: "nombre",
      type: DataTypes.STRING(45),
      allowNull: false,
    },
    direccion: {
      field: "direccion",
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    telefono: {
      field: "telefono",
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    email: {
      field: "email",
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    estado: {
      field: "estado",
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    nit: {
      field: "nit",
      type: DataTypes.STRING(15),
      allowNull: true
    }
  },
  {
    tableName: "proveedores",
    timestamps: false,
  }
);

module.exports = Proveedor;
