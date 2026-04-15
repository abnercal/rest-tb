module.exports = (db) => {
  const { Usuario, Rol, Permiso, UsuarioRol, RolPermiso, Sucursal } = db;

  // Usuario ↔ Rol (N:M)
  Usuario.belongsToMany(Rol, {
    through: UsuarioRol,
    foreignKey: 'idusuario',
    otherKey: 'idrol',
    as: 'Roles'
  });

  Rol.belongsToMany(Usuario, {
    through: UsuarioRol,
    foreignKey: 'idrol',
    otherKey: 'idusuario',
    as: 'UsuariosRol'
  });

  // Rol ↔ Permiso (N:M)
  Rol.belongsToMany(Permiso, {
    through: RolPermiso,
    foreignKey: 'idrol',
    otherKey: 'idpermiso',
    as: 'Permisos'
  });

  Permiso.belongsToMany(Rol, {
    through: RolPermiso,
    foreignKey: 'idpermiso',
    otherKey: 'idrol',
    as: 'Roles'
  });
};