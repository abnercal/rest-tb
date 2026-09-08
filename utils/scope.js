/**
 * Alcance de datos por sucursal (multi-sucursal).
 *
 * Roles y permisos definen QUÉ acción puede hacer un usuario;
 * este módulo define SOBRE QUÉ sucursal puede hacerla.
 * SUPERADMIN ve todas las sucursales; el resto, solo la del JWT (req.user.idsucursal).
 */

const esSuperadmin = (user) => (user?.roles || []).includes("SUPERADMIN");

/**
 * Fragmento para hacer spread dentro de un `where` de Sequelize.
 *   - SUPERADMIN → {} (sin restricción)
 *   - resto      → { [campo]: idsucursal }
 *
 * Lanza 403 si un usuario no-superadmin no tiene sucursal asignada
 * (configuración inválida en un sistema multi-sucursal).
 *
 * @param {object} user  - req.user (payload JWT: { idsucursal, roles, ... })
 * @param {string} campo - columna de sucursal en el modelo objetivo (default "idsucursal")
 * @returns {object}
 */
const sucursalScope = (user, campo = "idsucursal") => {
  if (esSuperadmin(user)) return {};

  const id = user?.idsucursal;
  if (id === undefined || id === null) {
    const err = new Error("El usuario no tiene una sucursal asignada");
    err.status = 403;
    throw err;
  }
  return { [campo]: id };
};

/**
 * Verifica que un registro pertenezca a la sucursal del usuario.
 * No hace nada para SUPERADMIN ni cuando `user` no se pasa (llamada interna de confianza).
 * Lanza 404 (no 403) a propósito: no se revela que el recurso existe en otra sucursal.
 *
 * @param {object|null} registro - instancia Sequelize o plain con el campo de sucursal
 * @param {object|null} user
 * @param {string} campo
 */
const assertMismaSucursal = (registro, user, campo = "idsucursal") => {
  if (!user || esSuperadmin(user)) return;
  if (!registro || registro[campo] !== user.idsucursal) {
    const err = new Error("Recurso no encontrado");
    err.status = 404;
    throw err;
  }
};

module.exports = { sucursalScope, assertMismaSucursal, esSuperadmin };
