const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');
const pharmacyController = require('../controllers/pharmacyController');
const pharmacyCategoryRoutes = require('./pharmacyCategories');

// ========== ROUTES CATÉGORIES ==========
router.use('/categories', pharmacyCategoryRoutes);

// ========== ROUTES PRODUITS ==========

/**
 * GET /api/v1/pharmacy/products
 * Liste tous les produits
 */
router.get('/products', authMiddleware, paginationMiddleware, pharmacyController.getAllProducts);

/**
 * GET /api/v1/pharmacy/products/:id
 * Récupérer les détails d'un produit
 */
router.get('/products/:id', authMiddleware, pharmacyController.getProductById);

/**
 * POST /api/v1/pharmacy/products
 * Créer un nouveau produit
 */
router.post('/products', authMiddleware, authorize(['pharmacy', 'admin']), pharmacyController.createProduct);

/**
 * PUT /api/v1/pharmacy/products/:id
 * Modifier un produit
 */
router.put('/products/:id', authMiddleware, authorize(['pharmacy', 'admin']), pharmacyController.updateProduct);

/**
 * DELETE /api/v1/pharmacy/products/:id
 * Supprimer un produit
 */
router.delete('/products/:id', authMiddleware, authorize(['pharmacy', 'admin']), pharmacyController.deleteProduct);

// ========== ROUTES ALERTES ==========

/**
 * GET /api/v1/pharmacy/alerts
 * Liste toutes les alertes
 */
router.get('/alerts', authMiddleware, paginationMiddleware, pharmacyController.getAllAlerts);

/**
 * GET /api/v1/pharmacy/alerts/stats
 * Statistiques sur les alertes
 */
router.get('/alerts/stats', authMiddleware, pharmacyController.getAlertsStats);

// ========== ROUTES PAIEMENTS ==========

/**
 * GET /api/v1/pharmacy/payments
 * Liste tous les paiements
 */
router.get('/payments', authMiddleware, paginationMiddleware, pharmacyController.getAllPayments);

/**
 * GET /api/v1/pharmacy/payments/:id
 * Récupérer les détails d'un paiement
 */
router.get('/payments/:id', authMiddleware, pharmacyController.getPaymentById);

/**
 * POST /api/v1/pharmacy/payments
 * Créer un nouveau paiement
 */
router.post('/payments', authMiddleware, authorize(['pharmacy', 'admin']), pharmacyController.createPayment);

// ========== ROUTES STATISTIQUES ==========

/**
 * GET /api/v1/pharmacy/stats
 * Statistiques pour le tableau de bord
 */
router.get('/stats', authMiddleware, authorize(['pharmacy', 'admin']), pharmacyController.getStats);

module.exports = router;
