const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const EstadoOrden = dbConnect.define('EstadoOrden', {
        idestado: {
            field:'idestado',
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
        descripcion: {
            field:'descripcion',
            type: DataTypes.STRING(45),
            allowNull: false,
        },

    },
    {
        tableName: 'estado_orden',
        timestamps: false,
    }
);

module.exports = EstadoOrden;