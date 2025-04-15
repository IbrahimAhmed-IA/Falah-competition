const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const { authenticateToken, isParticipant } = require('../middleware/auth');

// Get participant profile (authenticated participant)
router.get('/profile', authenticateToken, isParticipant, participantController.getMyProfile);

// Request a name change (authenticated participant)
router.post('/name-change', authenticateToken, isParticipant, participantController.requestNameChange);

// Get my name change requests (authenticated participant)
router.get('/name-change-requests', authenticateToken, isParticipant, participantController.getMyNameChangeRequests);

module.exports = router;
