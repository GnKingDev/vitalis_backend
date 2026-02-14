const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { paginationMiddleware } = require('../middleware/pagination');
const bedController = require('../controllers/bedController');

// ========== ROUTES LITS ==========

/**
 * GET /api/v1/beds
 * Liste tous les lits avec pagination et filtres
 */
router.get('/', authMiddleware, authorize(['admin', 'reception']), paginationMiddleware, bedController.getAllBeds);

/**
 * GET /api/v1/beds/:id
 * Récupère les détails d'un lit
 */
router.get('/:id', authMiddleware, authorize(['admin', 'reception']), bedController.getBedById);

/**
 * POST /api/v1/beds
 * Crée un nouveau lit (admin uniquement)
 */
router.post('/', authMiddleware, authorize(['admin']), bedController.createBed);

/**
 * PUT /api/v1/beds/:id
 * Met à jour un lit (admin uniquement)
 */
router.put('/:id', authMiddleware, authorize(['admin']), bedController.updateBed);

/**
 * DELETE /api/v1/beds/:id
 * Supprime un lit (admin uniquement)
 */
router.delete('/:id', authMiddleware, authorize(['admin']), bedController.deleteBed);

/**
 * PATCH /api/v1/beds/:id/free
 * Libère un lit
 */
router.patch('/:id/free', authMiddleware, authorize(['admin', 'reception']), bedController.freeBed);

/**
 * PATCH /api/v1/beds/:id/occupy
 * Occupe un lit avec un patient
 */
router.patch('/:id/occupy', authMiddleware, authorize(['admin', 'reception']), bedController.occupyBed);

module.exports = router;
