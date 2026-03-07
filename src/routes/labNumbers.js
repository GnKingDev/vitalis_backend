/**
 * Routes Numéros Lab
 * - GET /api/v1/lab-numbers → liste (admin)
 * - POST /api/v1/lab-numbers → créer (admin)
 * - PATCH /api/v1/lab-numbers/:id/assign → assigner/désassigner (admin)
 * - DELETE /api/v1/lab-numbers/:id → supprimer si non assigné (admin)
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/labNumberController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

router.get('/', authMiddleware, authorize(['admin']), controller.getAll);
router.post('/', authMiddleware, authorize(['admin']), controller.create);
router.patch('/:id/assign', authMiddleware, authorize(['admin']), controller.assign);
router.delete('/:id', authMiddleware, authorize(['admin']), controller.delete);

module.exports = router;
