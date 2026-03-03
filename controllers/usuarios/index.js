const feature = require("./feature");
const { handleHttpError } = require("../../utils/manejoError");

/**
 * Obtener todos los usuarios
 */
const getUsuarios = async (req, res) => {
  try {
    const usuarios = await feature.getUsuarios(req.query);
    res.status(200).json(usuarios);
  } catch (error) {
    handleHttpError(res, error, "Error al obtener los usuarios", 500);
  }
};

/**
 * Obtener usuario por ID
 */
const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await feature.getUsuarioById(id);
    res.status(200).json(usuario);
  } catch (error) {
    handleHttpError(res, error, "Error al obtener el usuario", 500);
  }
};

/**
 * Crear usuario
 */
const crearUsuario = async (req, res) => {
  try {
    const usuario = await feature.createUsuario(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    const status = error.status || 500;
    handleHttpError(res, error, error.message, status);
  }
};

/**
 * Actualizar usuario
 */
const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await feature.updateUsuario(id, req.body);
    res.status(200).json(usuario);
  } catch (error) {
    handleHttpError(res, error, "Error al actualizar el usuario", 500);
  }
};

/**
 * Eliminar usuario
 */
const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    await feature.deleteUsuario(id);
    res.status(204).send();
  } catch (error) {
    handleHttpError(res, error, "Error al eliminar el usuario", 500);
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  crearUsuario,
  updateUsuario,
  deleteUsuario,
};