const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const devisController = require('../controllers/devisController');

/**
 * POST /api/v1/devis
 * Générer un devis PDF pour un patient
 * Accessible : admin, reception, doctor
 */
router.post('/', authMiddleware, authorize(['admin', 'reception', 'doctor']), devisController.generateDevis);

module.exports = router;
