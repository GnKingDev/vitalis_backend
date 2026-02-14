const { ConsultationPrice, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { Op } = require('sequelize');

/**
 * Récupère le prix actuel de la consultation
 */
exports.getConsultationPrice = async (req, res, next) => {
  try {
    const price = await ConsultationPrice.findOne({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    // Si aucun prix actif n'existe, retourner un prix par défaut (0)
    if (!price) {
      return res.json(successResponse({
        id: null,
        price: 0,
        isActive: false,
        createdAt: null,
        updatedAt: null,
        createdBy: null,
        updatedBy: null
      }));
    }
    
    res.json(successResponse({
      id: price.id,
      price: parseFloat(price.price),
      isActive: price.isActive,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
      createdBy: price.creator,
      updatedBy: price.updater
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour le prix de la consultation (crée s'il n'existe pas)
 */
exports.updateConsultationPrice = async (req, res, next) => {
  try {
    const { price } = req.body;
    const user = req.user;
    
    // Validation
    if (!price || price === undefined || price === null) {
      return res.status(400).json(
        errorResponse('Le prix est requis', 400)
      );
    }
    
    const numericPrice = parseFloat(price);
    
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json(
        errorResponse('Le prix doit être un nombre supérieur à 0', 400)
      );
    }
    
    // Vérifier s'il existe un prix actif
    const existingPrice = await ConsultationPrice.findOne({
      where: { isActive: true }
    });
    
    if (existingPrice) {
      // Mettre à jour le prix existant
      // Les hooks du modèle s'assureront qu'il n'y a qu'un seul prix actif
      await existingPrice.update({
        price: numericPrice,
        isActive: true,
        updatedBy: user.id
      });
      
      const updatedPrice = await ConsultationPrice.findByPk(existingPrice.id, {
        include: [
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'name']
          }
        ]
      });
      
      res.json(successResponse({
        id: updatedPrice.id,
        price: parseFloat(updatedPrice.price),
        isActive: updatedPrice.isActive,
        updatedAt: updatedPrice.updatedAt,
        updatedBy: updatedPrice.updater
      }, 'Prix de consultation mis à jour avec succès'));
    } else {
      // Créer un nouveau prix
      const newPrice = await ConsultationPrice.create({
        price: numericPrice,
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id
      });
      
      const createdPrice = await ConsultationPrice.findByPk(newPrice.id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'name']
          }
        ]
      });
      
      res.json(successResponse({
        id: createdPrice.id,
        price: parseFloat(createdPrice.price),
        isActive: createdPrice.isActive,
        updatedAt: createdPrice.updatedAt,
        updatedBy: createdPrice.updater
      }, 'Prix de consultation créé avec succès'));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère l'historique des modifications du prix
 */
exports.getConsultationPriceHistory = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const prices = await ConsultationPrice.findAll({
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json(successResponse(prices.map(price => ({
      id: price.id,
      price: parseFloat(price.price),
      isActive: price.isActive,
      updatedAt: price.updatedAt,
      updatedBy: price.updater
    }))));
  } catch (error) {
    next(error);
  }
};
