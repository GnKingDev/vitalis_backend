const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { registerSchema } = require('../validations/authSchemas');
const { paginationMiddleware } = require('../middleware/pagination');

// Routes utilisateurs
// Admin: accès complet à tous les utilisateurs
// Reception: peut voir uniquement les techniciens de laboratoire (role=lab)
router.get('/', authMiddleware, paginationMiddleware, authController.getAllUsers);
router.get('/stats', authMiddleware, authorize(['admin']), authController.getUserStats);
router.get('/:id', authMiddleware, authorize(['admin']), authController.getUserById);
router.post('/', authMiddleware, authorize(['admin']), validate(registerSchema), authController.createUser);
router.put('/:id', authMiddleware, authorize(['admin']), authController.updateUser);
router.patch('/:id/suspend', authMiddleware, authorize(['admin']), authController.suspendUser);
router.patch('/:id/activate', authMiddleware, authorize(['admin']), authController.activateUser);
router.delete('/:id', authMiddleware, authorize(['admin']), authController.deleteUser);

module.exports = router; 
