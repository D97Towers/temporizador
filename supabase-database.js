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

async function getDashboardStats() {
  try {
    const pool = getPool();
    
    // Obtener conteos
    const childrenResult = await pool.query('SELECT COUNT(*) as count FROM children');
    const gamesResult = await pool.query('SELECT COUNT(*) as count FROM games');
    const sessionsResult = await pool.query('SELECT COUNT(*) as count FROM sessions');
    const activeSessionsResult = await pool.query('SELECT COUNT(*) as count FROM sessions WHERE end_time IS NULL');
    
    return {
      children: parseInt(childrenResult.rows[0].count),
      games: parseInt(gamesResult.rows[0].count),
      sessions: parseInt(sessionsResult.rows[0].count),
      activeSessions: parseInt(activeSessionsResult.rows[0].count)
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
// EXPORTAR FUNCIONES
// ============================================================================

module.exports = {
  initializeDatabase,
  getChildren,
  createChild,
  getGames,
  createGame,
  getDashboardStats,
  migrateExistingData
};
