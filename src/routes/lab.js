const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');
const labController = require('../controllers/labController');

// ========== ROUTES EXAMENS ==========

/**
 * GET /api/v1/lab/exams
 * Liste tous les examens de laboratoire
 */
router.get('/exams', authMiddleware, labController.getAllExams);

/**
 * POST /api/v1/lab/exams
 * Créer un nouvel examen (admin uniquement)
 */
router.post('/exams', authMiddleware, authorize(['admin']), labController.createExam);

/**
 * PUT /api/v1/lab/exams/:id
 * Modifier un examen (admin uniquement)
 */
router.put('/exams/:id', authMiddleware, authorize(['admin']), labController.updateExam);

// ========== ROUTES DEMANDES ==========

/**
 * GET /api/v1/lab/requests
 * Liste toutes les demandes de laboratoire
 */
router.get('/requests', authMiddleware, paginationMiddleware, labController.getAllRequests);

/**
 * GET /api/v1/lab/requests/:id
 * Récupérer les détails d'une demande
 */
router.get('/requests/:id', authMiddleware, labController.getRequestById);

/**
 * POST /api/v1/lab/requests
 * Créer une nouvelle demande de laboratoire
 */
router.post('/requests', authMiddleware, labController.createRequest);

/**
 * PATCH /api/v1/lab/requests/:id/assign
 * Assigner une demande à un technicien
 */
router.patch('/requests/:id/assign', authMiddleware, authorize(['admin', 'reception']), labController.assignRequest);

// ========== ROUTES RÉSULTATS ==========

/**
 * GET /api/v1/lab/results
 * Liste tous les résultats de laboratoire
 */
router.get('/results', authMiddleware, paginationMiddleware, labController.getAllResults);

/**
 * GET /api/v1/lab/results/:id
 * Récupérer les détails d'un résultat
 */
router.get('/results/:id', authMiddleware, labController.getResultById);

/**
 * POST /api/v1/lab/results
 * Créer ou mettre à jour un résultat
 */
router.post('/results', authMiddleware, labController.createOrUpdateResult);

/**
 * PATCH /api/v1/lab/results/:id/validate
 * Valider un résultat (lab uniquement)
 */
router.patch('/results/:id/validate', authMiddleware, authorize(['lab', 'admin']), labController.validateResult);

/**
 * PATCH /api/v1/lab/results/:id/send
 * Envoyer un résultat au médecin
 */
router.patch('/results/:id/send', authMiddleware, authorize(['lab', 'admin']), labController.sendResult);

module.exports = router;
