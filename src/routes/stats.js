const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const statsController = require('../controllers/statsController');

// Routes statistiques (admin uniquement)
router.get('/overview', authMiddleware, authorize(['admin']), statsController.getOverview);
router.get('/patients', authMiddleware, authorize(['admin']), statsController.getPatientsStats);
router.get('/consultations', authMiddleware, authorize(['admin']), statsController.getConsultationsStats);
router.get('/revenue', authMiddleware, authorize(['admin']), statsController.getRevenueStats);
router.get('/lab', authMiddleware, authorize(['admin']), statsController.getLabStats);
router.get('/imaging', authMiddleware, authorize(['admin']), statsController.getImagingStats);
router.get('/users', authMiddleware, authorize(['admin']), statsController.getUsersStats);

module.exports = router;
