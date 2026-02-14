const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');
const paymentController = require('../controllers/paymentController');

// ========== ROUTES PRINCIPALES ==========

/**
 * GET /api/v1/payments
 * Liste tous les paiements avec filtres
 */
router.get('/', authMiddleware, paginationMiddleware, paymentController.getAllPayments);

/**
 * GET /api/v1/payments/:id
 * Récupérer les détails d'un paiement
 */
router.get('/:id', authMiddleware, paymentController.getPaymentById);

/**
 * POST /api/v1/payments
 * Créer un nouveau paiement
 */
router.post('/', authMiddleware, authorize(['reception', 'admin']), paymentController.createPayment);

/**
 * PATCH /api/v1/payments/:id/status
 * Modifier le statut d'un paiement
 */
router.patch('/:id/status', authMiddleware, authorize(['reception', 'admin']), paymentController.updatePaymentStatus);

/**
 * DELETE /api/v1/payments/:id
 * Annuler un paiement
 */
router.delete('/:id', authMiddleware, authorize(['admin']), paymentController.deletePayment);

// ========== ROUTES STATISTIQUES ==========

/**
 * GET /api/v1/payments/stats
 * Statistiques détaillées sur les paiements
 */
router.get('/stats', authMiddleware, paymentController.getStats);

module.exports = router;
