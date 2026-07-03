/**
 * Routes Établissements d'assurance
 * - GET /api/v1/insurance-establishments → liste (sélecteur accueil, actifs par défaut)
 * - GET /api/v1/insurance-establishments/:id → détail
 * - POST /api/v1/insurance-establishments → créer (admin)
 * - PUT /api/v1/insurance-establishments/:id → modifier (admin)
 * - DELETE /api/v1/insurance-establishments/:id → désactiver (admin)
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/insuranceEstablishmentController');
const examPriceController = require('../controllers/insuranceExamPriceController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Liste et détail : authentifiés (reception, admin pour le sélecteur)
router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);

// CRUD complet : admin uniquement (sous-menu Administration)
router.post('/', authMiddleware, authorize(['admin']), controller.create);
router.put('/:id', authMiddleware, authorize(['admin']), controller.update);
router.delete('/:id', authMiddleware, authorize(['admin']), controller.delete);

// Prix d'examens par assurance
router.get('/exam-price', authMiddleware, examPriceController.getPrice);
router.get('/:id/exam-prices', authMiddleware, examPriceController.getByInsurance);
router.post('/:id/exam-prices', authMiddleware, authorize(['admin']), examPriceController.upsert);
router.delete('/:id/exam-prices/:priceId', authMiddleware, authorize(['admin']), examPriceController.remove);

module.exports = router;
