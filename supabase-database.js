// BASE DE DATOS SUPABASE - Configuración específica para Supabase
const { Pool } = require('pg');

// ============================================================================
// CONFIGURACIÓN ESPECÍFICA PARA SUPABASE
// ============================================================================

// Pool será creado de forma lazy
let pool = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    console.log('🔗 Creando conexión a Supabase...');
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    console.log('✅ Pool de Supabase creado');
  }
  
  if (!pool) {
    throw new Error('DATABASE_URL no configurada para Supabase');
  }
  
  return pool;
}

// ============================================================================
// FUNCIONES DE BASE DE DATOS SIMPLIFICADAS
// ============================================================================

async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando base de datos Supabase...');
    const pool = getPool();
    
    // Las tablas ya existen en Supabase según la imagen
    console.log('✅ Base de datos Supabase lista');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Supabase:', error.message);
    throw error;
  }
}

async function getChildren() {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM children ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('Error getting children:', error);
    throw error;
  }
}

async function createChild(childData) {
  try {
    const pool = getPool();
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
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating child:', error);
    throw error;
  }
}

async function updateChild(id, childData) {
  try {
    const pool = getPool();
    const query = `
      UPDATE children 
      SET name = $1, nickname = $2, father_name = $3, mother_name = $4, 
          display_name = $5, avatar = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;
    const values = [
      childData.name,
      childData.nickname,
      childData.fatherName,
      childData.motherName,
      childData.displayName,
      childData.avatar,
      id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Niño no encontrado');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating child:', error);
    throw error;
  }
}

async function deleteChild(id) {
  try {
    const pool = getPool();
    const query = `
      DELETE FROM children 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Niño no encontrado');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting child:', error);
    throw error;
  }
}

async function getGames() {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM games ORDER BY name');
    return result.rows;
  } catch (error) {
    console.error('Error getting games:', error);
    throw error;
  }
}

async function createGame(gameData) {
  try {
    const pool = getPool();
    const query = `
      INSERT INTO games (name)
      VALUES ($1)
      RETURNING *
    `;
    const result = await pool.query(query, [gameData.name]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
}

async function updateGame(id, gameData) {
  try {
    const pool = getPool();
    const query = `
      UPDATE games 
      SET name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [gameData.name, id]);
    
    if (result.rows.length === 0) {
      throw new Error('Juego no encontrado');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
}

async function deleteGame(id) {
  try {
    const pool = getPool();
    const query = `
      DELETE FROM games 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Juego no encontrado');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
}

async function getDashboardStats() {
  try {
    const pool = getPool();
    
    // Obtener conteos
    const childrenResult = await pool.query('SELECT COUNT(*) as count FROM children');
    const gamesResult = await pool.query('SELECT COUNT(*) as count FROM games');
    
    // Intentar obtener estadísticas de game_sessions, si no existe usar 0
    let sessionsCount = 0;
    let activeSessionsCount = 0;
    
    try {
      const sessionsResult = await pool.query('SELECT COUNT(*) as count FROM game_sessions');
      const activeSessionsResult = await pool.query('SELECT COUNT(*) as count FROM game_sessions WHERE end_time IS NULL');
      sessionsCount = parseInt(sessionsResult.rows[0].count);
      activeSessionsCount = parseInt(activeSessionsResult.rows[0].count);
    } catch (sessionsError) {
      console.log('Tabla game_sessions no existe aún, usando valores por defecto');
    }
    
    return {
      children: parseInt(childrenResult.rows[0].count),
      games: parseInt(gamesResult.rows[0].count),
      sessions: sessionsCount,
      activeSessions: activeSessionsCount
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}

async function migrateExistingData() {
  try {
    console.log('🔄 Verificando datos existentes en Supabase...');
    const pool = getPool();
    
    // Verificar si ya hay datos
    const existingChildren = await pool.query('SELECT COUNT(*) as count FROM children');
    if (parseInt(existingChildren.rows[0].count) > 0) {
      console.log('✅ Datos ya existen en Supabase');
      return;
    }
    
    console.log('✅ Supabase listo para recibir datos');
  } catch (error) {
    console.error('Error migrating data:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE SESIONES
// ============================================================================

async function getSessions() {
  try {
    const pool = getPool();
    const query = `
      SELECT s.id, 
             s.child_id as "childId", 
             s.game_id as "gameId", 
             s.duration_minutes as duration, 
             s.start_time as start, 
             s.end_time as end, 
             s.created_at, 
             s.updated_at,
             c.name as child_name, 
             g.name as game_name
      FROM game_sessions s
      LEFT JOIN children c ON s.child_id = c.id
      LEFT JOIN games g ON s.game_id = g.id
      ORDER BY s.start_time DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
}

async function getActiveSessions() {
  try {
    const pool = getPool();
    const query = `
      SELECT s.id, 
             s.child_id as "childId", 
             s.game_id as "gameId", 
             s.duration_minutes as duration, 
             s.start_time as start, 
             s.end_time as end, 
             s.created_at, 
             s.updated_at,
             c.name as child_name, 
             g.name as game_name
      FROM game_sessions s
      LEFT JOIN children c ON s.child_id = c.id
      LEFT JOIN games g ON s.game_id = g.id
      WHERE s.end_time IS NULL
      ORDER BY s.start_time DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting active sessions:', error);
    throw error;
  }
}

async function startSession(sessionData) {
  try {
    const pool = getPool();
    
    // Verificar que el niño y el juego existen
    const childExists = await pool.query('SELECT id FROM children WHERE id = $1', [sessionData.child_id]);
    const gameExists = await pool.query('SELECT id FROM games WHERE id = $1', [sessionData.game_id]);
    
    if (childExists.rows.length === 0) {
      throw new Error('Niño no encontrado');
    }
    
    if (gameExists.rows.length === 0) {
      throw new Error('Juego no encontrado');
    }
    
    // Crear la sesión
    const query = `
      INSERT INTO game_sessions (child_id, game_id, duration_minutes, start_time)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, child_id as "childId", game_id as "gameId", duration_minutes as duration, 
                start_time as start, end_time as end, created_at, updated_at
    `;
    const values = [
      sessionData.child_id,
      sessionData.game_id,
      sessionData.duration
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

async function endSession(sessionId) {
  try {
    const pool = getPool();
    
    const query = `
      UPDATE game_sessions 
      SET end_time = NOW()
      WHERE id = $1 AND end_time IS NULL
      RETURNING id, child_id as "childId", game_id as "gameId", duration_minutes as duration, 
                start_time as start, end_time as end, created_at, updated_at
    `;
    
    const result = await pool.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      throw new Error('Sesión no encontrada o ya finalizada');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}

async function extendSession(sessionId, additionalMinutes) {
  try {
    const pool = getPool();
    
    const query = `
      UPDATE game_sessions 
      SET duration_minutes = duration_minutes + $2
      WHERE id = $1 AND end_time IS NULL
      RETURNING id, child_id as "childId", game_id as "gameId", duration_minutes as duration, 
                start_time as start, end_time as end, created_at, updated_at
    `;
    
    const result = await pool.query(query, [sessionId, additionalMinutes]);
    
    if (result.rows.length === 0) {
      throw new Error('Sesión no encontrada o ya finalizada');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error extending session:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTAR FUNCIONES
// ============================================================================

module.exports = {
  initializeDatabase,
  getChildren,
  createChild,
  updateChild,
  deleteChild,
  getGames,
  createGame,
  updateGame,
  deleteGame,
  getDashboardStats,
  migrateExistingData,
  getSessions,
  getActiveSessions,
  startSession,
  endSession,
  extendSession,
  getPool
};
