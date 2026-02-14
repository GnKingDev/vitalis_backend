const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { generateRandomPassword } = require('../utils/passwordGenerator');
const { Op, Sequelize } = require('sequelize');

/**
 * Connexion d'un utilisateur
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Rechercher l'utilisateur (case-insensitive)
    const user = await User.findOne({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('email')),
        Sequelize.fn('LOWER', email)
      )
    });
    
    if (!user) {
      return res.status(401).json(
        errorResponse('Email ou mot de passe incorrect', 401)
      );
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json(
        errorResponse('Email ou mot de passe incorrect', 401)
      );
    }
    
    // Vérifier que l'utilisateur est actif
    if (!user.isActive) {
      return res.status(403).json(
        errorResponse('Votre compte est désactivé. Contactez l\'administrateur.', 403)
      );
    }
    
    // Vérifier que l'utilisateur n'est pas suspendu
    if (user.isSuspended) {
      return res.status(403).json(
        errorResponse('Votre compte a été suspendu. Contactez l\'administrateur.', 403)
      );
    }
    
    // Vérifier si c'est la première connexion (lastLogin est null)
    const isFirstLogin = user.lastLogin === null;
    
    // Mettre à jour lastLogin
    await user.update({ lastLogin: new Date() });
    
    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn
      }
    );
    
    // Retourner le token et les informations utilisateur
    res.json(successResponse({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        mustChangePassword: isFirstLogin // Indique si l'utilisateur doit changer son mot de passe
      }
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Déconnexion (optionnel avec JWT stateless)
 */
exports.logout = async (req, res) => {
  res.json(successResponse(null, 'Déconnexion réussie'));
};

/**
 * Récupérer les informations de l'utilisateur connecté
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    // Ajouter le flag mustChangePassword si c'est la première connexion
    const userData = user.toJSON();
    userData.mustChangePassword = user.lastLogin === null;
    
    res.json(successResponse(userData));
  } catch (error) {
    next(error);
  }
};

/**
 * Changer le mot de passe de l'utilisateur connecté
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json(
        errorResponse('Utilisateur non trouvé', 404)
      );
    }
    
    // Vérifier le mot de passe actuel seulement si fourni (optionnel)
    // Si currentPassword est fourni, on le vérifie pour sécurité
    // Sinon, on permet le changement directement (utile pour première connexion ou reset admin)
    if (currentPassword) {
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json(
          errorResponse('Mot de passe actuel incorrect', 401)
        );
      }
    }
    
    // Valider le nouveau mot de passe
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json(
        errorResponse('Le nouveau mot de passe doit contenir au moins 8 caractères', 400)
      );
    }
    
    // Mettre à jour le mot de passe
    await user.update({ password: newPassword });
    
    res.json(successResponse(null, 'Mot de passe modifié avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Rafraîchir le token JWT
 */
exports.refresh = async (req, res, next) => {
  try {
    const token = jwt.sign(
      {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn
      }
    );
    
    res.json(successResponse({ token }));
  } catch (error) {
    next(error);
  }
};

/**
 * Liste tous les utilisateurs
 * Admin: peut voir tous les utilisateurs
 * Reception: peut voir uniquement les techniciens de laboratoire (role=lab)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const user = req.user;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    // Si l'utilisateur est réception, limiter aux techniciens de laboratoire uniquement
    if (user.role === 'reception') {
      where.role = 'lab';
      // Si un rôle est spécifié dans la query mais ce n'est pas 'lab', retourner vide
      if (role && role !== 'lab') {
        return res.json({
          success: true,
          data: {
            users: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: parseInt(limit)
            }
          }
        });
      }
    } else if (user.role !== 'admin') {
      // Seuls admin et reception peuvent accéder à cette route
      return res.status(403).json(
        errorResponse('Accès refusé. Permissions insuffisantes.', 403)
      );
    } else {
      // Admin: peut filtrer par n'importe quel rôle
      if (role) {
        where.role = role;
      }
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      where[Op.or] = [
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('name')),
          Op.like,
          `%${searchLower}%`
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')),
          Op.like,
          `%${searchLower}%`
        )
      ];
    }
    
    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques sur les utilisateurs
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const total = await User.count();
    const active = await User.count({ where: { isActive: true } });
    const suspended = await User.count({ where: { isSuspended: true } });
    
    const byRole = await User.findAll({
      attributes: [
        'role',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });
    
    const byRoleObj = {};
    byRole.forEach(item => {
      byRoleObj[item.role] = parseInt(item.count);
    });
    
    res.json(successResponse({
      total,
      byRole: byRoleObj,
      active,
      suspended
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer un utilisateur par ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json(
        errorResponse('Utilisateur non trouvé', 404)
      );
    }
    
    res.json(successResponse(user));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un nouvel utilisateur
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;
    
    // Vérifier l'unicité de l'email
    const existingUser = await User.findOne({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('email')),
        Sequelize.fn('LOWER', email)
      )
    });
    
    if (existingUser) {
      return res.status(400).json(
        errorResponse('Email déjà utilisé', 400)
      );
    }
    
    // Générer un mot de passe aléatoire si aucun n'est fourni
    const generatedPassword = password || generateRandomPassword(12);
    
    // Stocker le mot de passe en clair temporairement pour la réponse
    const plainPassword = generatedPassword;
    
    const user = await User.create({
      name,
      email,
      password: generatedPassword,
      role,
      department
    });
    
    res.status(201).json(successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      password: plainPassword, // Retourner le mot de passe en clair uniquement lors de la création
      createdAt: user.createdAt
    }, 'Utilisateur créé avec succès. Le mot de passe doit être modifié à la première connexion.'));
  } catch (error) {
    next(error);
  }
};

/**
 * Mettre à jour un utilisateur
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json(
        errorResponse('Utilisateur non trouvé', 404)
      );
    }
    
    const { name, email, role, department } = req.body;
    
    // Vérifier l'unicité de l'email si modifié
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')),
          Sequelize.fn('LOWER', email)
        )
      });
      
      if (existingUser) {
        return res.status(400).json(
          errorResponse('Email déjà utilisé', 400)
        );
      }
    }
    
    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
      department: department !== undefined ? department : user.department
    });
    
    res.json(successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      updatedAt: user.updatedAt
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Suspendre un utilisateur
 */
exports.suspendUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json(
        errorResponse('Utilisateur non trouvé', 404)
      );
    }
    
    // Empêcher la suspension de son propre compte
    if (user.id === req.user.id) {
      return res.status(400).json(
        errorResponse('Vous ne pouvez pas suspendre votre propre compte', 400)
      );
    }
    
    await user.update({ isSuspended: true });
    
    res.json(successResponse(null, 'Utilisateur suspendu avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Réactiver un utilisateur
 */
exports.activateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json(
        errorResponse('Utilisateur non trouvé', 404)
      );
    }
    
    await user.update({ isSuspended: false });
    
    res.json(successResponse(null, 'Utilisateur réactivé avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un utilisateur
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json(
        errorResponse('Utilisateur non trouvé', 404)
      );
    }
    
    // Empêcher la suppression de son propre compte
    if (user.id === req.user.id) {
      return res.status(400).json(
        errorResponse('Vous ne pouvez pas supprimer votre propre compte', 400)
      );
    }
    
    await user.destroy();
    
    res.json(successResponse(null, 'Utilisateur supprimé avec succès'));
  } catch (error) {
    next(error);
  }
};
