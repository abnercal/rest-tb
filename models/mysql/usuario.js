const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Usuario = dbConnect.define('Usuario',{
        _id : {field:'idusuarios', type: DataTypes.UUID, unique: 'uk_usuario_id', defaultValue: DataTypes.UUIDV4},
        nombre: {
            field:'nombre',
            type: DataTypes.STRING,
            allowNull: false,
        },
        apellido: {
            field:'apellido',
            type: DataTypes.STRING,
        },
        username: {
            field:'username',
            type: DataTypes.STRING,
        },
        email: {
            field:'email',
            type: DataTypes.STRING,
            unique: 'uk_usuario_email',
            allowNull: false,
        },
        password: {
            field:'password',
            type: DataTypes.STRING,
            allowNull: false,
        },
        imagen: {
            field:'imagen',
            type: DataTypes.STRING,
        },
        estado: {
            field:'estado',
            type: DataTypes.INTEGER, defaultValue: 1,
        },
        codigoemp: {
            field:'codigoemp',
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },
    },
    {
        tableName: 'usuarios',
        timestamps: true,
    }
);

module.exports = Usuario;