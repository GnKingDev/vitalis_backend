const express = require('express');
const router = express.Router();
const consultationPriceController = require('../controllers/consultationPriceController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/v1/consultation/price
 * Récupère le prix actuel de la consultation
 */
router.get('/', authorize(['admin', 'reception', 'doctor']), consultationPriceController.getConsultationPrice);

/**
 * PUT /api/v1/consultation/price
 * Met à jour le prix de la consultation (admin uniquement)
 */
router.put('/', authorize(['admin']), consultationPriceController.updateConsultationPrice);

/**
 * GET /api/v1/consultation/price/history
 * Récupère l'historique des modifications du prix (admin uniquement)
 */
router.get('/history', authorize(['admin']), consultationPriceController.getConsultationPriceHistory);

module.exports = router;
