const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Presentacion = dbConnect.define('Presentacion', {
        _id: {
            field:'idpresentacion',
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: true
        },
        nombre: {
            field:'nombre',
            type: DataTypes.STRING,
            allowNull: false,
        },
        estado: {
            field:'estado',
            type: DataTypes.BOOLEAN,
        },

    },
    {
        tableName: 'presentacion',
        timestamps: false,
    }
);

module.exports = Presentacion;