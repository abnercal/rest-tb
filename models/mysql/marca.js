const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Marca = dbConnect.define('Marca', {
        _id: {
            field:'idmarca',
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
        tableName: 'marca',
        timestamps: false,
    }
);

module.exports = Marca;