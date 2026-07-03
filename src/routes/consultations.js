const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Routes
router.get('/', paginationMiddleware, consultationController.getAllConsultations);
router.get('/:id', consultationController.getConsultationById);
router.post('/', consultationController.createConsultation);
router.put('/:id', consultationController.updateConsultation);
router.delete('/:id', authorize(['admin']), consultationController.deleteConsultation);
router.patch('/:id/complete', consultationController.completeConsultation);
router.post('/:id/complete', consultationController.completeConsultation);

// Routes dossiers
router.patch('/dossiers/:id/complete', consultationController.completeDossier);
router.post('/dossiers/:id/archive', consultationController.archiveDossier);

module.exports = router;
