const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const UnidadMed = dbConnect.define('UnidadMed', {
        _id: {
            field:'idunidad',
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
        abreviatura: {
            field:'abreviatura',
            type: DataTypes.STRING(45),
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
        tableName: 'unidad_medida',
        timestamps: false,
    }
);

module.exports = UnidadMed;