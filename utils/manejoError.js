const handleHttpError = (res, error, customMessage = "Algo salió mal", statusCode = 500) => {
    console.log("Error:", error); // Para fines de depuración, solo en desarrollo
    const message = process.env.NODE_ENV === 'development' ? error.message : customMessage; // Solo muestra el mensaje completo en desarrollo
    
    res.status(statusCode).send({ error: message });
  };
  
  /**
   * Handle error with custom message and status code
   * @param {*} res
   * @param {*} message
   * @param {*} code
   */
  const handleErrorResponse = (res, message = "Algo ocurrió", code = 400) => {
    console.log("Error:", message); // Para fines de depuración, solo en desarrollo
    res.status(code).send({ error: message });
  };
  
  module.exports = { handleHttpError, handleErrorResponse };
  