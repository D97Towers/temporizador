// Base de datos PostgreSQL gratuita para Vercel usando Neon
const { Pool } = require('pg');

// Configuración de la base de datos PostgreSQL (Neon)
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Pool de conexiones
let pool = null;

// Inicializar la conexión a la base de datos
async function initializeDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('No DATABASE_URL configured, using in-memory storage');
      return false;
    }

    console.log('Attempting to connect to PostgreSQL...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    pool = new Pool(dbConfig);
    
    // Probar la conexión
    console.log('Testing PostgreSQL connection...');
    const client = await pool.connect();
    console.log('PostgreSQL connection successful!');
    await client.release();
    
    // Crear tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS children (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nickname VARCHAR(255),
        father_name VARCHAR(255),
        mother_name VARCHAR(255),
        display_name VARCHAR(255),
        avatar VARCHAR(10),
        total_sessions INTEGER DEFAULT 0,
        total_time_played INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        child_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT,
        duration INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (child_id) REFERENCES children (id),
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);

    console.log('PostgreSQL database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing PostgreSQL database:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

// Funciones para children
const children = {
  async getAll() {
    if (!pool) return [];
    const result = await pool.query(`
      SELECT c.*, 
             COUNT(s.id) as session_count,
             COALESCE(SUM(s.duration), 0) as total_time
      FROM children c
      LEFT JOIN sessions s ON c.id = s.child_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    return result.rows;
  },

  async getById(id) {
    if (!pool) return null;
    const result = await pool.query('SELECT * FROM children WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(name, nickname, fatherName, motherName, displayName, avatar, totalSessions, totalTimePlayed) {
    if (!pool) return null;
    const result = await pool.query(
      'INSERT INTO children (name, nickname, father_name, mother_name, display_name, avatar, total_sessions, total_time_played) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, nickname, fatherName, motherName, displayName, avatar, totalSessions, totalTimePlayed]
    );
    return result.rows[0];
  },

  async update(id, name, nickname, fatherName, motherName, displayName, avatar) {
    if (!pool) return false;
    const result = await pool.query(
      'UPDATE children SET name = $1, nickname = $2, father_name = $3, mother_name = $4, display_name = $5, avatar = $6 WHERE id = $7',
      [name, nickname, fatherName, motherName, displayName, avatar, id]
    );
    return result.rowCount > 0;
  },

  async delete(id) {
    if (!pool) return false;
    const result = await pool.query('DELETE FROM children WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  async getByName(name) {
    if (!pool) return null;
    const result = await pool.query('SELECT * FROM children WHERE name = $1', [name]);
    return result.rows[0] || null;
  }
};

// Funciones para games
const games = {
  async getAll() {
    if (!pool) return [];
    const result = await pool.query('SELECT * FROM games ORDER BY created_at DESC');
    return result.rows;
  },

  async getById(id) {
    if (!pool) return null;
    const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(name) {
    if (!pool) return null;
    const result = await pool.query('INSERT INTO games (name) VALUES ($1) RETURNING *', [name]);
    return result.rows[0];
  },

  async delete(id) {
    if (!pool) return false;
    const result = await pool.query('DELETE FROM games WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
};

// Funciones para sessions
const sessions = {
  async getAll() {
    if (!pool) return [];
    const result = await pool.query(`
      SELECT s.*, 
             c.name as child_name, c.display_name as child_display_name,
             c.father_name, c.mother_name,
             g.name as game_name
      FROM sessions s
      JOIN children c ON s.child_id = c.id
      JOIN games g ON s.game_id = g.id
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  },

  async getActive() {
    if (!pool) return [];
    const result = await pool.query(`
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
    return result.rows;
  },

  async getById(id) {
    if (!pool) return null;
    const result = await pool.query(`
      SELECT s.*, 
             c.name as child_name, c.display_name as child_display_name,
             c.father_name, c.mother_name,
             g.name as game_name
      FROM sessions s
      JOIN children c ON s.child_id = c.id
      JOIN games g ON s.game_id = g.id
      WHERE s.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async create(childId, gameId, startTime, duration) {
    if (!pool) return null;
    const result = await pool.query(
      'INSERT INTO sessions (child_id, game_id, start_time, duration) VALUES ($1, $2, $3, $4) RETURNING *',
      [childId, gameId, startTime, duration]
    );
    return result.rows[0];
  },

  async end(sessionId) {
    if (!pool) return false;
    const result = await pool.query(
      'UPDATE sessions SET end_time = $1 WHERE id = $2 AND end_time IS NULL',
      [Date.now(), sessionId]
    );
    return result.rowCount > 0;
  },

  async extend(sessionId, additionalTime) {
    if (!pool) return false;
    const result = await pool.query(
      'UPDATE sessions SET duration = duration + $1 WHERE id = $2',
      [additionalTime, sessionId]
    );
    return result.rowCount > 0;
  },

  async delete(id) {
    if (!pool) return false;
    const result = await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
};

module.exports = {
  initializeDatabase,
  children,
  games,
  sessions,
  pool
};
