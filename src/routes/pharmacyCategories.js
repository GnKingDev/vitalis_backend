const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const pharmacyCategoryController = require('../controllers/pharmacyCategoryController');

// ========== ROUTES CATÉGORIES ==========

/**
 * GET /api/v1/pharmacy/categories
 * Liste toutes les catégories
 */
router.get('/', authMiddleware, pharmacyCategoryController.getAllCategories);

/**
 * GET /api/v1/pharmacy/categories/:id
 * Récupère les détails d'une catégorie
 */
router.get('/:id', authMiddleware, pharmacyCategoryController.getCategoryById);

/**
 * POST /api/v1/pharmacy/categories
 * Crée une nouvelle catégorie (admin ou pharmacy uniquement)
 */
router.post('/', authMiddleware, authorize(['admin', 'pharmacy']), pharmacyCategoryController.createCategory);

/**
 * PUT /api/v1/pharmacy/categories/:id
 * Met à jour une catégorie (admin ou pharmacy uniquement)
 */
router.put('/:id', authMiddleware, authorize(['admin', 'pharmacy']), pharmacyCategoryController.updateCategory);

/**
 * DELETE /api/v1/pharmacy/categories/:id
 * Supprime une catégorie (admin ou pharmacy uniquement)
 */
router.delete('/:id', authMiddleware, authorize(['admin', 'pharmacy']), pharmacyCategoryController.deleteCategory);

module.exports = router;
