const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Marca = dbConnect.define('Marca', {
        _id: {
            field:'idmarca',
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
        tableName: 'marca',
        timestamps: false,
    }
);

module.exports = Marca;