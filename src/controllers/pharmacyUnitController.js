const { PharmacyUnit, PharmacyProduct } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Liste toutes les unités
 */
exports.getAll = async (req, res, next) => {
  try {
    const units = await PharmacyUnit.findAll({
      order: [['name', 'ASC']],
      attributes: ['id', 'name']
    });
    res.json(successResponse(units));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer une unité
 */
exports.create = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json(
        errorResponse('Le nom de l\'unité est requis', 400)
      );
    }
    const trimmed = name.trim();
    const all = await PharmacyUnit.findAll({ attributes: ['name'] });
    const exists = all.some(u => u.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return res.status(400).json(
        errorResponse('Cette unité existe déjà', 400)
      );
    }
    const unit = await PharmacyUnit.create({ name: trimmed });
    res.status(201).json(successResponse({ id: unit.id, name: unit.name }));
  } catch (error) {
    next(error);
  }
};

/**
 * Modifier une unité
 */
exports.update = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json(
        errorResponse('Le nom de l\'unité est requis', 400)
      );
    }
    const unit = await PharmacyUnit.findByPk(req.params.id);
    if (!unit) {
      return res.status(404).json(
        errorResponse('Unité non trouvée', 404)
      );
    }
    const trimmed = name.trim();
    const all = await PharmacyUnit.findAll({ attributes: ['id', 'name'] });
    const exists = all.some(u => u.id !== unit.id && u.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return res.status(400).json(
        errorResponse('Cette unité existe déjà', 400)
      );
    }
    const oldName = unit.name;
    await unit.update({ name: trimmed });
    await PharmacyProduct.update(
      { unit: trimmed },
      { where: { unit: oldName } }
    );
    res.json(successResponse({ id: unit.id, name: unit.name }));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer une unité (uniquement si aucun produit ne l'utilise)
 */
exports.delete = async (req, res, next) => {
  try {
    const unit = await PharmacyUnit.findByPk(req.params.id);
    if (!unit) {
      return res.status(404).json(
        errorResponse('Unité non trouvée', 404)
      );
    }
    const count = await PharmacyProduct.count({
      where: { unit: unit.name }
    });
    if (count > 0) {
      return res.status(400).json(
        errorResponse(`Impossible de supprimer : ${count} produit(s) utilisent cette unité`, 400)
      );
    }
    await unit.destroy();
    res.json(successResponse(null, 'Unité supprimée'));
  } catch (error) {
    next(error);
  }
};
