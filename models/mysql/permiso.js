const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Permiso = dbConnect.define("Permiso", {
        _id: {
            field:'idpermiso',
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombre: {
            field:'nombre',
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: true,
        },
    },
    {
        tableName: "permiso",
        timestamps: false,
    }
    );

module.exports = Permiso;