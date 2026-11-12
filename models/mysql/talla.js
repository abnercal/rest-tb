const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

// UNIQUE en BD: (nombre, tipo) -> uq_talla_nombre_tipo
const Talla = dbConnect.define('Talla', {
        _id: {
            field:'idtalla',
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        nombre: {
            field:'nombre',
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        tipo: {
            field:'tipo',
            type: DataTypes.ENUM('ROPA', 'CALZADO'),
            allowNull: false,
        },
        orden: {
            field:'orden',
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        estado: {
            field:'estado',
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 1
        },

    },
    {
        tableName: 'talla',
        timestamps: false,
    }
);

module.exports = Talla;
