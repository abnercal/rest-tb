const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Presentacion = dbConnect.define('Presentacion', {
        _id: {
            field:'idpresentacion',
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        nombre: {
            field:'nombre',
            type: DataTypes.STRING,
            allowNull: false,
        },
        estado: {
            field:'estado',
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        },

    },
    {
        tableName: 'presentacion',
        timestamps: false,
    }
);

module.exports = Presentacion;