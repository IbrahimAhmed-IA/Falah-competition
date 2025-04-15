const db = require('../database/db');

// Request a name change
const requestNameChange = (req, res) => {
  try {
    const userId = req.user.id;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ message: 'New name is required' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the new name is the same as the current name
    if (user.display_name === newName) {
      return res.status(400).json({ message: 'New name is the same as current name' });
    }

    // Check if there's a pending request already
    const pendingRequest = db.prepare(`
      SELECT id FROM name_change_requests
      WHERE user_id = ? AND status = 'pending'
    `).get(userId);

    if (pendingRequest) {
      return res.status(400).json({ message: 'You already have a pending name change request' });
    }

    // Create name change request
    const insertRequest = db.prepare(`
      INSERT INTO name_change_requests (user_id, new_name, status)
      VALUES (?, ?, 'pending')
    `);

    const result = insertRequest.run(userId, newName);

    if (result.changes > 0) {
      return res.status(201).json({
        message: 'Name change request submitted successfully',
        requestId: result.lastInsertRowid
      });
    } else {
      return res.status(500).json({ message: 'Failed to submit name change request' });
    }
  } catch (error) {
    console.error('Request name change error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get a participant's name change requests
const getMyNameChangeRequests = (req, res) => {
  try {
    const userId = req.user.id;

    const requests = db.prepare(`
      SELECT id, new_name, status, requested_at, resolved_at
      FROM name_change_requests
      WHERE user_id = ?
      ORDER BY requested_at DESC
    `).all(userId);

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('Get participant name change requests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get a participant's profile info
const getMyProfile = (req, res) => {
  try {
    const userId = req.user.id;

    // Get participant info
    const participant = db.prepare(`
      SELECT id, username, display_name, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }

    // Get participant's competitions
    const competitions = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.status,
        p.score,
        p.joined_at
      FROM participants p
      JOIN competitions c ON p.competition_id = c.id
      WHERE p.user_id = ?
      ORDER BY c.status, c.created_at DESC
    `).all(userId);

    // Get pending name change request if any
    const pendingRequest = db.prepare(`
      SELECT id, new_name, requested_at
      FROM name_change_requests
      WHERE user_id = ? AND status = 'pending'
      LIMIT 1
    `).get(userId);

    return res.status(200).json({
      participant,
      competitions,
      pendingNameChangeRequest: pendingRequest || null
    });
  } catch (error) {
    console.error('Get participant profile error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  requestNameChange,
  getMyNameChangeRequests,
  getMyProfile
};
