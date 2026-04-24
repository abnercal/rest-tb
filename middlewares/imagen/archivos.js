const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { errorResponse } = require("../../utils/handleError");

// ─── Configuración ────────────────────────────────────────────────────────────
const ALLOWED_TYPES  = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB    = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ─── Crear carpeta si no existe ───────────────────────────────────────────────
const createFolder = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
};

// ─── Storage dinámico ─────────────────────────────────────────────────────────
const buildStorage = (folder = "uploads") =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join("public", folder);
      createFolder(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext        = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}${ext}`;
      cb(null, uniqueName);
    },
  });

// ─── Filtro de tipos ──────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    const err = new Error(`Tipo no permitido. Solo: ${ALLOWED_TYPES.join(", ")}`);
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

// ─── Factory principal ────────────────────────────────────────────────────────
/**
 * @param {string} folder - Subcarpeta dentro de public/ (ej: 'usuarios', 'productos')
 * @param {string} field  - Nombre del campo del form-data (default: 'imagen')
 */
const upload = (folder = "uploads", field = "imagen") =>
  multer({
    storage: buildStorage(folder),
    fileFilter,
    limits: { fileSize: MAX_SIZE_BYTES },
  }).single(field);

// ─── Manejador de errores de multer ──────────────────────────────────────────
/**
 * Colócalo DESPUÉS del middleware upload en la ruta.
 * Usa el mismo errorResponse centralizado del proyecto.
 *
 * Ejemplo:
 *   router.post("/", upload("usuarios"), handleUploadError, ctrl.createUsuarioCtrl)
 */
const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err.code === "LIMIT_FILE_SIZE") {
    err.message = `La imagen no debe superar ${MAX_SIZE_MB}MB`;
    err.status  = 400;
  }

  return errorResponse(req, res, err, "Error al procesar la imagen");
};

module.exports = { upload, handleUploadError };
