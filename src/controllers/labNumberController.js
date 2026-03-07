const { LabNumber, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Liste tous les numéros lab
 */
exports.getAll = async (req, res, next) => {
  try {
    const { availableOnly } = req.query;
    const where = {};
    if (availableOnly === 'true') {
      where.userId = null;
    }

    const labNumbers = await LabNumber.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
        required: false
      }],
      order: [['number', 'ASC']]
    });

    const data = labNumbers.map(ln => ({
      id: ln.id,
      number: ln.number,
      userId: ln.userId,
      user: ln.user ? { id: ln.user.id, name: ln.user.name, email: ln.user.email, role: ln.user.role } : null,
      isAssigned: !!ln.userId,
      createdAt: ln.createdAt
    }));

    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un numéro lab
 */
exports.create = async (req, res, next) => {
  try {
    const { number } = req.body;
    if (!number || !String(number).trim()) {
      return res.status(400).json(
        errorResponse('Le numéro est requis', 400)
      );
    }

    const normalized = String(number).trim().toUpperCase();
    const existing = await LabNumber.findOne({ where: { number: normalized } });
    if (existing) {
      return res.status(400).json(
        errorResponse(`Le numéro ${normalized} existe déjà`, 400)
      );
    }

    const labNumber = await LabNumber.create({ number: normalized });
    res.status(201).json(successResponse({
      id: labNumber.id,
      number: labNumber.number,
      userId: labNumber.userId,
      createdAt: labNumber.createdAt
    }, 'Numéro lab créé'));
  } catch (error) {
    next(error);
  }
};

/**
 * Assigner un numéro lab à un utilisateur
 */
exports.assign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const labNumber = await LabNumber.findByPk(id);
    if (!labNumber) {
      return res.status(404).json(
        errorResponse('Numéro lab introuvable', 404)
      );
    }

    if (!userId) {
      labNumber.userId = null;
      await labNumber.save();
      return res.json(successResponse({
        id: labNumber.id,
        number: labNumber.number,
        userId: null
      }, 'Numéro lab désassigné'));
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json(
        errorResponse('Utilisateur introuvable', 404)
      );
    }

    if (user.role !== 'lab') {
      return res.status(400).json(
        errorResponse('Le numéro lab ne peut être assigné qu\'à un utilisateur avec le rôle Laboratoire', 400)
      );
    }

    await LabNumber.update({ userId: null }, { where: { userId } });
    labNumber.userId = userId;
    await labNumber.save();

    res.json(successResponse({
      id: labNumber.id,
      number: labNumber.number,
      userId: labNumber.userId
    }, 'Numéro lab assigné'));
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un numéro lab (uniquement si non assigné)
 */
exports.delete = async (req, res, next) => {
  try {
    const labNumber = await LabNumber.findByPk(req.params.id);
    if (!labNumber) {
      return res.status(404).json(
        errorResponse('Numéro lab introuvable', 404)
      );
    }
    if (labNumber.userId) {
      return res.status(400).json(
        errorResponse('Impossible de supprimer un numéro assigné. Désassignez-le d\'abord.', 400)
      );
    }
    await labNumber.destroy();
    res.json(successResponse(null, 'Numéro lab supprimé'));
  } catch (error) {
    next(error);
  }
};
