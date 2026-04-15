const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const UsuarioRol = dbConnect.define("UsuarioRol", {
        _id: {
            field:'id_roles',
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        idusuario: {
            field:'idusuario',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        idrol: {
            field:'idrol',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: "roles",
        timestamps: false,
    },
);

module.exports = UsuarioRol;
