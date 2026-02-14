const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');
const imagingController = require('../controllers/imagingController');

// ========== ROUTES EXAMENS ==========

/**
 * GET /api/v1/imaging/exams
 * Liste tous les examens d'imagerie
 */
router.get('/exams', authMiddleware, imagingController.getAllExams);

/**
 * POST /api/v1/imaging/exams
 * Créer un nouvel examen (admin uniquement)
 */
router.post('/exams', authMiddleware, authorize(['admin']), imagingController.createExam);

/**
 * PUT /api/v1/imaging/exams/:id
 * Modifier un examen (admin uniquement)
 */
router.put('/exams/:id', authMiddleware, authorize(['admin']), imagingController.updateExam);

// ========== ROUTES DEMANDES ==========

/**
 * GET /api/v1/imaging/requests
 * Liste toutes les demandes d'imagerie
 */
router.get('/requests', authMiddleware, paginationMiddleware, imagingController.getAllRequests);

/**
 * GET /api/v1/imaging/requests/:id
 * Récupérer les détails d'une demande
 */
router.get('/requests/:id', authMiddleware, imagingController.getRequestById);

/**
 * POST /api/v1/imaging/requests
 * Créer une nouvelle demande d'imagerie
 */
router.post('/requests', authMiddleware, imagingController.createRequest);

/**
 * PATCH /api/v1/imaging/requests/:id/assign
 * Assigner une demande à un technicien
 */
router.patch('/requests/:id/assign', authMiddleware, authorize(['admin', 'reception']), imagingController.assignRequest);

/**
 * PATCH /api/v1/imaging/requests/:id/complete
 * Marquer une demande comme terminée
 */
router.patch('/requests/:id/complete', authMiddleware, authorize(['lab', 'admin']), imagingController.completeRequest);

module.exports = router;
