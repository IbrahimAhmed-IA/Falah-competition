const db = require('../database/db');

// Get all users (admins only)
const getAllUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, role, display_name, created_at
      FROM users
      ORDER BY id
    `).all();

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all participants (admins only)
const getAllParticipants = (req, res) => {
  try {
    const participants = db.prepare(`
      SELECT id, username, display_name, created_at
      FROM users
      WHERE role = 'participant'
      ORDER BY display_name
    `).all();

    return res.status(200).json({ participants });
  } catch (error) {
    console.error('Get all participants error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID (admins or self)
const getUserById = (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = db.prepare(`
      SELECT id, username, role, display_name, created_at
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update user (admins only)
const updateUser = (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { displayName } = req.body;

    if (!displayName) {
      return res.status(400).json({ message: 'Display name is required' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    const updateUser = db.prepare(`
      UPDATE users
      SET display_name = ?
      WHERE id = ?
    `);

    const result = updateUser.run(displayName, userId);

    if (result.changes > 0) {
      return res.status(200).json({ message: 'User updated successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to update user' });
    }
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all name change requests (admins only)
const getNameChangeRequests = (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT
        ncr.id,
        ncr.user_id,
        u.display_name as current_name,
        ncr.new_name,
        ncr.status,
        ncr.requested_at,
        ncr.resolved_at,
        ncr.resolved_by
      FROM name_change_requests ncr
      JOIN users u ON ncr.user_id = u.id
      ORDER BY
        CASE
          WHEN ncr.status = 'pending' THEN 1
          WHEN ncr.status = 'approved' THEN 2
          WHEN ncr.status = 'rejected' THEN 3
        END,
        ncr.requested_at DESC
    `).all();

    return res.status(200).json({ requests });
  } catch (error) {
    console.error('Get name change requests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Process a name change request (admins only)
const processNameChangeRequest = (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const { status } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (approved or rejected) is required' });
    }

    // Get the request
    const request = db.prepare(`
      SELECT * FROM name_change_requests WHERE id = ? AND status = 'pending'
    `).get(requestId);

    if (!request) {
      return res.status(404).json({ message: 'Pending name change request not found' });
    }

    // Start a transaction
    const updateTransaction = db.transaction(() => {
      // Update the request status
      const updateRequest = db.prepare(`
        UPDATE name_change_requests
        SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
        WHERE id = ?
      `);
      updateRequest.run(status, req.user.id, requestId);

      // If approved, update the user's display name
      if (status === 'approved') {
        const updateUser = db.prepare(`
          UPDATE users
          SET display_name = ?
          WHERE id = ?
        `);
        updateUser.run(request.new_name, request.user_id);
      }

      return { success: true };
    });

    // Execute the transaction
    const result = updateTransaction();

    if (result.success) {
      return res.status(200).json({
        message: `Name change request ${status}`
      });
    } else {
      return res.status(500).json({ message: 'Failed to process request' });
    }
  } catch (error) {
    console.error('Process name change request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getAllParticipants,
  getUserById,
  updateUser,
  getNameChangeRequests,
  processNameChangeRequest
};
