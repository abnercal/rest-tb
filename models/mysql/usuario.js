const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

const Usuario = dbConnect.define('Usuario',{
        _id : {
            field:'idusuarios', 
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },
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
            type: DataTypes.STRING,
            allowNull: true
        },
        idsucursal: {
            field: "idsucursal",
            type: DataTypes.INTEGER,
            allowNull: true
        },
    },
    {
        tableName: 'usuarios',
        timestamps: true,
    }
);

Usuario.associate = (models) => {
  Usuario.belongsTo(models.Sucursal, {
    foreignKey: 'idsucursal',
    as: 'Sucursal'
  });
};

module.exports = Usuario;