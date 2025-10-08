// Vercel Entrypoint - Temporizador de Juegos con Supabase
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar base de datos Supabase
const db = require('./supabase-database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Control de concurrencia simple
const writeLock = new Map();
const WRITE_LOCK_TIMEOUT = 30000;

function acquireWriteLock(resource) {
  if (writeLock.has(resource)) {
    return false;
  }
  writeLock.set(resource, Date.now());
  setTimeout(() => writeLock.delete(resource), WRITE_LOCK_TIMEOUT);
  return true;
}

function releaseWriteLock(resource) {
  writeLock.delete(resource);
}

// Validaciones
function validateChild(req, res, next) {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  next();
}

// ============================================================================
// RUTAS API
// ============================================================================

// Obtener todos los niños
app.get('/children', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const children = await db.getChildren();
    console.log('GET /children - returning', children.length, 'children');
    res.json(children);
  } catch (error) {
    console.error('Error in GET /children:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo niño
app.post('/children', validateChild, async (req, res) => {
  if (!acquireWriteLock('children')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const { name, nickname, fatherName, motherName } = req.body;
    
    const trimmedName = name.trim();
    const displayName = trimmedName + (nickname ? ` (${nickname.trim()})` : '');
    const avatar = trimmedName.charAt(0).toUpperCase();
    
    const newChild = await db.createChild({
      name: trimmedName,
      nickname: nickname ? nickname.trim() : null,
      fatherName: fatherName ? fatherName.trim() : null,
      motherName: motherName ? motherName.trim() : null,
      displayName,
      avatar
    });
    
    console.log('Child created:', newChild.name);
    res.status(201).json(newChild);
  } catch (error) {
    console.error('Error creating child:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Ya existe un niño con ese nombre' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } finally {
    releaseWriteLock('children');
  }
});

// Obtener todos los juegos
app.get('/games', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const games = await db.getGames();
    console.log('GET /games - returning', games.length, 'games');
    res.json(games);
  } catch (error) {
    console.error('Error in GET /games:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo juego
app.post('/games', async (req, res) => {
  if (!acquireWriteLock('games')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del juego es requerido' });
    }
    
    const newGame = await db.createGame({
      name: name.trim()
    });
    
    console.log('Game created:', newGame.name);
    res.status(201).json(newGame);
  } catch (error) {
    console.error('Error creating game:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Ya existe un juego con ese nombre' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } finally {
    releaseWriteLock('games');
  }
});

// ============================================================================
// ENDPOINTS DE PRUEBA
// ============================================================================

// Endpoint de prueba simple
app.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor Supabase funcionando',
    environment: process.env.VERCEL ? 'Vercel' : 'Local',
    databaseUrl: process.env.DATABASE_URL ? 'Configurada' : 'No configurada',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de prueba de base de datos
app.get('/test-db', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const stats = await db.getDashboardStats();
    res.json({
      status: 'ok',
      message: 'Base de datos Supabase funcionando',
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error de base de datos Supabase',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de estado
app.get('/admin/status', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json({
      status: 'ok',
      children: stats.children,
      games: stats.games,
      sessions: stats.sessions,
      activeSessions: stats.activeSessions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      code: error.code
    });
  }
});

// ============================================================================
// ENDPOINTS DE SESIONES
// ============================================================================

// Obtener todas las sesiones
app.get('/sessions', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const sessions = await db.getSessions();
    console.log('GET /sessions - returning', sessions.length, 'sessions');
    res.json(sessions);
  } catch (error) {
    console.error('Error in GET /sessions:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener sesiones activas
app.get('/sessions/active', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const activeSessions = await db.getActiveSessions();
    console.log('GET /sessions/active - returning', activeSessions.length, 'active sessions');
    res.json(activeSessions);
  } catch (error) {
    console.error('Error in GET /sessions/active:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar una sesión
app.post('/sessions/start', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    
    const { child_id, game_id, duration } = req.body;
    
    if (!child_id || !game_id || !duration) {
      return res.status(400).json({ error: 'child_id, game_id y duration son requeridos' });
    }
    
    const sessionData = { child_id, game_id, duration };
    const newSession = await db.startSession(sessionData);
    
    console.log('POST /sessions/start - created session:', newSession.id);
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error in POST /sessions/start:', error);
    if (error.message === 'Niño no encontrado' || error.message === 'Juego no encontrado') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Finalizar una sesión
app.post('/sessions/end', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'session_id es requerido' });
    }
    
    const endedSession = await db.endSession(session_id);
    
    console.log('POST /sessions/end - ended session:', session_id);
    res.json(endedSession);
  } catch (error) {
    console.error('Error in POST /sessions/end:', error);
    if (error.message === 'Sesión no encontrada o ya finalizada') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Extender una sesión
app.post('/sessions/extend', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    
    const { session_id, additional_minutes } = req.body;
    
    if (!session_id || !additional_minutes) {
      return res.status(400).json({ error: 'session_id y additional_minutes son requeridos' });
    }
    
    const extendedSession = await db.extendSession(session_id, additional_minutes);
    
    console.log('POST /sessions/extend - extended session:', session_id, 'by', additional_minutes, 'minutes');
    res.json(extendedSession);
  } catch (error) {
    console.error('Error in POST /sessions/extend:', error);
    if (error.message === 'Sesión no encontrada o ya finalizada') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

// Inicialización lazy de la base de datos
let dbInitialized = false;
async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    try {
      console.log('🔄 Inicializando base de datos Supabase...');
      await db.initializeDatabase();
      await db.migrateExistingData();
      dbInitialized = true;
      console.log('✅ Base de datos Supabase inicializada');
    } catch (error) {
      console.error('❌ Error inicializando Supabase:', error.message);
      throw error;
    }
  }
}

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Supabase corriendo en puerto ${PORT}`);
  console.log(`📊 Entorno: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
  console.log(`💾 Base de datos: Supabase (PostgreSQL)`);
});

module.exports = app;
