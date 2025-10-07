// BASE DE DATOS POSTGRESQL REAL - Solución definitiva
// Implementando base de datos real con Neon (PostgreSQL gratuito)

const { Pool } = require('pg');

// ============================================================================
// CONFIGURACIÓN DE BASE DE DATOS
// ============================================================================

// Pool será creado de forma lazy
let pool = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    // Configurar SSL según el entorno
    let sslConfig = false;
    if (process.env.VERCEL) {
      // En Vercel (producción) usar SSL
      sslConfig = {
        rejectUnauthorized: false
      };
    } else if (process.env.DATABASE_URL?.includes('supabase')) {
      // En desarrollo local con Supabase, deshabilitar SSL
      sslConfig = false;
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 20, // Máximo de conexiones
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  if (!pool) {
    throw new Error('DATABASE_URL no configurada');
  }
  
  return pool;
}

// ============================================================================
// INICIALIZACIÓN DE BASE DE DATOS
// ============================================================================

async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando base de datos PostgreSQL...');
    const pool = getPool();
    
    // Crear tabla children
    await getPool().query(`
    CREATE TABLE IF NOT EXISTS children (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        nickname VARCHAR(30),
        father_name VARCHAR(50),
        mother_name VARCHAR(50),
        display_name VARCHAR(80),
        avatar VARCHAR(1),
        total_sessions INTEGER DEFAULT 0,
        total_time_played INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear tabla games
    await getPool().query(`
    CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear tabla sessions
    await getPool().query(`
    CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      duration INTEGER NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear índices para mejor rendimiento
    await getPool().query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id)
    `);
    await getPool().query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_game_id ON sessions(game_id)
    `);
    await getPool().query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON sessions(end_time)
    `);
    
    console.log('✅ Base de datos PostgreSQL inicializada correctamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    throw error;
  }
}

// ============================================================================
// OPERACIONES DE CHILDREN
// ============================================================================

async function createChild(childData) {
  const query = `
    INSERT INTO children (name, nickname, father_name, mother_name, display_name, avatar)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [
    childData.name,
    childData.nickname,
    childData.fatherName,
    childData.motherName,
    childData.displayName,
    childData.avatar
  ];
  
  const result = await getPool().query(query, values);
  return result.rows[0];
}

async function getChildren() {
  const query = `
    SELECT 
      id,
      name,
      nickname,
      father_name as "fatherName",
      mother_name as "motherName",
      display_name as "displayName",
      avatar,
      total_sessions as "totalSessions",
      total_time_played as "totalTimePlayed",
      created_at as "createdAt"
    FROM children 
    ORDER BY name
  `;
  
  const result = await getPool().query(query);
  return result.rows;
}

async function getChildById(id) {
  const query = `
    SELECT 
      id,
      name,
      nickname,
      father_name as "fatherName",
      mother_name as "motherName",
      display_name as "displayName",
      avatar,
      total_sessions as "totalSessions",
      total_time_played as "totalTimePlayed",
      created_at as "createdAt"
    FROM children 
    WHERE id = $1
  `;
  
  const result = await getPool().query(query, [id]);
  return result.rows[0];
}

async function updateChild(id, updateData) {
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  if (updateData.name) {
    fields.push(`name = $${paramCount++}`);
    values.push(updateData.name);
  }
  if (updateData.nickname !== undefined) {
    fields.push(`nickname = $${paramCount++}`);
    values.push(updateData.nickname);
  }
  if (updateData.fatherName !== undefined) {
    fields.push(`father_name = $${paramCount++}`);
    values.push(updateData.fatherName);
  }
  if (updateData.motherName !== undefined) {
    fields.push(`mother_name = $${paramCount++}`);
    values.push(updateData.motherName);
  }
  if (updateData.displayName) {
    fields.push(`display_name = $${paramCount++}`);
    values.push(updateData.displayName);
  }
  
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  
  const query = `
    UPDATE children 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await getPool().query(query, values);
  return result.rows[0];
}

async function deleteChild(id) {
  const query = 'DELETE FROM children WHERE id = $1 RETURNING *';
  const result = await getPool().query(query, [id]);
  return result.rows[0];
}

// ============================================================================
// OPERACIONES DE GAMES
// ============================================================================

async function createGame(gameData) {
  const query = `
    INSERT INTO games (name)
    VALUES ($1)
    RETURNING *
  `;
  
  const result = await getPool().query(query, [gameData.name]);
  return result.rows[0];
}

async function getGames() {
  const query = `
    SELECT 
      id,
      name,
      created_at as "createdAt"
    FROM games 
    ORDER BY name
  `;
  
  const result = await getPool().query(query);
  return result.rows;
}

async function getGameById(id) {
  const query = `
    SELECT 
      id,
      name,
      created_at as "createdAt"
    FROM games 
    WHERE id = $1
  `;
  
  const result = await getPool().query(query, [id]);
  return result.rows[0];
}

