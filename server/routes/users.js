const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin, isSelfOrAdmin } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticateToken, isAdmin, userController.getAllUsers);

// Get all participants (admin only)
router.get('/participants', authenticateToken, isAdmin, userController.getAllParticipants);

// Get user by ID (self or admin)
router.get('/:userId', authenticateToken, isSelfOrAdmin, userController.getUserById);

// Update user (admin only)
router.put('/:userId', authenticateToken, isAdmin, userController.updateUser);

// Get all name change requests (admin only)
router.get('/name-changes/all', authenticateToken, isAdmin, userController.getNameChangeRequests);

// Process a name change request (admin only)
router.put('/name-changes/:requestId', authenticateToken, isAdmin, userController.processNameChangeRequest);

module.exports = router;
