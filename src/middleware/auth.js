const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token et ajoute l'utilisateur à req.user
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        errorResponse('Token manquant', 401)
      );
    }
    
    const token = authHeader.substring(7);
    
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json(
        errorResponse('Utilisateur non trouvé', 401)
      );
    }
    
    if (!user.isActive) {
      return res.status(403).json(
        errorResponse('Votre compte est désactivé. Contactez l\'administrateur.', 403)
      );
    }
    
    if (user.isSuspended) {
      return res.status(403).json(
        errorResponse('Votre compte a été suspendu. Contactez l\'administrateur.', 403)
      );
    }
    
    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        errorResponse('Token invalide', 401)
      );
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        errorResponse('Token expiré', 401)
      );
    }
    next(error);
  }
};

module.exports = { authMiddleware };
