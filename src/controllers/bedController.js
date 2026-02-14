const { Bed, Patient, User } = require('../models');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { Op } = require('sequelize');

/**
 * Liste tous les lits avec pagination et filtres
 */
exports.getAllBeds = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    if (status === 'occupied') {
      where.isOccupied = true;
    } else if (status === 'available') {
      where.isOccupied = false;
    }
    
    const { count, rows } = await Bed.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['number', 'ASC']]
    });
    
    const beds = rows.map(bed => ({
      id: bed.id,
      number: bed.number,
      type: bed.type,
      additionalFee: bed.additionalFee,
      isOccupied: bed.isOccupied,
      patientId: bed.patientId,
      patient: bed.patient || null,
      createdAt: bed.createdAt,
      updatedAt: bed.updatedAt
    }));
    
    res.json(paginatedResponse({ beds }, { page: parseInt(page), limit: parseInt(limit) }, count));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les détails d'un lit
 */
exports.getBedById = async (req, res, next) => {
  try {
    const bed = await Bed.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'vitalisId', 'firstName', 'lastName', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });
    
    if (!bed) {
      return res.status(404).json(
        errorResponse('Lit non trouvé', 404)
      );
    }
    
    res.json(successResponse({
      id: bed.id,
      number: bed.number,
      type: bed.type,
      additionalFee: bed.additionalFee,
      isOccupied: bed.isOccupied,
      patientId: bed.patientId,
      patient: bed.patient || null,
      createdAt: bed.createdAt,
      updatedAt: bed.updatedAt,
      createdBy: bed.creator || null
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Crée un nouveau lit
 */
exports.createBed = async (req, res, next) => {
  try {
    const { number, type, additionalFee } = req.body;
    const user = req.user;
    
    if (!number || !type) {
      return res.status(400).json(
        errorResponse('number et type sont requis', 400)
      );
    }
    
    if (type !== 'classic' && type !== 'vip') {
      return res.status(400).json(
        errorResponse('type doit être classic ou vip', 400)
      );
    }
    
    // Vérifier l'unicité du numéro
    const existingBed = await Bed.findOne({ where: { number } });
    if (existingBed) {
      return res.status(400).json(
        errorResponse('Un lit avec ce numéro existe déjà', 400)
      );
    }
    
    // Logique selon le type
    let finalAdditionalFee = 0;
    if (type === 'classic') {
      finalAdditionalFee = 0;
    } else if (type === 'vip') {
      finalAdditionalFee = additionalFee !== undefined ? additionalFee : 15000;
      if (finalAdditionalFee <= 0) {
        return res.status(400).json(
          errorResponse('Les frais supplémentaires doivent être > 0 pour un lit VIP', 400)
        );
      }
    }
    
    const bed = await Bed.create({
      number,
      type,
      additionalFee: finalAdditionalFee,
      isOccupied: false,
      patientId: null,
      createdBy: user.id
    });
    
    res.status(201).json(successResponse({
      id: bed.id,
      number: bed.number,
      type: bed.type,
      additionalFee: bed.additionalFee,
      isOccupied: bed.isOccupied,
      patientId: bed.patientId,
      createdAt: bed.createdAt,
      updatedAt: bed.updatedAt
    }, 'Lit créé avec succès'));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json(
        errorResponse('Un lit avec ce numéro existe déjà', 400)
      );
    }
    next(error);
  }
};

/**
 * Met à jour un lit
 */
exports.updateBed = async (req, res, next) => {
  try {
    const { number, type, additionalFee } = req.body;
    const user = req.user;
    
    const bed = await Bed.findByPk(req.params.id);
    if (!bed) {
      return res.status(404).json(
        errorResponse('Lit non trouvé', 404)
      );
    }
    
    // Si le lit est occupé, ne pas permettre le changement de type
    if (bed.isOccupied && type && type !== bed.type) {
      return res.status(400).json(
        errorResponse('Impossible de modifier le type d\'un lit occupé. Libérez d\'abord le lit.', 400)
      );
    }
    
    const updates = {};
    
    if (number) {
      // Vérifier l'unicité si le numéro change
      if (number !== bed.number) {
        const existingBed = await Bed.findOne({ where: { number } });
        if (existingBed) {
          return res.status(400).json(
            errorResponse('Un lit avec ce numéro existe déjà', 400)
          );
        }
      }
      updates.number = number;
    }
    
    if (type) {
      if (type !== 'classic' && type !== 'vip') {
        return res.status(400).json(
          errorResponse('type doit être classic ou vip', 400)
        );
      }
      updates.type = type;
      
      // Ajuster les frais selon le type
      if (type === 'classic') {
        updates.additionalFee = 0;
      } else if (type === 'vip') {
        if (additionalFee !== undefined) {
          if (additionalFee <= 0) {
            return res.status(400).json(
              errorResponse('Les frais supplémentaires doivent être > 0 pour un lit VIP', 400)
            );
          }
          updates.additionalFee = additionalFee;
        } else if (bed.type !== 'vip') {
          // Si on passe de classic à vip sans spécifier les frais
          updates.additionalFee = 15000;
        }
      }
    } else if (additionalFee !== undefined) {
      // Si seulement additionalFee est modifié
      if (bed.type === 'classic' && additionalFee !== 0) {
        return res.status(400).json(
          errorResponse('Les frais supplémentaires doivent être 0 pour un lit classique', 400)
        );
      }
      if (bed.type === 'vip' && additionalFee <= 0) {
        return res.status(400).json(
          errorResponse('Les frais supplémentaires doivent être > 0 pour un lit VIP', 400)
        );
      }
      updates.additionalFee = additionalFee;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json(
        errorResponse('Aucune donnée à mettre à jour', 400)
      );
    }
    
    updates.updatedBy = user.id;
    
    await bed.update(updates);
    
    res.json(successResponse({
      id: bed.id,
      number: bed.number,
      type: bed.type,
      additionalFee: bed.additionalFee,
      isOccupied: bed.isOccupied,
      patientId: bed.patientId,
      createdAt: bed.createdAt,
      updatedAt: bed.updatedAt
    }, 'Lit modifié avec succès'));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json(
        errorResponse('Un lit avec ce numéro existe déjà', 400)
      );
    }
    next(error);
  }
};

/**
 * Supprime un lit
 */
exports.deleteBed = async (req, res, next) => {
  try {
    const bed = await Bed.findByPk(req.params.id);
    
    if (!bed) {
      return res.status(404).json(
        errorResponse('Lit non trouvé', 404)
      );
    }
    
    if (bed.isOccupied) {
      return res.status(400).json(
        errorResponse('Impossible de supprimer un lit occupé. Libérez d\'abord le lit.', 400)
      );
    }
    
    await bed.destroy();
    
    res.json(successResponse(null, 'Lit supprimé avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Libère un lit
 */
exports.freeBed = async (req, res, next) => {
  try {
    const user = req.user;
    
    const bed = await Bed.findByPk(req.params.id);
    if (!bed) {
      return res.status(404).json(
        errorResponse('Lit non trouvé', 404)
      );
    }
    
    if (!bed.isOccupied) {
      return res.status(400).json(
        errorResponse('Le lit est déjà disponible', 400)
      );
    }
    
    await bed.update({
      isOccupied: false,
      patientId: null,
      updatedBy: user.id
    });
    
    res.json(successResponse({
      id: bed.id,
      number: bed.number,
      type: bed.type,
      additionalFee: bed.additionalFee,
      isOccupied: bed.isOccupied,
      patientId: bed.patientId,
      updatedAt: bed.updatedAt
    }, 'Lit libéré avec succès'));
  } catch (error) {
    next(error);
  }
};

/**
 * Occupe un lit avec un patient
 */
exports.occupyBed = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    const user = req.user;
    
    if (!patientId) {
      return res.status(400).json(
        errorResponse('patientId est requis', 400)
      );
    }
    
    const bed = await Bed.findByPk(req.params.id);
    if (!bed) {
      return res.status(404).json(
        errorResponse('Lit non trouvé', 404)
      );
    }
    
    if (bed.isOccupied) {
      return res.status(400).json(
        errorResponse('Le lit est déjà occupé', 400)
      );
    }
    
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json(
        errorResponse('Patient non trouvé', 404)
      );
    }
    
    // Vérifier que le patient n'occupe pas déjà un lit
    const existingBed = await Bed.findOne({
      where: {
        patientId: patientId,
        isOccupied: true
      }
    });
    
    if (existingBed) {
      return res.status(400).json(
        errorResponse('Le patient occupe déjà un lit', 400)
      );
    }
    
    await bed.update({
      isOccupied: true,
      patientId: patientId,
      updatedBy: user.id
    });
    
    const updatedBed = await Bed.findByPk(bed.id, {
      include: [{
        model: Patient,
        as: 'patient',
        attributes: ['id', 'vitalisId', 'firstName', 'lastName']
      }]
    });
    
    res.json(successResponse({
      id: updatedBed.id,
      number: updatedBed.number,
      type: updatedBed.type,
      additionalFee: updatedBed.additionalFee,
      isOccupied: updatedBed.isOccupied,
      patientId: updatedBed.patientId,
      patient: updatedBed.patient,
      updatedAt: updatedBed.updatedAt
    }, 'Lit occupé avec succès'));
  } catch (error) {
    next(error);
  }
};
