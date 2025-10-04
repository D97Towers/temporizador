// Base de datos MySQL para Vercel usando PlanetScale
const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'temporizador_juegos',
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
};

// Pool de conexiones
let pool = null;

// Inicializar la conexión a la base de datos
async function initializeDatabase() {
  try {
    if (process.env.VERCEL && !process.env.DB_HOST) {
      console.log('No database configured for Vercel, using in-memory storage');
      return false;
    }

    pool = mysql.createPool(dbConfig);
    
    // Crear tablas si no existen
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS children (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nickname VARCHAR(255),
        father_name VARCHAR(255),
        mother_name VARCHAR(255),
        display_name VARCHAR(255),
        avatar VARCHAR(10),
        total_sessions INT DEFAULT 0,
        total_time_played INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        child_id INT NOT NULL,
        game_id INT NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT,
        duration INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (child_id) REFERENCES children (id),
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);

    console.log('MySQL database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing MySQL database:', error);
    return false;
  }
}

// Funciones para children
const children = {
  async getAll() {
    if (!pool) return [];
    const [rows] = await pool.execute(`
      SELECT c.*, 
             GROUP_CONCAT(DISTINCT CONCAT(s.id, ':', s.start_time, ':', s.end_time, ':', s.duration)) as session_data
      FROM children c
      LEFT JOIN sessions s ON c.id = s.child_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    return rows;
  },

  async getById(id) {
    if (!pool) return null;
    const [rows] = await pool.execute('SELECT * FROM children WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(name, nickname, fatherName, motherName, displayName, avatar, totalSessions, totalTimePlayed) {
    if (!pool) return null;
    const [result] = await pool.execute(
      'INSERT INTO children (name, nickname, father_name, mother_name, display_name, avatar, total_sessions, total_time_played) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, nickname, fatherName, motherName, displayName, avatar, totalSessions, totalTimePlayed]
    );
    return result;
  },

  async update(id, name, nickname, fatherName, motherName, displayName, avatar) {
    if (!pool) return false;
    const [result] = await pool.execute(
      'UPDATE children SET name = ?, nickname = ?, father_name = ?, mother_name = ?, display_name = ?, avatar = ? WHERE id = ?',
      [name, nickname, fatherName, motherName, displayName, avatar, id]
    );
    return result.affectedRows > 0;
  },

  async delete(id) {
    if (!pool) return false;
    const [result] = await pool.execute('DELETE FROM children WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async getByName(name) {
    if (!pool) return null;
    const [rows] = await pool.execute('SELECT * FROM children WHERE name = ?', [name]);
    return rows[0] || null;
  }
};

// Funciones para games
const games = {
  async getAll() {
    if (!pool) return [];
    const [rows] = await pool.execute('SELECT * FROM games ORDER BY created_at DESC');
    return rows;
  },

  async getById(id) {
    if (!pool) return null;
    const [rows] = await pool.execute('SELECT * FROM games WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(name) {
    if (!pool) return null;
    const [result] = await pool.execute('INSERT INTO games (name) VALUES (?)', [name]);
    return result;
  },

  async delete(id) {
    if (!pool) return false;
    const [result] = await pool.execute('DELETE FROM games WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

// Funciones para sessions
const sessions = {
  async getAll() {
    if (!pool) return [];
    const [rows] = await pool.execute(`
      SELECT s.*, 
             c.name as child_name, c.display_name as child_display_name,
             c.father_name, c.mother_name,
             g.name as game_name
      FROM sessions s
      JOIN children c ON s.child_id = c.id
      JOIN games g ON s.game_id = g.id
      ORDER BY s.created_at DESC
    `);
    return rows;
  },

  async getActive() {
    if (!pool) return [];
    const [rows] = await pool.execute(`
      SELECT s.*, 
             c.name as child_name, c.display_name as child_display_name,
             c.father_name, c.mother_name,
             g.name as game_name
      FROM sessions s
      JOIN children c ON s.child_id = c.id
      JOIN games g ON s.game_id = g.id
      WHERE s.end_time IS NULL
      ORDER BY s.created_at DESC
    `);
    return rows;
  },

  async getById(id) {
    if (!pool) return null;
    const [rows] = await pool.execute(`
      SELECT s.*, 
             c.name as child_name, c.display_name as child_display_name,
             c.father_name, c.mother_name,
             g.name as game_name
      FROM sessions s
      JOIN children c ON s.child_id = c.id
      JOIN games g ON s.game_id = g.id
      WHERE s.id = ?
    `, [id]);
    return rows[0] || null;
  },

  async create(childId, gameId, startTime, duration) {
    if (!pool) return null;
    const [result] = await pool.execute(
      'INSERT INTO sessions (child_id, game_id, start_time, duration) VALUES (?, ?, ?, ?)',
      [childId, gameId, startTime, duration]
    );
    return result;
  },

  async end(sessionId) {
    if (!pool) return false;
    const [result] = await pool.execute(
      'UPDATE sessions SET end_time = ? WHERE id = ? AND end_time IS NULL',
      [Date.now(), sessionId]
    );
    return result.affectedRows > 0;
  },

  async extend(sessionId, additionalTime) {
    if (!pool) return false;
    const [result] = await pool.execute(
      'UPDATE sessions SET duration = duration + ? WHERE id = ?',
      [additionalTime, sessionId]
    );
    return result.affectedRows > 0;
  },

  async delete(id) {
    if (!pool) return false;
    const [result] = await pool.execute('DELETE FROM sessions WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = {
  initializeDatabase,
  children,
  games,
  sessions,
  pool
};
