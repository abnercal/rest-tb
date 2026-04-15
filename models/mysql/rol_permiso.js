const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const RolPermiso = dbConnect.define("RolPermiso", {
        _id: {
            field:'idrol_permisos',
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        idrol: {
            field:'idrol',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        idpermiso: {
            field:'idpermisos',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: "rol_permisos",
        timestamps: false,
    }
);

module.exports = RolPermiso;