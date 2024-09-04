const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Categoria = dbConnect.define(
  "Categoria",
  {
    _id: {
      field: "idcategoria",
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: true,
    },
    nombre: {
      field: "nombre",
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      field: "estado",
      type: DataTypes.BOOLEAN,
    },
  },
  {
    tableName: "categoria",
    timestamps: false,
  }
);

module.exports = Categoria;
