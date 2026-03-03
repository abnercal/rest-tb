const { validationResult } = require("express-validator");

const validateResults = (req, res, next) => {
  try {
    validationResult(req).throw();
    return next();
  } catch (error) {
    res.status(400).json({
      errors: error.array(),
    });
  }
};

module.exports = validateResults;