async function deleteGame(id) {
  const query = 'DELETE FROM games WHERE id = $1 RETURNING *';
  const result = await getPool().query(query, [id]);
  return result.rows[0];
}

// ============================================================================
// OPERACIONES DE SESSIONS
// ============================================================================

async function createSession(sessionData) {
  const query = `
    INSERT INTO sessions (child_id, game_id, duration, start_time)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const values = [
    sessionData.childId,
    sessionData.gameId,
    sessionData.duration,
    sessionData.startTime
  ];
  
  const result = await getPool().query(query, values);
  return result.rows[0];
}

async function getSessions() {
  const query = `
    SELECT 
      s.id,
      s.child_id as "childId",
      s.game_id as "gameId",
      s.duration,
      s.start_time as "startTime",
      s.end_time as "endTime",
      s.created_at as "createdAt",
      c.name as child_name,
      c.display_name as child_display_name,
      g.name as game_name
    FROM sessions s
    JOIN children c ON s.child_id = c.id
    JOIN games g ON s.game_id = g.id
    ORDER BY s.created_at DESC
  `;
  
  const result = await getPool().query(query);
  return result.rows;
}

async function getActiveSessions() {
  const query = `
    SELECT 
      s.id,
      s.child_id as "childId",
      s.game_id as "gameId",
      s.duration,
      s.start_time as "startTime",
      s.end_time as "endTime",
      s.created_at as "createdAt",
      c.name as child_name,
      c.display_name as child_display_name,
      g.name as game_name
    FROM sessions s
    JOIN children c ON s.child_id = c.id
    JOIN games g ON s.game_id = g.id
    WHERE s.end_time IS NULL
    ORDER BY s.created_at DESC
  `;
  
  const result = await getPool().query(query);
  return result.rows;
}

async function endSession(id) {
  const query = `
    UPDATE sessions 
    SET end_time = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  
  const result = await getPool().query(query, [Date.now(), id]);
  return result.rows[0];
}

async function extendSession(id, additionalTime) {
  const query = `
    UPDATE sessions 
    SET duration = duration + $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  
  const result = await getPool().query(query, [additionalTime, id]);
  return result.rows[0];
}

// ============================================================================
// OPERACIONES DE ESTADÍSTICAS
// ============================================================================

async function getDashboardStats() {
  const childrenQuery = 'SELECT COUNT(*) as count FROM children';
  const gamesQuery = 'SELECT COUNT(*) as count FROM games';
  const sessionsQuery = 'SELECT COUNT(*) as count FROM sessions';
  const activeSessionsQuery = 'SELECT COUNT(*) as count FROM sessions WHERE end_time IS NULL';
  
  const [childrenResult, gamesResult, sessionsResult, activeSessionsResult] = await Promise.all([
    pool.query(childrenQuery),
    pool.query(gamesQuery),
    pool.query(sessionsQuery),
    pool.query(activeSessionsQuery)
  ]);
  
  return {
    children: parseInt(childrenResult.rows[0].count),
    games: parseInt(gamesResult.rows[0].count),
    sessions: parseInt(sessionsResult.rows[0].count),
    activeSessions: parseInt(activeSessionsResult.rows[0].count)
  };
}

// ============================================================================
// MIGRACIÓN DE DATOS EXISTENTES
// ============================================================================

async function migrateExistingData() {
  try {
    console.log('🔄 Migrando datos existentes a PostgreSQL...');
    
    // Verificar si ya hay datos
    const existingChildren = await getPool().query('SELECT COUNT(*) as count FROM children');
    if (parseInt(existingChildren.rows[0].count) > 0) {
      console.log('✅ Datos ya migrados');
      return;
    }
    
    // Insertar datos por defecto
    await getPool().query(`
      INSERT INTO children (name, nickname, father_name, mother_name, display_name, avatar)
      VALUES 
        ('David', 'Dave', 'Carlos', 'Maria', 'David (Dave)', 'D'),
        ('Santiago', 'Santi', 'Luis', 'Ana', 'Santiago (Santi)', 'S')
    `);
    
    await getPool().query(`
      INSERT INTO games (name)
      VALUES 
        ('bici'),
        ('videojuegos')
    `);
    
    console.log('✅ Datos por defecto migrados correctamente');
    
  } catch (error) {
    console.error('❌ Error migrando datos:', error.message);
    throw error;
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

module.exports = {
  // Inicialización
  initializeDatabase,
  migrateExistingData,
  
  // Children
  createChild,
  getChildren,
  getChildById,
  updateChild,
  deleteChild,
  
  // Games
  createGame,
  getGames,
  getGameById,
  deleteGame,
  
  // Sessions
  createSession,
  getSessions,
  getActiveSessions,
  endSession,
  extendSession,
  
  // Statistics
  getDashboardStats,
  
  // Pool for direct queries
  pool
};
