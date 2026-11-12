const { body } = require("express-validator");
const validateResults = require("../../utils/validateResults");
const { esIdEstricto } = require("../../utils/ids");

// ─── Variantes / público objetivo (compartido por create y update) ────────────
// Contrato: "variantes" ausente (undefined) se queda en undefined (= no tocar variantes
// en el update); [] es un valor válido (= deshabilitar todas). Por eso acá NO se usa
// ninguna cadena que convierta undefined en [] ni sanitizadores nativos (.trim(),
// .toArray(), .toString()) que castean objetos a texto: solo validadores y un
// customSanitizer que deja pasar tal cual todo lo que no sea un string parseable.

// multipart/form-data manda todo como texto: se parsea el JSON si viene como string.
const parseJsonSiEsString = (value) => {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
};

// Entero positivo estricto (number o texto numérico). A diferencia de .isInt(), no
// acepta arrays (los validadores estándar validan cada elemento de un array) ni objetos.
const esIdValido = (v) =>
  (typeof v === "number" && Number.isSafeInteger(v) && v > 0) ||
  (typeof v === "string" && /^\d+$/.test(v.trim()) && Number(v) > 0);

const esBooleanoValido = (v) =>
  [true, false, 1, 0, "true", "false", "1", "0"].includes(v);

const esObjetoPlano = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// ─── Precios por tipo de cliente (+ variante opcional) ────────────────────────
// Cada precio de presentaciones[].precios[] puede traer idvariante (null/ausente = precio genérico).
// La clave de unicidad por presentación es (idtipoCli, idvariante-o-NULL): se permite UN precio genérico
// y UN precio por variante para el mismo tipo de cliente. Que la variante exista/sea del producto/esté
// habilitada lo valida el controller (necesita la BD).
const preciosVarianteValidators = [
  body("presentaciones.*.precios.*.idvariante")
    .if(body("presentaciones").exists())
    .optional({ values: "null" })
    .custom(esIdEstricto)
    .withMessage("El idvariante de un precio debe ser un ID numérico"),
];

// Devuelve un mensaje de error si la presentación repite (idtipoCli, idvariante), o null.
// Las claves se normalizan con Number() para que 1 y "1" cuenten como el mismo valor.
const duplicadoDePrecios = (p) => {
  if (!p || !Array.isArray(p.precios)) return null;
  const vistas = new Set();
  for (const pr of p.precios) {
    if (pr === null || typeof pr !== "object") continue;
    const conVariante = pr.idvariante !== undefined && pr.idvariante !== null;
    const clave = `${Number(pr.idtipoCli)}:${conVariante ? Number(pr.idvariante) : 0}`;
    if (vistas.has(clave)) {
      return conVariante
        ? `No se permiten precios duplicados para el mismo tipo de cliente y variante en la presentación ${p.idpresentacion}`
        : `No se permiten precios duplicados para el mismo tipo de cliente en la presentación ${p.idpresentacion}`;
    }
    vistas.add(clave);
  }
  return null;
};

const variantesValidators = [
  body("idpublico")
    // En multipart, "" / "null" significan "sin público objetivo"; el sanitizer corre
    // antes del chequeo de optional, así que ese null ya salta el custom de abajo.
    .optional({ values: "null" })
    .customSanitizer((value) => (value === "" || value === "null" ? null : value))
    .custom(esIdValido)
    .withMessage("El público objetivo debe ser un ID numérico"),

  body("tiene_variantes")
    .optional()
    .custom(esBooleanoValido)
    .withMessage("tiene_variantes debe ser verdadero o falso")
    .customSanitizer((value) => {
      if (value === true || value === 1 || value === "true" || value === "1") return true;
      if (value === false || value === 0 || value === "false" || value === "0") return false;
      return value;
    }),

  body("variantes")
    .optional()
    .customSanitizer(parseJsonSiEsString)
    .isArray({ max: 500 })
    .withMessage("Las variantes deben ser un arreglo de hasta 500 elementos"),

  body("variantes")
    .if(body("variantes").isArray())
    .custom((value) => {
      value.forEach((v, i) => {
        if (!esObjetoPlano(v)) {
          throw new Error(`La variante en la posición ${i} debe ser un objeto`);
        }
        const sinIdvariante = v.idvariante === undefined || v.idvariante === null;
        const sinTalla = v.idtalla === undefined || v.idtalla === null;
        const sinColor = v.idcolor === undefined || v.idcolor === null;
        if (sinIdvariante && sinTalla && sinColor) {
          throw new Error(
            `La variante en la posición ${i} debe indicar idtalla o idcolor (o idvariante para una existente)`,
          );
        }
      });
      return true;
    }),

  body("variantes.*.idvariante")
    .if(body("variantes").isArray())
    .optional({ values: "null" })
    .custom(esIdValido)
    .withMessage("idvariante debe ser un ID numérico"),

  body("variantes.*.idtalla")
    .if(body("variantes").isArray())
    .optional({ values: "null" })
    .custom(esIdValido)
    .withMessage("idtalla debe ser un ID numérico"),

  body("variantes.*.idcolor")
    .if(body("variantes").isArray())
    .optional({ values: "null" })
    .custom(esIdValido)
    .withMessage("idcolor debe ser un ID numérico"),

  body("variantes.*.sku")
    .if(body("variantes").isArray())
    .optional({ values: "null" })
    .custom((v) => typeof v === "string" && v.trim().length <= 60)
    .withMessage("El SKU debe ser un texto de máximo 60 caracteres"),

  body("variantes.*.estado")
    .if(body("variantes").isArray())
    .optional()
    .custom(esBooleanoValido)
    .withMessage("El estado de la variante debe ser 0/1 o verdadero/falso"),
];

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
        const mensaje = duplicadoDePrecios(p);
        if (mensaje) throw new Error(mensaje);
      });

      return true;
    }),

  ...preciosVarianteValidators,

  ...variantesValidators,

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
        const mensaje = duplicadoDePrecios(p);
        if (mensaje) throw new Error(mensaje);
      });

      return true;
    }),

  ...preciosVarianteValidators,

  ...variantesValidators,

  validateResults,
];

module.exports = {
  createProductoValidator,
  updateProductoValidator,
};
