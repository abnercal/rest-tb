/**
 * Formato legible del stock (solo presentación de datos; no toca la BD).
 *
 * El stock se guarda SIEMPRE en unidades base del producto (producto.idunidad). Este helper lo
 * expresa en palabras: "64 unidades (8 cajas)", "80 bolsas (13 fardos + 2 bolsas)".
 *
 * Reglas:
 *  - La unidad base sale de la Unidad del producto (no del nombre de la presentación de
 *    cantidad_base 1, que suele llamarse "Genérico").
 *  - Solo se equipara con la presentación MÁS GRANDE que quepa en el stock (cantidad_base > 1);
 *    el desglose completo por presentación va en `presentaciones` para quien quiera armarlo distinto.
 *  - El plural es una heurística simple en español (primera palabra del nombre); los campos
 *    estructurados permiten al frontend formatear a su manera.
 */

const round2 = (n) => Math.round(Number(n) * 100) / 100;

// 7 -> "7", 7.5 -> "7.5", 7.50 -> "7.5" (máx. 2 decimales, sin ceros de relleno)
const numero = (n) => String(round2(n));

const pluralizarPalabra = (palabra) => {
  if (/[aeiouáéíóú]$/.test(palabra)) return `${palabra}s`;
  if (palabra.endsWith("z")) return `${palabra.slice(0, -1)}ces`;
  if (palabra.endsWith("s")) return palabra;
  return `${palabra}es`;
};

// "Caja" + 8 -> "cajas"; "Unidad" + 1 -> "unidad"; "Caja grande" + 2 -> "cajas grande" (solo la 1ª palabra).
const nombreConCantidad = (nombre, cantidad) => {
  const limpio = String(nombre || "").trim().toLowerCase();
  if (!limpio) return "";
  if (Number(cantidad) === 1) return limpio;
  const [primera, ...resto] = limpio.split(/\s+/);
  return [pluralizarPalabra(primera), ...resto].join(" ");
};

const cantidadConNombre = (cantidad, nombre) => `${numero(cantidad)} ${nombreConCantidad(nombre, cantidad)}`.trim();

/**
 * @param {object} p
 * @param {number|string} p.stock            stock en unidades base
 * @param {string} p.unidad                  nombre de la unidad base del producto (ej. "Unidad", "Bolsa")
 * @param {Array<{id?, nombre, cantidad_base}>} p.presentaciones  presentaciones del producto
 * @returns {{ stock_texto: string, stock_detalle: object }}
 */
const formatearStock = ({ stock, unidad, presentaciones = [] }) => {
  const total = round2(stock || 0);
  const unidadNombre = unidad || "unidad";

  // Solo presentaciones mayores que la unidad base, de mayor a menor.
  const mayores = presentaciones
    .map((p) => ({ id: p.id ?? null, nombre: p.nombre, cantidad_base: Number(p.cantidad_base) || 1 }))
    .filter((p) => p.cantidad_base > 1 && p.nombre)
    .sort((a, b) => b.cantidad_base - a.cantidad_base);

  const detalle = mayores.map((p) => {
    // El epsilon absorbe ruido de punto flotante (ej. 0.3/0.1 = 2.9999999999999996) sin redondear hacia
    // arriba valores como 7.995, que dejarían un resto negativo.
    const completas = Math.floor(total / p.cantidad_base + 1e-9);
    return {
      id: p.id,
      presentacion: p.nombre,
      cantidad_base: p.cantidad_base,
      completas,
      resto: round2(total - completas * p.cantidad_base),
    };
  });

  let texto = cantidadConNombre(total, unidadNombre);
  const principal = detalle.find((d) => d.completas >= 1);
  if (principal) {
    const partes = [cantidadConNombre(principal.completas, principal.presentacion)];
    if (principal.resto > 0) partes.push(cantidadConNombre(principal.resto, unidadNombre));
    texto += ` (${partes.join(" + ")})`;
  }

  return {
    stock_texto: texto,
    stock_detalle: { stock: total, unidad: unidadNombre, presentaciones: detalle },
  };
};

// Etiqueta de variante: "Talla M · Azul", "Talla 42", "Azul". Sin talla ni color -> "".
const etiquetaVariante = (talla, color) => {
  const partes = [];
  if (talla?.nombre) partes.push(`Talla ${talla.nombre}`);
  if (color?.nombre) partes.push(color.nombre);
  return partes.join(" · ");
};

module.exports = { formatearStock, etiquetaVariante, nombreConCantidad };
