const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware de validation avec Joi
 * @param {object} schema - Schéma Joi
 * @returns {Function} Middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Erreurs de validation',
        errors
      });
    }
    
    // Remplacer req.body par les valeurs validées
    req.body = value;
    next();
  };
};

module.exports = { validate };
