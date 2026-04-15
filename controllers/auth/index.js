const feature = require("./feature");
const { errorResponse, successResponse } = require("../../utils/handleError");

const login = async (req, res) => {
  try {
    const data = await feature.login(req.body);
    res.status(200).json(data);
  } catch (error) {
    const status = error.status || 500;
    errorResponse(res, error, error.message, status);
  }
};

module.exports = {
  login,
};