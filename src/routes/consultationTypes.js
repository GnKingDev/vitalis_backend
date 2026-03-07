const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const consultationTypesController = require('../controllers/consultationTypesController');

// Liste (réception + admin ; query activeOnly pour admin)
router.get('/', authMiddleware, authorize(['admin', 'reception', 'doctor']), consultationTypesController.getConsultationTypes);
router.get('/:id', authMiddleware, authorize(['admin']), consultationTypesController.getConsultationTypeById);
router.post('/', authMiddleware, authorize(['admin']), consultationTypesController.createConsultationType);
router.put('/:id', authMiddleware, authorize(['admin']), consultationTypesController.updateConsultationType);
router.delete('/:id', authMiddleware, authorize(['admin']), consultationTypesController.deleteConsultationType);

module.exports = router;
