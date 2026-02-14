const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Routes publiques (authentifiées)
router.get('/', paginationMiddleware, patientController.getAllPatients);
router.get('/search', patientController.searchPatients);
router.get('/stats', patientController.getPatientStats);
router.get('/export', authorize(['admin']), patientController.exportPatients);

// Routes spécifiques (doivent être avant /:id pour éviter les conflits)
router.get('/:id/dossiers/:dossierId', patientController.getDossierById);
router.get('/:id/history', patientController.getPatientHistory);
router.get('/:id/dossiers', paginationMiddleware, patientController.getPatientDossiers);
router.get('/:id/consultations', patientController.getPatientConsultations);
router.get('/:id/prescriptions', patientController.getPatientPrescriptions);
router.get('/:id/timeline', patientController.getPatientTimeline);

// Routes générales
router.get('/:id', patientController.getPatientById);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient); 

module.exports = router;
