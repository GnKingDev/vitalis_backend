const { errorResponse } = require('../utils/responseHelper');
const config = require('../config');

/**
 * Middleware de gestion d'erreurs centralisé
 */
const errorHandler = (err, req, res, next) => {
  // Logger l'erreur
  console.error('Error:', {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });
  
  // Erreur de validation Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erreurs de validation',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Erreur de contrainte unique
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json(
      errorResponse('Cette ressource existe déjà', 409)
    );
  }
  
  // Erreur de clé étrangère
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json(
      errorResponse('Référence invalide', 400)
    );
  }
  
  // Erreur 404
  if (err.status === 404 || err.statusCode === 404) {
    return res.status(404).json(
      errorResponse(err.message || 'Ressource non trouvée', 404)
    );
  }
  
  // Erreur JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json(
      errorResponse('Token invalide ou expiré', 401)
    );
  }
  
  // Erreur par défaut
  const statusCode = err.status || err.statusCode || 500;
  const message = config.nodeEnv === 'production' 
    ? 'Une erreur est survenue' 
    : err.message;
  
  res.status(statusCode).json(
    errorResponse(message, statusCode)
  );
};

module.exports = { errorHandler };
