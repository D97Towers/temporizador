const Database = require('better-sqlite3');
const path = require('path');

// Crear conexión a la base de datos
const db = new Database(path.join(__dirname, 'data.db'));

// Crear tablas si no existen
function initializeDatabase() {
  // Tabla de niños
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nickname TEXT,
      father_name TEXT,
      mother_name TEXT,
      display_name TEXT,
      avatar TEXT,
      total_sessions INTEGER DEFAULT 0,
      total_time_played INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de juegos
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de sesiones
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children (id),
      FOREIGN KEY (game_id) REFERENCES games (id)
    )
  `);

  console.log('Base de datos inicializada correctamente');
}

// Funciones para manejar niños
const childrenQueries = {
  getAll: db.prepare('SELECT * FROM children ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM children WHERE id = ?'),
  create: db.prepare(`
    INSERT INTO children (name, nickname, father_name, mother_name, display_name, avatar, total_sessions, total_time_played)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  update: db.prepare(`
    UPDATE children 
    SET name = ?, nickname = ?, father_name = ?, mother_name = ?, display_name = ?, avatar = ?, total_sessions = ?, total_time_played = ?
    WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM children WHERE id = ?'),
  getByName: db.prepare('SELECT * FROM children WHERE name = ?')
};

// Funciones para manejar juegos
const gamesQueries = {
  getAll: db.prepare('SELECT * FROM games ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM games WHERE id = ?'),
  create: db.prepare('INSERT INTO games (name) VALUES (?)'),
  delete: db.prepare('DELETE FROM games WHERE id = ?')
};

// Funciones para manejar sesiones
const sessionsQueries = {
  getAll: db.prepare(`
    SELECT s.*, c.name as child_name, c.display_name as child_display_name, 
           c.father_name, c.mother_name, g.name as game_name
    FROM sessions s
    JOIN children c ON s.child_id = c.id
    JOIN games g ON s.game_id = g.id
    ORDER BY s.start_time DESC
  `),
  getActive: db.prepare(`
    SELECT s.*, c.name as child_name, c.display_name as child_display_name, 
           c.father_name, c.mother_name, g.name as game_name
    FROM sessions s
    JOIN children c ON s.child_id = c.id
    JOIN games g ON s.game_id = g.id
    WHERE s.end_time IS NULL
    ORDER BY s.start_time DESC
  `),
  getById: db.prepare(`
    SELECT s.*, c.name as child_name, c.display_name as child_display_name, 
           c.father_name, c.mother_name, g.name as game_name
    FROM sessions s
    JOIN children c ON s.child_id = c.id
    JOIN games g ON s.game_id = g.id
    WHERE s.id = ?
  `),
  create: db.prepare(`
    INSERT INTO sessions (child_id, game_id, start_time, duration)
    VALUES (?, ?, ?, ?)
  `),
  end: db.prepare('UPDATE sessions SET end_time = ? WHERE id = ?'),
  extend: db.prepare('UPDATE sessions SET duration = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM sessions WHERE id = ?')
};

// Inicializar la base de datos
initializeDatabase();

module.exports = {
  db,
  children: childrenQueries,
  games: gamesQueries,
  sessions: sessionsQueries
};
