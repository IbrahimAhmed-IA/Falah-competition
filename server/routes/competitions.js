const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');
const {
  authenticateToken,
  isAdmin,
  isParticipant,
  isCompetitionCreator
} = require('../middleware/auth');

// Get all competitions (public)
router.get('/', competitionController.getAllCompetitions);

// Get competition by ID (public)
router.get('/:competitionId', competitionController.getCompetitionById);

// Create competition (any authenticated user)
router.post('/', authenticateToken, competitionController.createCompetition);

// Update competition (competition creator only)
router.put('/:competitionId', authenticateToken, isCompetitionCreator, competitionController.updateCompetition);

// Complete competition (competition creator only)
router.put('/:competitionId/complete', authenticateToken, isCompetitionCreator, competitionController.completeCompetition);

// Join competition (any authenticated user)
router.post('/:competitionId/join', authenticateToken, competitionController.joinCompetition);

// Get pending participants (competition creator only)
router.get('/:competitionId/pending-participants', authenticateToken, isCompetitionCreator, competitionController.getPendingParticipants);

// Approve participant (competition creator only)
router.put('/:competitionId/participants/:participantId/approve', authenticateToken, isCompetitionCreator, competitionController.approveParticipant);

// Reject participant (competition creator only)
router.delete('/:competitionId/participants/:participantId', authenticateToken, isCompetitionCreator, competitionController.rejectParticipant);

// Generate matchups (competition creator only)
router.post('/:competitionId/matchups', authenticateToken, isCompetitionCreator, competitionController.generateMatchups);

// Update matchup score (admin only)
router.put('/matchups/:matchupId', authenticateToken, isAdmin, competitionController.updateMatchupScore);

module.exports = router;
