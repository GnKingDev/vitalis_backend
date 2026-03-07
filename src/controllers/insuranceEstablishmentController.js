const { InsuranceEstablishment } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { Op } = require('sequelize');

/**
 * Liste des établissements d'assurance (pour sélecteur accueil)
 * GET /api/v1/insurance-establishments?isActive=true
 */
exports.getAll = async (req, res, next) => {
  try {
    const { isActive = 'true', page, limit = 100, search } = req.query;
    const where = {};
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    const order = [['name', 'ASC']];

    if (page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await InsuranceEstablishment.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order
      });
      return res.json(paginatedResponse(rows, { page: parseInt(page), limit: parseInt(limit) }, count));
    }

    const rows = await InsuranceEstablishment.findAll({ where, order });
    res.json(successResponse(rows));
  } catch (error) {
    next(error);
  }
};

/**
 * Détail d'un établissement
 */
exports.getById = async (req, res, next) => {
  try {
    const establishment = await InsuranceEstablishment.findByPk(req.params.id);
    if (!establishment) {
      return res.status(404).json(errorResponse('Établissement non trouvé', 404));
    }
    res.json(successResponse(establishment));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un établissement (admin)
 */
exports.create = async (req, res, next) => {
  try {
    const { name, code, isActive = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse('Le nom est requis', 400));
    }
    const establishment = await InsuranceEstablishment.create({
      name: name.trim(),
      code: code ? code.trim() : null,
      isActive: !!isActive
    });
    res.status(201).json(successResponse(establishment));
  } catch (error) {
    next(error);
  }
};

/**
 * Modifier un établissement (admin)
 */
exports.update = async (req, res, next) => {
  try {
    const establishment = await InsuranceEstablishment.findByPk(req.params.id);
    if (!establishment) {
      return res.status(404).json(errorResponse('Établissement non trouvé', 404));
    }
    const { name, code, isActive } = req.body;
    await establishment.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code ? code.trim() : null }),
      ...(isActive !== undefined && { isActive: !!isActive })
    });
    res.json(successResponse(establishment));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer (désactiver) un établissement (admin)
 */
exports.delete = async (req, res, next) => {
  try {
    const establishment = await InsuranceEstablishment.findByPk(req.params.id);
    if (!establishment) {
      return res.status(404).json(errorResponse('Établissement non trouvé', 404));
    }
    await establishment.update({ isActive: false });
    res.json(successResponse(null, 'Établissement désactivé'));
  } catch (error) {
    next(error);
  }
};

/**
 * Suppression définitive (admin) — à utiliser avec précaution
 */
exports.destroy = async (req, res, next) => {
  try {
    const establishment = await InsuranceEstablishment.findByPk(req.params.id);
    if (!establishment) {
      return res.status(404).json(errorResponse('Établissement non trouvé', 404));
    }
    await establishment.destroy();
    res.json(successResponse(null, 'Établissement supprimé'));
  } catch (error) {
    next(error);
  }
};
