const fs   = require("fs");
const path = require("path");

// ─── Logger ───────────────────────────────────────────────────────────────────
// Crea la carpeta logs/ en la raíz del proyecto si no existe
const LOG_DIR  = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "errors.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Escribe una línea en logs/errors.log con timestamp, ruta y mensaje.
 * No lanza excepciones — si falla escribir el log, solo lo imprime en consola.
 */
const writeLog = (error, req) => {
  try {
    const timestamp = new Date().toISOString();
    const method    = req?.method  || "–";
    const url       = req?.originalUrl || "–";
    const status    = error?.status || 500;
    const message   = error?.message || String(error);
    const stack     = error?.stack  || "";

    const line = `[${timestamp}] ${status} ${method} ${url} → ${message}\n${stack ? stack + "\n" : ""}---\n`;

    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch (logErr) {
    console.error("[Logger] No se pudo escribir el log:", logErr.message);
  }
};

// ─── errorResponse ────────────────────────────────────────────────────────────
/**
 * Respuesta de error centralizada.
 * Ahora acepta `req` como primer parámetro para loguear método y ruta.
 * También sigue funcionando sin `req` (retrocompatible).
 *
 * Uso nuevo (recomendado):
 *   errorResponse(req, res, error, "Mensaje genérico")
 *
 * Uso anterior (sigue funcionando):
 *   errorResponse(res, error, "Mensaje genérico")
 */
const errorResponse = (reqOrRes, resOrError, errorOrMessage, messageOrCode = null, statusCode = null) => {
  // Detectar si el primer argumento es req o res
  let req, res, error, message, status;

  if (reqOrRes?.method && reqOrRes?.originalUrl) {
    // Llamada nueva: (req, res, error, message, statusCode)
    req     = reqOrRes;
    res     = resOrError;
    error   = errorOrMessage;
    message = messageOrCode || "Algo salió mal";
    status  = statusCode || error?.status || 500;
  } else {
    // Llamada antigua: (res, error, message, statusCode)
    req     = null;
    res     = reqOrRes;
    error   = resOrError;
    message = errorOrMessage || "Algo salió mal";
    status  = messageOrCode  || error?.status || 500;
  }

  // Siempre loguear en archivo
  writeLog(error, req);

  // En desarrollo también imprimir en consola
  if (process.env.NODE_ENV === "development") {
    console.error(`[${status}] ${req?.method || ""} ${req?.originalUrl || ""}`, error);
  }

  const finalMessage = error?.message || message;

  // Incluir propiedades adicionales del error si existen (code, detalles, etc.)
  const extra = {};
  if (error?.code)       extra.code    = error.code;
  if (error?.detalles)   extra.detalles = error.detalles;
  if (error?.errors)     extra.errors   = error.errors;

  return res.status(status).json({
    ok: false,
    message: finalMessage,
    data:    null,
    meta:    null,
    ...extra,
    ...(process.env.NODE_ENV === "development" && {
      error: error?.message || String(error),
    }),
  });
};

// ─── successResponse ──────────────────────────────────────────────────────────
/**
 * Respuesta exitosa — sin cambios.
 */
const successResponse = (res, message = "OK", data = null, meta = null, status = 200) => {
  return res.status(status).json({
    ok: true,
    message,
    data,
    meta,
  });
};

module.exports = { errorResponse, successResponse };
