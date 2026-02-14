const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');
const doctorController = require('../controllers/doctorController');

// ========== ROUTES RÉSULTATS ==========

/**
 * GET /api/v1/doctor/results
 * Liste combinée des résultats de laboratoire et d'imagerie
 */ 
router.get('/results', authMiddleware, authorize(['doctor', 'admin']), paginationMiddleware, doctorController.getAllResults);

/**
 * GET /api/v1/doctor/results/:id
 * Récupérer les détails d'un résultat
 */
router.get('/results/:id', authMiddleware, authorize(['doctor', 'admin']), doctorController.getResultById);

// ========== ROUTES DOSSIERS ==========

/**
 * GET /api/v1/doctor/dossiers
 * Liste des dossiers actifs pour un médecin
 */
router.get('/dossiers', authMiddleware, authorize(['doctor', 'admin']), paginationMiddleware, doctorController.getAllDossiers);

/**
 * GET /api/v1/doctor/dossiers/:id
 * Récupérer un dossier complet
 */
router.get('/dossiers/:id', authMiddleware, authorize(['doctor', 'admin']), doctorController.getDossierById);

// ========== ROUTES CONSULTATIONS ==========

/**
 * POST /api/v1/doctor/consultations
 * Créer une nouvelle consultation
 */
router.post('/consultations', authMiddleware, authorize(['doctor', 'admin']), doctorController.createConsultation);

// ========== ROUTES ITEMS PERSONNALISÉS ==========

/**
 * POST /api/v1/doctor/custom-items
 * Créer ou mettre à jour un item personnalisé
 */
router.post('/custom-items', authMiddleware, authorize(['doctor', 'admin']), doctorController.createOrUpdateCustomItem);

/**
 * GET /api/v1/doctor/custom-items
 * Récupérer la liste des items personnalisés
 */
router.get('/custom-items', authMiddleware, authorize(['doctor', 'admin']), paginationMiddleware, doctorController.getAllCustomItems);

/**
 * PUT /api/v1/doctor/custom-items/:id
 * Mettre à jour un item personnalisé spécifique
 */
router.put('/custom-items/:id', authMiddleware, authorize(['doctor', 'admin']), doctorController.updateCustomItem);

/**
 * DELETE /api/v1/doctor/custom-items/:id
 * Supprimer un item personnalisé
 */
router.delete('/custom-items/:id', authMiddleware, authorize(['doctor', 'admin']), doctorController.deleteCustomItem);

// ========== ROUTES ORDONNANCES ==========

/**
 * POST /api/v1/doctor/prescriptions
 * Créer une ordonnance
 */
router.post('/prescriptions', authMiddleware, authorize(['doctor', 'admin']), doctorController.createPrescription);

/**
 * GET /api/v1/doctor/prescriptions
 * Liste des ordonnances créées par un médecin
 */
router.get('/prescriptions', authMiddleware, authorize(['doctor', 'admin']), paginationMiddleware, doctorController.getAllPrescriptions);

module.exports = router;
