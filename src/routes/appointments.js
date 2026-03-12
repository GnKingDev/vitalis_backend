const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');

router.use(authMiddleware);
router.use(authorize(['reception', 'admin']));

/**
 * GET /api/v1/appointments
 * Liste des rendez-vous (filtres: date, doctorId, status, search)
 */
router.get('/', paginationMiddleware, appointmentController.getAll);

/**
 * POST /api/v1/appointments
 * Créer un rendez-vous
 */
router.post('/', appointmentController.create);

/**
 * GET /api/v1/appointments/:id
 * Détail d'un rendez-vous
 */
router.get('/:id', appointmentController.getById);

/**
 * PATCH /api/v1/appointments/:id/status
 * Mettre à jour le statut (present, absent, cancelled)
 */
router.patch('/:id/status', appointmentController.updateStatus);

module.exports = router;
