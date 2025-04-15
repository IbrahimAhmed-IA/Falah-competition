const bcrypt = require('bcrypt');
const db = require('../database/db');
const { generateToken } = require('../middleware/auth');

// Login controller
const login = (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get user from database
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check password
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data and token
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Register controller (for participants only)
const register = (req, res) => {
  try {
    console.log('Registration request received:', JSON.stringify(req.body, null, 2));
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Username, password, and display name are required' });
    }

    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      console.log('Username already exists:', username);
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    console.log('Hashing password...');
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);

    // Create new user with participant role
    console.log('Creating new user with participant role...');
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, display_name)
      VALUES (?, ?, 'participant', ?)
    `);

    try {
      const result = insertUser.run(username, hashedPassword, displayName);
      console.log('Insert result:', result);

      if (result.changes > 0) {
        // Get the created user
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        console.log('User created successfully:', user.id);

        // Generate token
        const token = generateToken(user);

        return res.status(201).json({
          message: 'Registration successful',
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            displayName: user.display_name
          },
          token
        });
      } else {
        console.log('Failed to create user - no changes made');
        return res.status(500).json({ message: 'Failed to create user' });
      }
    } catch (dbError) {
      console.error('Database error during insert:', dbError);
      return res.status(500).json({ message: 'Database error: ' + dbError.message });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Get current user info
const getCurrentUser = (req, res) => {
  try {
    const userId = req.user.id;

    // Get user from database
    const user = db.prepare('SELECT id, username, role, display_name FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  login,
  register,
  getCurrentUser
};
