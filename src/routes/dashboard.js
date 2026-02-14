const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Import du contrôleur
const dashboardController = require('../controllers/dashboardController');

/**
 * GET /api/v1/dashboard/stats
 * Statistiques du dashboard selon le rôle de l'utilisateur
 */
router.get('/stats', authMiddleware, dashboardController.getDashboardStats);

module.exports = router;
