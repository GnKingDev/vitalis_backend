const { ConsultationType, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Liste des types de consultation (actifs pour réception, tous pour admin)
 */
exports.getConsultationTypes = async (req, res, next) => {
  try {
    const { activeOnly } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';
    const where = (activeOnly === 'true' || !isAdmin) ? { isActive: true } : {};
    const types = await ConsultationType.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'price', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
    });
    res.json(successResponse(types));
  } catch (error) {
    next(error);
  }
};

/**
 * Détail d'un type de consultation
 */
exports.getConsultationTypeById = async (req, res, next) => {
  try {
    const type = await ConsultationType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json(errorResponse('Type de consultation non trouvé', 404));
    }
    res.json(successResponse(type));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un type de consultation
 */
exports.createConsultationType = async (req, res, next) => {
  try {
    const { name, price, isActive, sortOrder } = req.body;
    const user = req.user;
    if (!name || !name.trim()) {
      return res.status(400).json(errorResponse('Le nom est requis', 400));
    }
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json(errorResponse('Le prix doit être un nombre >= 0', 400));
    }
    const type = await ConsultationType.create({
      name: name.trim(),
      price: priceNum,
      isActive: isActive !== false,
      sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      createdBy: user.id,
      updatedBy: user.id
    });
    res.status(201).json(successResponse({
      id: type.id,
      name: type.name,
      price: type.price,
      isActive: type.isActive,
      sortOrder: type.sortOrder,
      createdAt: type.createdAt
    }, 'Type de consultation créé'));
  } catch (error) {
    next(error);
  }
};

/**
 * Modifier un type de consultation
 */
exports.updateConsultationType = async (req, res, next) => {
  try {
    const type = await ConsultationType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json(errorResponse('Type de consultation non trouvé', 404));
    }
    const { name, price, isActive, sortOrder } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (price !== undefined) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json(errorResponse('Le prix doit être un nombre >= 0', 400));
      }
      updates.price = priceNum;
    }
    if (isActive !== undefined) updates.isActive = !!isActive;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
    updates.updatedBy = req.user.id;
    await type.update(updates);
    res.json(successResponse({
      id: type.id,
      name: type.name,
      price: type.price,
      isActive: type.isActive,
      sortOrder: type.sortOrder,
      updatedAt: type.updatedAt
    }, 'Type de consultation modifié'));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un type de consultation
 */
exports.deleteConsultationType = async (req, res, next) => {
  try {
    const type = await ConsultationType.findByPk(req.params.id);
    if (!type) {
      return res.status(404).json(errorResponse('Type de consultation non trouvé', 404));
    }
    await type.destroy();
    res.json(successResponse(null, 'Type de consultation supprimé'));
  } catch (error) {
    next(error);
  }
};
