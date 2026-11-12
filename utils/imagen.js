const fs = require('fs');
const path = require('path');

/**
 * Elimina un archivo de imagen del disco de forma segura.
 * 
 * @param {string|null} imagePath - Ruta relativa guardada en la DB
 *   Ejemplos válidos:
 *     - "/usuarios/1714000000000.jpg"
 *     - "/productos/1714000000001.png"
 *     - null / undefined  → no hace nada
 * 
 * La ruta completa en disco se resuelve como:
 *   public + imagePath  →  public/usuarios/1714000000000.jpg
 */
const deleteImageFile = (imagePath) => {
  if (!imagePath) return;

  try {
    if (typeof imagePath !== 'string') return;

    // Quitar el "/" inicial si lo tiene para que path.resolve no lo trate como absoluto
    const relative = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const publicDir = path.resolve(process.cwd(), 'public');
    const fullPath = path.resolve(publicDir, relative);

    // Contención: solo se borran archivos DENTRO de public/. Un valor como
    // "../.env" o una ruta absoluta resolvería fuera y se ignora.
    if (!fullPath.startsWith(publicDir + path.sep)) {
      console.error('[deleteImageFile] Ruta fuera de public/, se ignora:', imagePath);
      return;
    }

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    // No lanzar error si falla borrar la imagen; solo loguearlo
    console.error('[deleteImageFile] No se pudo eliminar la imagen:', err.message);
  }
};

module.exports = { deleteImageFile };