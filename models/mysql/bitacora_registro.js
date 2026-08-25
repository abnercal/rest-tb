const { dbConnect } = require("../../config/db/connection");
const { DataTypes } = require("sequelize");

/**
 * Bitácora de cambios de estado (Orden, Compra). Tabla ya existía en el
 * esquema pero sin uso ni modelo — se reactiva acá para auditar transiciones
 * de estado (Cotizacion -> Confirmada -> Entregada / Anulada) que antes se
 * sobreescribían sin dejar rastro. Ver helpers/bitacora-helper.js.
 */
const BitacoraRegistro = dbConnect.define('BitacoraRegistro', {
  idbitacora: {
    field: 'idbitacora',
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  accion: {
    field: 'accion',
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  codigoemp: {
    field: 'codigoemp',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  idregistro: {
    field: 'idregistro',
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  tiporeg: {
    field: 'tiporeg',
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  fecha: {
    field: 'fecha',
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  estado_anterior: {
    field: 'estado_anterior',
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  estado_nuevo: {
    field: 'estado_nuevo',
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, {
  tableName: 'bitacora_registro',
  timestamps: false,
});

BitacoraRegistro.associate = (models) => {
  BitacoraRegistro.belongsTo(models.Usuario, {
    foreignKey: 'codigoemp',
    as: 'Usuario',
    constraints: false, // no hay FK real en el esquema, es una columna libre
  });
};

module.exports = BitacoraRegistro;
