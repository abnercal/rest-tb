const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Rol = dbConnect.define("Rol", {
        _id: {
            field:'idrol',
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        nombrerol: {
            field:'nombrerol',
            type: DataTypes.STRING(45),
            allowNull: false,
            unique: true,
        },
    },
    {
        tableName: "rol",
        timestamps: false,
    }
);

module.exports = Rol;