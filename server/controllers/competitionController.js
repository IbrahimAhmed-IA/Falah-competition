const db = require('../database/db');

// Create competition (allow any user to create)
const createCompetition = (req, res) => {
  try {
    const { name, description, password, public = false } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Competition name is required' });
    }

    // Start transaction
    const createCompetitionTransaction = db.transaction(() => {
      // Create competition
      const insertCompetition = db.prepare(`
        INSERT INTO competitions (name, description, created_by, status, password, public)
        VALUES (?, ?, ?, 'upcoming', ?, ?)
      `);

      const competitionResult = insertCompetition.run(
        name,
        description || '',
        userId,
        password || null,
        public ? 1 : 0
      );

      // If the user isn't already an admin, grant them admin privileges for this competition
      // by automatically adding them as the first participant (and approved)
      const insertCreatorAsParticipant = db.prepare(`
        INSERT INTO participants (competition_id, user_id, score, approved)
        VALUES (?, ?, 0, 1)
      `);

      insertCreatorAsParticipant.run(competitionResult.lastInsertRowid, userId);

      return {
        success: true,
        competitionId: competitionResult.lastInsertRowid
      };
    });

    // Execute transaction
    const result = createCompetitionTransaction();

    if (result.success) {
      return res.status(201).json({
        message: 'Competition created successfully',
        competitionId: result.competitionId
      });
    } else {
      return res.status(500).json({ message: 'Failed to create competition' });
    }
  } catch (error) {
    console.error('Create competition error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all competitions
const getAllCompetitions = (req, res) => {
  try {
    const competitions = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.status,
        c.created_at,
        u.display_name as creator_name,
        (SELECT COUNT(*) FROM participants WHERE competition_id = c.id) as participant_count
      FROM competitions c
      JOIN users u ON c.created_by = u.id
      ORDER BY
        CASE
          WHEN c.status = 'active' THEN 1
          WHEN c.status = 'upcoming' THEN 2
          WHEN c.status = 'completed' THEN 3
        END,
        c.created_at DESC
    `).all();

    return res.status(200).json({ competitions });
  } catch (error) {
    console.error('Get all competitions error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get competition by ID
const getCompetitionById = (req, res) => {
  try {
    const competitionId = parseInt(req.params.competitionId);

    // Get competition details
    const competition = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.status,
        c.created_at,
        c.created_by,
        u.display_name as creator_name
      FROM competitions c
      JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `).get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    // Get participants
    const participants = db.prepare(`
      SELECT
        p.id as participant_id,
        p.user_id,
        u.display_name,
        p.score,
        p.joined_at
      FROM participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.competition_id = ?
      ORDER BY p.score DESC, u.display_name
    `).all(competitionId);

    // Get matchups
    const matchups = db.prepare(`
      SELECT
        m.id,
        m.participant1_id,
        p1.user_id as participant1_user_id,
        u1.display_name as participant1_name,
        m.participant2_id,
        p2.user_id as participant2_user_id,
        u2.display_name as participant2_name,
        m.participant1_score,
        m.participant2_score,
        m.round,
        m.status,
        m.scheduled_at
      FROM matchups m
      JOIN participants p1 ON m.participant1_id = p1.id
      JOIN participants p2 ON m.participant2_id = p2.id
      JOIN users u1 ON p1.user_id = u1.id
      JOIN users u2 ON p2.user_id = u2.id
      WHERE m.competition_id = ?
      ORDER BY m.round, m.id
    `).all(competitionId);

    return res.status(200).json({
      competition,
      participants,
      matchups
    });
  } catch (error) {
    console.error('Get competition by ID error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update competition (admin only)
const updateCompetition = (req, res) => {
  try {
    const competitionId = parseInt(req.params.competitionId);
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Competition name is required' });
    }

    if (status && !['upcoming', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Check if competition exists
    const competition = db.prepare('SELECT id FROM competitions WHERE id = ?').get(competitionId);
    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    // Update competition
    const updateCompetition = db.prepare(`
      UPDATE competitions
      SET name = ?, description = ?, status = COALESCE(?, status)
      WHERE id = ?
    `);

    const result = updateCompetition.run(name, description || '', status, competitionId);

    if (result.changes > 0) {
      return res.status(200).json({ message: 'Competition updated successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to update competition' });
    }
  } catch (error) {
    console.error('Update competition error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Join a competition with password
const joinCompetition = (req, res) => {
  try {
    const competitionId = parseInt(req.params.competitionId);
    const userId = req.user.id;
    const { password } = req.body;

    // Check if competition exists and is not completed
    const competition = db.prepare(`
      SELECT id, status, password, public, created_by
      FROM competitions
      WHERE id = ? AND status != 'completed'
    `).get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found or already completed' });
    }

    // Check if password is required and matches
    if (!competition.public && competition.password !== null) {
      if (!password) {
        return res.status(400).json({ message: 'Password is required to join this competition' });
      }

      if (password !== competition.password) {
        return res.status(401).json({ message: 'Incorrect password' });
      }
    }

    // Check if user is already a participant
    const existingParticipant = db.prepare(`
      SELECT id FROM participants
      WHERE competition_id = ? AND user_id = ?
    `).get(competitionId, userId);

    if (existingParticipant) {
      return res.status(400).json({ message: 'You are already participating in this competition' });
    }

    // Determine if auto-approval is needed (public competitions or if user is the creator)
    const autoApprove = competition.public || competition.created_by === userId;

    // Add user as participant
    const insertParticipant = db.prepare(`
      INSERT INTO participants (competition_id, user_id, score, approved)
      VALUES (?, ?, 0, ?)
    `);

    const result = insertParticipant.run(
      competitionId,
      userId,
      autoApprove ? 1 : 0
    );

    if (result.changes > 0) {
      return res.status(201).json({
        message: autoApprove
          ? 'Joined competition successfully'
          : 'Request to join competition submitted. Awaiting approval.',
        participantId: result.lastInsertRowid,
        approved: autoApprove
      });
    } else {
      return res.status(500).json({ message: 'Failed to join competition' });
    }
  } catch (error) {
    console.error('Join competition error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Generate matchups for a competition round (admin only)
const generateMatchups = (req, res) => {
  try {
    const competitionId = parseInt(req.params.competitionId);
    const { round } = req.body;

    if (!round || isNaN(parseInt(round)) || parseInt(round) <= 0) {
      return res.status(400).json({ message: 'Valid round number is required' });
    }

    const roundNumber = parseInt(round);

    // Check if competition exists
    const competition = db.prepare(`
      SELECT id, status FROM competitions WHERE id = ?
    `).get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    // Check if the round already has matchups
    const existingMatchups = db.prepare(`
      SELECT COUNT(*) as count FROM matchups
      WHERE competition_id = ? AND round = ?
    `).get(competitionId, roundNumber);

    if (existingMatchups.count > 0) {
      return res.status(400).json({ message: `Round ${roundNumber} already has matchups` });
    }

    // Get all participants
    const participants = db.prepare(`
      SELECT id, user_id FROM participants WHERE competition_id = ?
    `).all(competitionId);

    if (participants.length < 2) {
      return res.status(400).json({ message: 'Not enough participants to generate matchups' });
    }

    // Generate all possible pairings
    const matchupPairs = [];
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchupPairs.push({
          participant1_id: participants[i].id,
          participant2_id: participants[j].id
        });
      }
    }

    // Shuffle the matchup pairs for randomness
    for (let i = matchupPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [matchupPairs[i], matchupPairs[j]] = [matchupPairs[j], matchupPairs[i]];
    }

    // Start a transaction to insert all matchups
    const createMatchupsTransaction = db.transaction(() => {
      const insertMatchup = db.prepare(`
        INSERT INTO matchups (
          competition_id, participant1_id, participant2_id,
          participant1_score, participant2_score,
          round, status
        )
        VALUES (?, ?, ?, NULL, NULL, ?, 'scheduled')
      `);

      for (const pair of matchupPairs) {
        insertMatchup.run(
          competitionId,
          pair.participant1_id,
          pair.participant2_id,
          roundNumber
        );
      }

      // Update competition status to active if it was upcoming
      if (competition.status === 'upcoming') {
        db.prepare(`
          UPDATE competitions SET status = 'active' WHERE id = ?
        `).run(competitionId);
      }

      return {
        success: true,
        count: matchupPairs.length
      };
    });

    // Execute the transaction
    const result = createMatchupsTransaction();

    if (result.success) {
      return res.status(201).json({
        message: `Successfully generated ${result.count} matchups for round ${roundNumber}`
      });
    } else {
      return res.status(500).json({ message: 'Failed to generate matchups' });
    }
  } catch (error) {
    console.error('Generate matchups error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update matchup scores (admin only)
const updateMatchupScore = (req, res) => {
  try {
    const matchupId = parseInt(req.params.matchupId);
    const { participant1Score, participant2Score } = req.body;

    if (participant1Score === undefined || participant2Score === undefined ||
        isNaN(parseInt(participant1Score)) || isNaN(parseInt(participant2Score)) ||
        parseInt(participant1Score) < 0 || parseInt(participant2Score) < 0) {
      return res.status(400).json({ message: 'Valid scores are required for both participants' });
    }

    const score1 = parseInt(participant1Score);
    const score2 = parseInt(participant2Score);

    // Get matchup details
    const matchup = db.prepare(`
      SELECT m.*, p1.user_id as p1_user_id, p2.user_id as p2_user_id, c.id as competition_id
      FROM matchups m
      JOIN participants p1 ON m.participant1_id = p1.id
      JOIN participants p2 ON m.participant2_id = p2.id
      JOIN competitions c ON m.competition_id = c.id
      WHERE m.id = ?
    `).get(matchupId);

    if (!matchup) {
      return res.status(404).json({ message: 'Matchup not found' });
    }

    // Start a transaction to update scores and participant totals
    const updateScoresTransaction = db.transaction(() => {
      // Update matchup scores and status
      db.prepare(`
        UPDATE matchups
        SET participant1_score = ?, participant2_score = ?, status = 'completed'
        WHERE id = ?
      `).run(score1, score2, matchupId);

      // Determine winner and update participant scores
      let winner = null;
      if (score1 > score2) {
        winner = matchup.participant1_id;
      } else if (score2 > score1) {
        winner = matchup.participant2_id;
      }
      // If scores are equal, no winner (draw)

      // Get current participant scores
      const p1Current = db.prepare('SELECT score FROM participants WHERE id = ?')
                          .get(matchup.participant1_id);
      const p2Current = db.prepare('SELECT score FROM participants WHERE id = ?')
                          .get(matchup.participant2_id);

      // Update participant total scores
      // For example, award 3 points for win, 1 point for draw, 0 for loss
      let p1NewScore = p1Current.score;
      let p2NewScore = p2Current.score;

      if (winner === matchup.participant1_id) {
        p1NewScore += 3; // Win
      } else if (winner === matchup.participant2_id) {
        p2NewScore += 3; // Win
      } else {
        p1NewScore += 1; // Draw
        p2NewScore += 1; // Draw
      }

      // Update participant scores
      db.prepare('UPDATE participants SET score = ? WHERE id = ?')
        .run(p1NewScore, matchup.participant1_id);

      db.prepare('UPDATE participants SET score = ? WHERE id = ?')
        .run(p2NewScore, matchup.participant2_id);

      return { success: true };
    });

    // Execute the transaction
    const result = updateScoresTransaction();

    if (result.success) {
      return res.status(200).json({
        message: 'Matchup scores updated successfully'
      });
    } else {
      return res.status(500).json({ message: 'Failed to update matchup scores' });
    }
  } catch (error) {
    console.error('Update matchup score error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Complete a competition (admin only)
const completeCompetition = (req, res) => {
  try {
    const competitionId = parseInt(req.params.competitionId);

    // Check if competition exists
    const competition = db.prepare('SELECT id, status FROM competitions WHERE id = ?').get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    if (competition.status === 'completed') {
      return res.status(400).json({ message: 'Competition is already completed' });
    }

    // Check if all matchups are completed
    const pendingMatchups = db.prepare(`
      SELECT COUNT(*) as count FROM matchups
      WHERE competition_id = ? AND status = 'scheduled'
    `).get(competitionId);

    if (pendingMatchups.count > 0) {
      return res.status(400).json({
        message: `Cannot complete competition. There are ${pendingMatchups.count} pending matchups.`
      });
    }

    // Update competition status
    const updateCompetition = db.prepare(`
      UPDATE competitions
      SET status = 'completed'
      WHERE id = ?
    `);

    const result = updateCompetition.run(competitionId);

    if (result.changes > 0) {
      return res.status(200).json({ message: 'Competition completed successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to complete competition' });
    }
  } catch (error) {
    console.error('Complete competition error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Approve a participant (admin only)
const approveParticipant = (req, res) => {
  try {
    const { competitionId, participantId } = req.params;
    const userId = req.user.id;

    // Verify the user is the creator of the competition
    const competition = db.prepare(`
      SELECT created_by FROM competitions WHERE id = ?
    `).get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    if (competition.created_by !== userId) {
      return res.status(403).json({ message: 'Only the competition creator can approve participants' });
    }

    // Check if participant exists
    const participant = db.prepare(`
      SELECT p.id, p.approved, p.user_id, u.display_name
      FROM participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.competition_id = ?
    `).get(participantId, competitionId);

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    if (participant.approved) {
      return res.status(400).json({ message: 'Participant is already approved' });
    }

    // Approve participant
    const updateParticipant = db.prepare(`
      UPDATE participants
      SET approved = 1
      WHERE id = ?
    `);

    const result = updateParticipant.run(participantId);

    if (result.changes > 0) {
      return res.status(200).json({
        message: 'Participant approved successfully',
        participant: {
          id: participant.id,
          userId: participant.user_id,
          displayName: participant.display_name
        }
      });
    } else {
      return res.status(500).json({ message: 'Failed to approve participant' });
    }
  } catch (error) {
    console.error('Approve participant error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Reject a participant (admin only)
const rejectParticipant = (req, res) => {
  try {
    const { competitionId, participantId } = req.params;
    const userId = req.user.id;

    // Verify the user is the creator of the competition
    const competition = db.prepare(`
      SELECT created_by FROM competitions WHERE id = ?
    `).get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    if (competition.created_by !== userId) {
      return res.status(403).json({ message: 'Only the competition creator can reject participants' });
    }

    // Check if participant exists
    const participant = db.prepare(`
      SELECT id, approved
      FROM participants
      WHERE id = ? AND competition_id = ?
    `).get(participantId, competitionId);

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Delete the participant record
    const deleteParticipant = db.prepare(`
      DELETE FROM participants
      WHERE id = ?
    `);

    const result = deleteParticipant.run(participantId);

    if (result.changes > 0) {
      return res.status(200).json({
        message: 'Participant rejected successfully'
      });
    } else {
      return res.status(500).json({ message: 'Failed to reject participant' });
    }
  } catch (error) {
    console.error('Reject participant error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get pending participants for a competition
const getPendingParticipants = (req, res) => {
  try {
    const { competitionId } = req.params;
    const userId = req.user.id;

    // Verify the user is the creator of the competition
    const competition = db.prepare(`
      SELECT created_by FROM competitions WHERE id = ?
    `).get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    if (competition.created_by !== userId) {
      return res.status(403).json({ message: 'Only the competition creator can view pending participants' });
    }

    // Get pending participants
    const pendingParticipants = db.prepare(`
      SELECT p.id, p.user_id, u.display_name, p.joined_at
      FROM participants p
      JOIN users u ON p.user_id = u.id
      WHERE p.competition_id = ? AND p.approved = 0
      ORDER BY p.joined_at DESC
    `).all(competitionId);

    return res.status(200).json({
      pendingParticipants
    });
  } catch (error) {
    console.error('Get pending participants error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createCompetition,
  getAllCompetitions,
  getCompetitionById,
  updateCompetition,
  joinCompetition,
  generateMatchups,
  updateMatchupScore,
  completeCompetition,
  approveParticipant,
  rejectParticipant,
  getPendingParticipants
};
