const { PharmacyCategory, PharmacyProduct, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { Op, Sequelize } = require('sequelize');

/**
 * Normalise le nom de la catégorie (trim, première lettre en majuscule)
 */
function normalizeCategoryName(name) {
  return name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();
}

/**
 * Liste toutes les catégories de produits
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const { includeInactive, includeCount } = req.query;
    const where = {};
    
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    
    const categories = await PharmacyCategory.findAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });
    
    let categoriesWithCount = categories;
    
    if (includeCount === 'true') {
      categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productCount = await PharmacyProduct.count({
            where: { category: category.name }
          });
          
          return {
            ...category.toJSON(),
            productCount
          };
        })
      );
    } else {
      categoriesWithCount = categories.map(cat => cat.toJSON());
    }
    
    res.json(successResponse({ categories: categoriesWithCount }));
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les détails d'une catégorie
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { includeProducts } = req.query;
    
    const category = await PharmacyCategory.findByPk(req.params.id, {
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
      ]
    });
    
    if (!category) {
      return res.status(404).json(
        errorResponse('Catégorie non trouvée', 404)
      );
    }
    
    const productCount = await PharmacyProduct.count({
      where: { category: category.name }
    });
    
    const categoryData = {
      ...category.toJSON(),
      productCount
    };
    
    if (includeProducts === 'true') {
      const products = await PharmacyProduct.findAll({
        where: {
          category: category.name,
          isActive: true
        },
        attributes: ['id', 'name', 'price', 'stock'],
        order: [['name', 'ASC']]
      });
      
      categoryData.products = products;
    }
    
    res.json(successResponse(categoryData));
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle catégorie
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const user = req.user;
    
    if (!name || name.trim() === '') {
      return res.status(400).json(
        errorResponse('Le nom de la catégorie est requis', 400)
      );
    }
    
    if (name.length > 100) {
      return res.status(400).json(
        errorResponse('Le nom de la catégorie ne peut pas dépasser 100 caractères', 400)
      );
    }
    
    if (description && description.length > 500) {
      return res.status(400).json(
        errorResponse('La description ne peut pas dépasser 500 caractères', 400)
      );
    }
    
    const normalizedName = normalizeCategoryName(name);
    
    // Vérifier l'unicité (insensible à la casse)
    const existingCategory = await PharmacyCategory.findOne({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('name')),
        Sequelize.fn('LOWER', normalizedName)
      )
    });
    
    if (existingCategory) {
      return res.status(409).json(
        errorResponse('Une catégorie avec ce nom existe déjà', 409)
      );
    }
    
    const category = await PharmacyCategory.create({
      name: normalizedName,
      description: description || null,
      isActive: true,
      createdBy: user.id
    });
    
    const categoryWithCreator = await PharmacyCategory.findByPk(category.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name']
      }]
    });
    
    res.status(201).json(successResponse({
      ...categoryWithCreator.toJSON(),
      productCount: 0
    }, 'Catégorie créée avec succès'));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        errorResponse('Une catégorie avec ce nom existe déjà', 409)
      );
    }
    next(error);
  }
};

/**
 * Met à jour une catégorie
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;
    const user = req.user;
    
    const category = await PharmacyCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json(
        errorResponse('Catégorie non trouvée', 404)
      );
    }
    
    const updates = {};
    
    if (name !== undefined) {
      if (name.trim() === '') {
        return res.status(400).json(
          errorResponse('Le nom de la catégorie ne peut pas être vide', 400)
        );
      }
      
      if (name.length > 100) {
        return res.status(400).json(
          errorResponse('Le nom de la catégorie ne peut pas dépasser 100 caractères', 400)
        );
      }
      
      const normalizedName = normalizeCategoryName(name);
      
      // Vérifier l'unicité (en excluant la catégorie actuelle)
      const existingCategory = await PharmacyCategory.findOne({
        where: {
          id: { [Op.ne]: category.id },
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('name')),
              Sequelize.fn('LOWER', normalizedName)
            )
          ]
        }
      });
      
      if (existingCategory) {
        return res.status(409).json(
          errorResponse('Une autre catégorie avec ce nom existe déjà', 409)
        );
      }
      
      updates.name = normalizedName;
    }
    
    if (description !== undefined) {
      if (description.length > 500) {
        return res.status(400).json(
          errorResponse('La description ne peut pas dépasser 500 caractères', 400)
        );
      }
      updates.description = description || null;
    }
    
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json(
        errorResponse('Aucune donnée à mettre à jour', 400)
      );
    }
    
    updates.updatedBy = user.id;
    
    await category.update(updates);
    
    const updatedCategory = await PharmacyCategory.findByPk(category.id, {
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
    
    const productCount = await PharmacyProduct.count({
      where: { category: category.name }
    });
    
    res.json(successResponse({
      ...updatedCategory.toJSON(),
      productCount
    }, 'Catégorie modifiée avec succès'));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(
        errorResponse('Une autre catégorie avec ce nom existe déjà', 409)
      );
    }
    next(error);
  }
};

/**
 * Supprime une catégorie (soft delete)
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { force } = req.query;
    
    const category = await PharmacyCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json(
        errorResponse('Catégorie non trouvée', 404)
      );
    }
    
    const productCount = await PharmacyProduct.count({
      where: { category: category.name }
    });
    
    if (productCount > 0 && force !== 'true') {
      return res.status(400).json(
        errorResponse(
          `Impossible de supprimer cette catégorie car ${productCount} produit(s) y sont associé(s). Utilisez force=true pour forcer la suppression.`,
          400
        )
      );
    }
    
    // Soft delete (recommandé)
    await category.update({ isActive: false });
    
    // Si force=true, on pourrait faire un hard delete, mais on préfère le soft delete
    // if (force === 'true') {
    //   await category.destroy();
    // }
    
    res.json(successResponse(null, 'Catégorie supprimée avec succès'));
  } catch (error) {
    next(error);
  }
};
