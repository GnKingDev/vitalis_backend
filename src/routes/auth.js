const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../validations/authSchemas');

// Routes publiques
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.post('/refresh', authMiddleware, authController.refresh);
router.post('/change-password', authMiddleware, authController.changePassword);
router.patch('/change-password', authMiddleware, authController.changePassword);

// Routes protégées (admin uniquement)
router.get('/users', authMiddleware, authorize(['admin']), authController.getAllUsers);
router.get('/users/stats', authMiddleware, authorize(['admin']), authController.getUserStats);
router.get('/users/:id', authMiddleware, authorize(['admin']), authController.getUserById);
router.post('/users', authMiddleware, authorize(['admin']), validate(registerSchema), authController.createUser);
router.put('/users/:id', authMiddleware, authorize(['admin']), authController.updateUser);
router.patch('/users/:id/suspend', authMiddleware, authorize(['admin']), authController.suspendUser);
router.patch('/users/:id/activate', authMiddleware, authorize(['admin']), authController.activateUser);
router.delete('/users/:id', authMiddleware, authorize(['admin']), authController.deleteUser);

module.exports = router;
