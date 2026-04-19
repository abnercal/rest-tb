const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Barcode = dbConnect.define('Barcode', {
        idbarcode: {
            field:'idbarcode',
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: true,
            autoIncrement: true,
        },
        barcode: {
            field:'barcode',
            type: DataTypes.STRING,
            allowNull: false,
        },
        tipo: {
            field:'tipo',
            type: DataTypes.STRING,
            allowNull: true
        },
        estado: {
            field:'estado',
            type: DataTypes.BOOLEAN,
            allowNull: true 
        },
        codigoprod: {
            field:'codigoprod',
            type: DataTypes.INTEGER,
            allowNull: false
        },

    },
    {
        tableName: 'prod_barcode',
        timestamps: false,
    }
);

module.exports = Barcode;