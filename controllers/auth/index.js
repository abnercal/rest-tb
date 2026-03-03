const feature = require("./feature");
const { handleHttpError } = require("../../utils/manejoError");

const login = async (req, res) => {
  try {
    const data = await feature.login(req.body);
    res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    handleHttpError(res, error, error.message, status);
  }
};

module.exports = {
  login,
};