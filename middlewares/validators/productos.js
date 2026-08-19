const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");

const createProductoValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isString()
    .withMessage("El nombre del producto debe ser un texto"),

  body("idmarca")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La marca debe ser un ID numérico"),

  body("idcategoria")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La categoría debe ser un ID numérico"),

  body("idunidad")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La unidad debe ser un ID numérico"),

  body("presentaciones")
    .optional()
    .customSanitizer((value) => {
      if (typeof value === "string") {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    })
    .isArray()
    .withMessage("Las presentaciones deben ser un arreglo"),

  body("presentaciones.*.idpresentacion")
    .if(body("presentaciones").exists())
    .isInt()
    .withMessage("Cada presentación debe tener un ID válido"),

  body("presentaciones.*.cantidad_base")
    .if(body("presentaciones").exists())
    .optional()
    .isFloat({ min: 0 })
    .withMessage("La cantidad base debe ser un número positivo"),

  body("presentaciones.*.precios")
    .if(body("presentaciones").exists())
    .optional()
    .isArray()
    .withMessage("Los precios de una presentación deben ser un arreglo"),

  body("presentaciones.*.precios.*.idtipoCli")
    .if(body("presentaciones").exists())
    .isInt()
    .withMessage("Cada precio debe indicar un tipo de cliente válido"),

  body("presentaciones.*.precios.*.precio")
    .if(body("presentaciones").exists())
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número positivo"),

  body("presentaciones")
    .if(body("presentaciones").exists())
    .custom((value) => {
      const ids = value.map(p => p.idpresentacion);
      const duplicados = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicados.length > 0) {
        const repetidos = [...new Set(duplicados)].join(", ");
        throw new Error(`No se permiten presentaciones duplicadas. IDs repetidos: ${repetidos}`);
      }

      value.forEach((p) => {
        if (!p.precios) return;
        const idsTipoCli = p.precios.map((pr) => pr.idtipoCli);
        const dupTipoCli = idsTipoCli.filter((id, index) => idsTipoCli.indexOf(id) !== index);
        if (dupTipoCli.length > 0) {
          throw new Error(
            `No se permiten precios duplicados para el mismo tipo de cliente en la presentación ${p.idpresentacion}`,
          );
        }
      });

      return true;
    }),

  validateResults,
];

const updateProductoValidator = [
  body("nombre")
    .optional()
    .isString()
    .withMessage("El nombre del producto debe ser un texto"),

  body("idmarca")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La marca debe ser un ID numérico"),

  body("idcategoria")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La categoría debe ser un ID numérico"),

  body("idunidad")
    .optional({ values: "null" })
    .isInt()
    .withMessage("La unidad debe ser un ID numérico"),

  body("presentaciones")
    .optional()
    .customSanitizer((value) => {
      if (typeof value === "string") {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    })
    .isArray()
    .withMessage("Las presentaciones deben ser un arreglo"),

  body("presentaciones.*.idpresentacion")
    .if(body("presentaciones").exists())
    .isInt()
    .withMessage("Cada presentación debe tener un ID válido"),

  body("presentaciones.*.precios")
    .if(body("presentaciones").exists())
    .optional()
    .isArray()
    .withMessage("Los precios de una presentación deben ser un arreglo"),

  body("presentaciones.*.precios.*.idtipoCli")
    .if(body("presentaciones").exists())
    .isInt()
    .withMessage("Cada precio debe indicar un tipo de cliente válido"),

  body("presentaciones.*.precios.*.precio")
    .if(body("presentaciones").exists())
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número positivo"),

  body("presentaciones")
    .if(body("presentaciones").exists())
    .custom((value) => {
      const ids = value.map(p => p.idpresentacion);
      const duplicados = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicados.length > 0) {
        const repetidos = [...new Set(duplicados)].join(", ");
        throw new Error(`No se permiten presentaciones duplicadas. IDs repetidos: ${repetidos}`);
      }

      value.forEach((p) => {
        if (!p.precios) return;
        const idsTipoCli = p.precios.map((pr) => pr.idtipoCli);
        const dupTipoCli = idsTipoCli.filter((id, index) => idsTipoCli.indexOf(id) !== index);
        if (dupTipoCli.length > 0) {
          throw new Error(
            `No se permiten precios duplicados para el mismo tipo de cliente en la presentación ${p.idpresentacion}`,
          );
        }
      });

      return true;
    }),

  validateResults,
];

module.exports = {
  createProductoValidator,
  updateProductoValidator,
};
