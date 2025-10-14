// Vercel Entrypoint - Temporizador de Juegos con Supabase
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

// Importar base de datos Supabase
const db = require('./supabase-database');

const app = express();

// Middleware base
app.use(cors());
app.use(express.json());

// ============================================================================
// Acceso protegido opcional por contraseña (sin costo)
// - Activado solo si APP_ACCESS_PASSWORD está definido
// - Usa cookie HttpOnly firmada para autorizar
// ============================================================================
const ACCESS_COOKIE = 'ACCESS_TOKEN';
const APP_PASSWORD = process.env.APP_ACCESS_PASSWORD || '';
const APP_SECRET = process.env.APP_ACCESS_SECRET || 'temporary-secret-change-me';

// Debug: Log environment variables at startup
console.log('🚀 STARTUP DEBUG:', {
  NODE_ENV: process.env.NODE_ENV,
  APP_ACCESS_PASSWORD: process.env.APP_ACCESS_PASSWORD ? 'SET' : 'NOT SET',
  APP_ACCESS_SECRET: process.env.APP_ACCESS_SECRET ? 'SET' : 'NOT SET',
  APP_PASSWORD: APP_PASSWORD ? 'SET' : 'NOT SET',
  APP_SECRET: APP_SECRET ? 'SET' : 'NOT SET'
});

function generateToken() {
  // Token estable por despliegue: HMAC(password)
  return crypto.createHmac('sha256', APP_SECRET).update(APP_PASSWORD).digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const [k, v] = part.split('=').map(s => (s || '').trim());
    if (k) acc[k] = decodeURIComponent(v || '');
    return acc;
  }, {});
}

function isWhitelisted(req) {
  const url = req.url || '';
  // Endpoints públicos mínimos para poder mostrar login y recursos estáticos del login
  return (
    url.startsWith('/login') ||
    url.startsWith('/favicon') ||
    url.startsWith('/assets/') ||
    url.startsWith('/public/login') ||
    url.endsWith('.css') ||
    url.endsWith('.js') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.svg')
  );
}

function authGate(req, res, next) {
  console.log('🔍 AUTH DEBUG:', { 
    APP_PASSWORD: APP_PASSWORD ? 'SET' : 'NOT SET',
    APP_SECRET: APP_SECRET ? 'SET' : 'NOT SET',
    url: req.url,
    hasPassword: !!APP_PASSWORD
  });
  
  if (!APP_PASSWORD) {
    console.log('❌ No password configured, skipping auth');
    return next(); // Desactivado si no hay password configurada
  }

  // Permitir rutas de login y recursos públicos del login
  if (isWhitelisted(req)) return next();

  const token = parseCookies(req)[ACCESS_COOKIE];
  if (token && token === generateToken()) return next();

  // Si es API, responder 401; si es HTML, redirigir a login
  const isAPIRequest = req.path && (req.path.startsWith('/children') || req.path.startsWith('/games') || req.path.startsWith('/sessions') || req.path.startsWith('/login') || req.path.startsWith('/logout'));
  
  if (isAPIRequest) {
    console.log('🔒 API request blocked:', req.path);
    return res.status(401).json({ error: 'No autorizado' });
  }

  console.log('🔒 Redirecting to login for:', req.path);
  res.setHeader('Cache-Control', 'no-store');
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
}

app.use(authGate);

// Rutas de login/logout
app.post('/login', (req, res) => {
  if (!APP_PASSWORD) return res.status(404).json({ error: 'Login deshabilitado' });
  const { password } = req.body || {};
  if (!password || password !== APP_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña inválida' });
  }
  res.cookie?.(ACCESS_COOKIE, generateToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 1000 * 60 * 60 * 12 // 12h
  });
  // fallback si no existe res.cookie (sin cookie-parser): set-cookie manual
  if (!res.getHeader('Set-Cookie')) {
    res.setHeader('Set-Cookie', `${ACCESS_COOKIE}=${generateToken()}; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}; Path=/; Secure`);
  }
  return res.json({ ok: true });
});

