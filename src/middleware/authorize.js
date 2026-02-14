const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware d'autorisation basé sur les rôles
 * @param {string[]} roles - Liste des rôles autorisés
 * @returns {Function} Middleware function
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        errorResponse('Authentification requise', 401)
      );
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        errorResponse('Accès refusé. Permissions insuffisantes.', 403)
      );
    }
    
    next();
  };
};

module.exports = { authorize };
