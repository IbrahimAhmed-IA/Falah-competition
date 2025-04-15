const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Secret key for JWT signing - using environment variable for better security
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_please_change_in_production';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token.' });
  }
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Middleware to check if user is a participant
const isParticipant = (req, res, next) => {
  if (!req.user || req.user.role !== 'participant') {
    return res.status(403).json({ message: 'Access denied. Participant privileges required.' });
  }
  next();
};

// Middleware to check if user is either admin or the requested user
const isSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  // Allow if admin or if the user is trying to access their own data
  if (req.user.role === 'admin' || req.user.id === parseInt(req.params.userId)) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. You can only access your own data.' });
  }
};

// Middleware to check if user is the creator of a competition
const isCompetitionCreator = (req, res, next) => {
  const userId = req.user.id;
  const competitionId = parseInt(req.params.competitionId);

  try {
    // Check if the user is the creator of this competition
    const competition = db.prepare('SELECT created_by FROM competitions WHERE id = ?').get(competitionId);

    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }

    if (competition.created_by !== userId) {
      return res.status(403).json({ message: 'Access denied. Only the competition creator can perform this action.' });
    }

    next();
  } catch (error) {
    console.error('isCompetitionCreator middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Generate JWT token for a user
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

module.exports = {
  authenticateToken,
  isAdmin,
  isParticipant,
  isSelfOrAdmin,
  isCompetitionCreator,
  generateToken,
  JWT_SECRET
};
