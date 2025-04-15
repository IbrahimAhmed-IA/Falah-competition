const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Ensure the database directory exists
const dbDir = path.join(__dirname, '../../db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'competition.db');

// Initialize the database with more careful error handling
let db;
try {
  db = new Database(dbPath, { verbose: console.log });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'participant')),
      display_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create competitions table with password field
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
      password TEXT,
      public BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Create participants table with approval status
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      score INTEGER DEFAULT 0,
      approved BOOLEAN DEFAULT 0,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(competition_id, user_id)
    )
  `);

  // Create matchups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS matchups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      participant1_id INTEGER NOT NULL,
      participant2_id INTEGER NOT NULL,
      participant1_score INTEGER DEFAULT NULL,
      participant2_score INTEGER DEFAULT NULL,
      round INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed')),
      scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
      FOREIGN KEY (participant1_id) REFERENCES participants(id),
      FOREIGN KEY (participant2_id) REFERENCES participants(id)
    )
  `);

  // Create name change requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS name_change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      new_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP DEFAULT NULL,
      resolved_by INTEGER DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    )
  `);

  // Create an admin user if none exists
  const createInitialAdmin = db.prepare(`
    INSERT INTO users (username, password, role, display_name)
    SELECT 'admin', ?, 'admin', 'Administrator'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  `);

  // Hash the default password
  const saltRounds = 10;
  const defaultPassword = 'admin123'; // This should be changed after first login
  const hashedPassword = bcrypt.hashSync(defaultPassword, saltRounds);

  // Create admin user with the default credentials if no admin exists
  createInitialAdmin.run(hashedPassword);

  console.log('Database initialized successfully');
} catch (error) {
  console.error('Database initialization error:', error);
  throw error;
}

// Export the database instance
module.exports = db;