app.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${ACCESS_COOKIE}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure`);
  res.status(200).json({ ok: true });
});

// Servir estáticos después del gate
// IMPORTANTE: Solo servir archivos estáticos DESPUÉS de la autenticación
app.use('/public', express.static('public'));

// Ruta específica para servir index.html (después de autenticación)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

// Obtener todos los niños con tiempo total jugado
app.get('/children', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const children = await db.getChildren();
    
    // Calcular tiempo total jugado para cada niño
    const childrenWithTime = await Promise.all(children.map(async (child) => {
      try {
        const totalTime = await db.getChildTotalTimePlayed(child.id);
        return {
          ...child,
          totalTimePlayed: totalTime || 0
        };
      } catch (error) {
        console.error(`Error calculating total time for child ${child.id}:`, error);
        return {
          ...child,
          totalTimePlayed: 0
        };
      }
    }));
    
    console.log('GET /children - returning', childrenWithTime.length, 'children with total time');
    res.json(childrenWithTime);
  } catch (error) {
    console.error('Error in GET /children:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo niño
app.post('/children', validateChild, async (req, res) => {
  console.log('POST /children - Request received:', req.body);
  
  if (!acquireWriteLock('children')) {
    console.log('POST /children - Lock acquired, proceeding...');
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    await ensureDatabaseInitialized();
    console.log('POST /children - Database initialized');
    
    const { name, nickname, fatherName, motherName } = req.body;
    console.log('POST /children - Processing data:', { name, nickname, fatherName, motherName });
    
    const trimmedName = name.trim();
    const displayName = trimmedName + (nickname ? ` (${nickname.trim()})` : '');
    const avatar = trimmedName.charAt(0).toUpperCase();
    
    console.log('POST /children - Prepared data:', { trimmedName, displayName, avatar });
    
    const newChild = await db.createChild({
      name: trimmedName,
      nickname: nickname ? nickname.trim() : null,
      fatherName: fatherName ? fatherName.trim() : null,
      motherName: motherName ? motherName.trim() : null,
      displayName,
      avatar
    });
    
    console.log('POST /children - Child created successfully:', newChild);
    res.status(201).json(newChild);
  } catch (error) {
    console.error('POST /children - Error creating child:', error);
    console.error('POST /children - Error stack:', error.stack);
    
    if (error.code === '23505') { // Unique constraint violation
      console.log('POST /children - Duplicate name error');
      res.status(400).json({ error: 'Ya existe un niño con ese nombre' });
    } else {
      console.log('POST /children - Generic error, returning 500');
      res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
  } finally {
    releaseWriteLock('children');
    console.log('POST /children - Lock released');
  }
});

// Actualizar un niño
app.put('/children/:id', async (req, res) => {
  if (!acquireWriteLock('children')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const { id } = req.params;
    const { name, nickname, father_name, mother_name } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de niño inválido' });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del niño es requerido' });
    }
    
    const trimmedName = name.trim();
    const displayName = nickname ? `${trimmedName} (${nickname.trim()})` : trimmedName;
    const avatar = trimmedName.charAt(0).toUpperCase();
    
    const updatedChild = await db.updateChild(parseInt(id), {
      name: trimmedName,
      nickname: nickname ? nickname.trim() : null,
      fatherName: father_name ? father_name.trim() : null,
      motherName: mother_name ? mother_name.trim() : null,
      displayName,
      avatar
    });
    
    console.log('Child updated:', updatedChild.name);
    res.json(updatedChild);
  } catch (error) {
    console.error('Error updating child:', error);
    if (error.message === 'Niño no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.code === '23505') {
      res.status(400).json({ error: 'Ya existe un niño con ese nombre' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } finally {
    releaseWriteLock('children');
  }
});

// Eliminar un niño
app.delete('/children/:id', async (req, res) => {
  if (!acquireWriteLock('children')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de niño inválido' });
    }
    
    await db.deleteChild(parseInt(id));
    
    console.log('Child deleted:', id);
    res.json({ message: 'Niño eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting child:', error);
    if (error.message === 'Niño no encontrado') {
      res.status(404).json({ error: error.message });
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

// Actualizar un juego
app.put('/games/:id', async (req, res) => {
  if (!acquireWriteLock('games')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de juego inválido' });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del juego es requerido' });
    }
    
    const updatedGame = await db.updateGame(parseInt(id), {
      name: name.trim()
    });
    
    console.log('Game updated:', updatedGame.name);
    res.json(updatedGame);
  } catch (error) {
    console.error('Error updating game:', error);
    if (error.message === 'Juego no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.code === '23505') {
      res.status(400).json({ error: 'Ya existe un juego con ese nombre' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  } finally {
    releaseWriteLock('games');
  }
});

// Eliminar un juego
app.delete('/games/:id', async (req, res) => {
  if (!acquireWriteLock('games')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de juego inválido' });
    }
    
    await db.deleteGame(parseInt(id));
    
    console.log('Game deleted:', id);
    res.json({ message: 'Juego eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting game:', error);
    if (error.message === 'Juego no encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'No se puede eliminar el juego porque tiene sesiones asociadas' });
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

// Endpoint de estadísticas del dashboard
app.get('/admin/stats', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const stats = await db.getDashboardStats();
    console.log('GET /admin/stats - returning stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error in GET /admin/stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      message: error.message 
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

// Finalizar una sesión (por body)
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

// Finalizar una sesión (por URL parameter)
app.post('/sessions/:id/end', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    
    const { id } = req.params;
    const session_id = parseInt(id);
    
    if (!session_id || isNaN(session_id)) {
      return res.status(400).json({ error: 'ID de sesión inválido' });
    }
    
    const endedSession = await db.endSession(session_id);
    
    console.log('POST /sessions/:id/end - ended session:', session_id);
    res.json(endedSession);
  } catch (error) {
    console.error('Error in POST /sessions/:id/end:', error);
    if (error.message === 'Sesión no encontrada o ya finalizada') {
      res.status(404).json({ error: error.message });
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

// Endpoint de diagnóstico de base de datos
app.get('/admin/diagnostic', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const pool = db.getPool();
    
    // Listar tablas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Verificar estructura de tabla sessions si existe
    let sessionsStructure = null;
    if (tables.includes('sessions')) {
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
      `);
      
      sessionsStructure = structureResult.rows;
    }
    
    // Verificar RLS
    let rlsEnabled = null;
    if (tables.includes('sessions')) {
      const rlsResult = await pool.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'sessions'
      `);
      
      rlsEnabled = rlsResult.rows.length > 0 ? rlsResult.rows[0].relrowsecurity : false;
    }
    
    res.json({
      status: 'ok',
      tables: tables,
      sessionsStructure: sessionsStructure,
      rlsEnabled: rlsEnabled,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in /admin/diagnostic:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      code: error.code
    });
  }
});

// Endpoint para crear tabla de sesiones de juegos
app.post('/admin/create-game-sessions-table', async (req, res) => {
  try {
    await ensureDatabaseInitialized();
    const pool = db.getPool();
    
    // Verificar si ya existe la tabla
    const checkResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'game_sessions'
    `);
    
    if (checkResult.rows.length > 0) {
      return res.json({
        status: 'ok',
        message: 'Tabla "game_sessions" ya existe',
        action: 'none'
      });
    }
    
    // Crear la tabla
    await pool.query(`
      CREATE TABLE game_sessions (
        id SERIAL PRIMARY KEY,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        duration_minutes INTEGER NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        end_time TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Habilitar RLS
    await pool.query('ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY');
    
    // Crear políticas permisivas
    await pool.query(`
      CREATE POLICY "Allow all operations on game_sessions" 
      ON game_sessions FOR ALL 
      USING (true)
    `);
    
    // Crear índices
    await pool.query(`CREATE INDEX idx_game_sessions_child_id ON game_sessions(child_id)`);
    await pool.query(`CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id)`);
    await pool.query(`CREATE INDEX idx_game_sessions_active ON game_sessions(end_time) WHERE end_time IS NULL`);
    
    res.json({
      status: 'ok',
      message: 'Tabla "game_sessions" creada exitosamente',
      action: 'created'
    });
    
  } catch (error) {
    console.error('Error creating game_sessions table:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      code: error.code
    });
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
