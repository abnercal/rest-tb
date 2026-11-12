const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

// UNIQUE en BD: nombre -> uq_publico_nombre
const PublicoObjetivo = dbConnect.define('PublicoObjetivo', {
        _id: {
            field:'idpublico',
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
        estado: {
            field:'estado',
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        },

    },
    {
        tableName: 'publico_objetivo',
        timestamps: false,
    }
);

module.exports = PublicoObjetivo;
