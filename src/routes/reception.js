const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');
const receptionController = require('../controllers/receptionController');

// ========== ROUTES PATIENTS ==========

/**
 * GET /api/v1/reception/patients
 * Liste des patients avec filtres
 */
router.get('/patients', authMiddleware, authorize(['reception', 'admin']), paginationMiddleware, receptionController.getAllPatients);

/**
 * GET /api/v1/reception/patients/:id
 * Récupérer les détails d'un patient
 */
router.get('/patients/:id', authMiddleware, authorize(['reception', 'admin']), receptionController.getPatientById);

/**
 * POST /api/v1/reception/patients/register
 * Enregistrer un nouveau patient avec paiement
 */
router.post('/patients/register', authMiddleware, authorize(['reception', 'admin']), receptionController.registerPatient);

/**
 * POST /api/v1/reception/patients/:id/payment
 * Enregistrer un paiement pour un patient existant
 */
router.post('/patients/:id/payment', authMiddleware, authorize(['reception', 'admin']), receptionController.createPayment);

// ========== ROUTES PAIEMENTS ==========

/**
 * GET /api/v1/reception/payments
 * Liste tous les paiements
 */
router.get('/payments', authMiddleware, authorize(['reception', 'admin']), paginationMiddleware, receptionController.getAllPayments);

/**
 * GET /api/v1/reception/payments/:id
 * Récupérer les détails d'un paiement
 */
router.get('/payments/:id', authMiddleware, authorize(['reception', 'admin']), receptionController.getPaymentById);

// ========== ROUTES PAIEMENTS LAB/IMAGING ==========

/**
 * GET /api/v1/reception/lab-payments
 * Liste des demandes de laboratoire et imagerie pour paiement
 */
router.get('/lab-payments', authMiddleware, authorize(['reception', 'admin']), paginationMiddleware, receptionController.getLabPayments);

/**
 * POST /api/v1/reception/lab-payments/:id/pay
 * Enregistrer le paiement d'une demande
 */
router.post('/lab-payments/:id/pay', authMiddleware, authorize(['reception', 'admin']), receptionController.payLabRequest);

// ========== ROUTES ASSIGNATION ==========

/**
 * GET /api/v1/reception/assignments
 * Liste des patients avec paiement pour assignation
 */
router.get('/assignments', authMiddleware, authorize(['reception', 'admin']), paginationMiddleware, receptionController.getAssignments);

/**
 * POST /api/v1/reception/assignments
 * Assigner un médecin à un patient
 */
router.post('/assignments', authMiddleware, authorize(['reception', 'admin']), receptionController.createAssignment);

/**
 * GET /api/v1/reception/doctors
 * Liste tous les médecins disponibles
 */
router.get('/doctors', authMiddleware, authorize(['reception', 'admin']), receptionController.getDoctors);

// ========== ROUTES LITS ==========

/**
 * GET /api/v1/reception/beds
 * Liste tous les lits
 */
router.get('/beds', authMiddleware, authorize(['reception', 'admin']), receptionController.getAllBeds);

/**
 * GET /api/v1/reception/beds/available
 * Liste uniquement les lits disponibles
 */
router.get('/beds/available', authMiddleware, authorize(['reception', 'admin']), receptionController.getAvailableBeds);

/**
 * PATCH /api/v1/reception/beds/:id/occupy
 * Marquer un lit comme occupé
 */
router.patch('/beds/:id/occupy', authMiddleware, authorize(['reception', 'admin']), receptionController.occupyBed);

/**
 * PATCH /api/v1/reception/beds/:id/free
 * Libérer un lit
 */
router.patch('/beds/:id/free', authMiddleware, authorize(['reception', 'admin']), receptionController.freeBed);

// ========== ROUTES STATISTIQUES ==========

/**
 * GET /api/v1/reception/stats
 * Statistiques pour le tableau de bord réception
 */
router.get('/stats', authMiddleware, authorize(['reception', 'admin']), receptionController.getStats);

module.exports = router;
