const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

// UNIQUE en BD: nombre -> uq_color_nombre
const Color = dbConnect.define('Color', {
        _id: {
            field:'idcolor',
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        nombre: {
            field:'nombre',
            type: DataTypes.STRING(45),
            allowNull: false,
        },
        hex: {
            field:'hex',
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        estado: {
            field:'estado',
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        },

    },
    {
        tableName: 'color',
        timestamps: false,
    }
);

module.exports = Color;
