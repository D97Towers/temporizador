// Vercel Entrypoint - Temporizador de Juegos con JSONBin.io
const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadData, saveData } = require('./jsonbin-storage');

// Control de concurrencia para operaciones de escritura
const writeLock = new Map();
const WRITE_LOCK_TIMEOUT = 30000; // 30 segundos

function acquireWriteLock(resource, timeout = WRITE_LOCK_TIMEOUT) {
  const lockKey = resource;
  const now = Date.now();
  
  // Limpiar locks expirados
  for (const [key, lock] of writeLock.entries()) {
    if (now - lock.timestamp > timeout) {
      writeLock.delete(key);
    }
  }
  
  // Verificar si ya existe un lock
  if (writeLock.has(lockKey)) {
    return false; // Lock no disponible
  }
  
  // Crear nuevo lock
  writeLock.set(lockKey, {
    timestamp: now,
    resource: lockKey
  });
  
  return true; // Lock adquirido
}

function releaseWriteLock(resource) {
  writeLock.delete(resource);
}

// Rate limiting simple (sin dependencias externas)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests por minuto (más realista)

function rateLimit(req, res, next) {
  // En Vercel, usar User-Agent + IP para mejor identificación
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const clientId = `${clientIP}-${userAgent}`;
  const now = Date.now();
  
  // Limpiar entradas expiradas
  if (rateLimitMap.has(clientId)) {
    const requests = rateLimitMap.get(clientId).filter(time => now - time < RATE_LIMIT_WINDOW);
    if (requests.length === 0) {
      rateLimitMap.delete(clientId);
    } else {
      rateLimitMap.set(clientId, requests);
    }
  }
  
  // Verificar límite
  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, []);
  }
  
  const requests = rateLimitMap.get(clientId);
  
  // Límites diferentes para lectura vs escritura
  const isReadRequest = req.method === 'GET';
  const maxRequests = isReadRequest ? 120 : 30; // 120 lecturas, 30 escrituras por minuto
  const requestType = isReadRequest ? 'lectura' : 'escritura';
  
  if (requests.length >= maxRequests) {
    return res.status(429).json({ 
      error: `Demasiadas solicitudes de ${requestType}. Intenta de nuevo en un minuto.`,
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000),
      limitType: requestType
    });
  }
  
  // Agregar request actual
  requests.push(now);
  next();
}

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(rateLimit); // Aplicar rate limiting a todas las rutas

// Middleware de validación
function validateChild(req, res, next) {
  const { name, nickname, fatherName, motherName } = req.body;
  
  // Validar nombre (requerido)
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  // Sanitizar y validar longitud
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 50) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres' });
  }
  
  // Validar caracteres permitidos (solo letras, espacios, guiones y apostrofes)
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-']+$/.test(cleanName)) {
    return res.status(400).json({ error: 'El nombre solo puede contener letras, espacios, guiones y apostrofes' });
  }
  
  // Validar campos opcionales
  if (nickname && (typeof nickname !== 'string' || nickname.trim().length > 30)) {
    return res.status(400).json({ error: 'El apodo debe ser una cadena de máximo 30 caracteres' });
  }
  
  if (fatherName && (typeof fatherName !== 'string' || fatherName.trim().length > 50)) {
    return res.status(400).json({ error: 'El nombre del padre debe ser máximo 50 caracteres' });
  }
  
  if (motherName && (typeof motherName !== 'string' || motherName.trim().length > 50)) {
    return res.status(400).json({ error: 'El nombre de la madre debe ser máximo 50 caracteres' });
  }
  
  // Agregar valores sanitizados al request
  req.body.name = cleanName;
  req.body.nickname = nickname ? nickname.trim() : null;
  req.body.fatherName = fatherName ? fatherName.trim() : null;
  req.body.motherName = motherName ? motherName.trim() : null;
  
  next();
}

function validateSession(req, res, next) {
  const { childId, gameId, duration } = req.body;
  
  // Validar existencia de campos
  if (!childId || !gameId || !duration) {
    return res.status(400).json({ error: 'childId, gameId y duration son requeridos' });
  }
  
  // Validar tipos de datos
  const childIdNum = parseInt(childId);
  const gameIdNum = parseInt(gameId);
  const durationNum = parseInt(duration);
  
  if (isNaN(childIdNum) || isNaN(gameIdNum) || isNaN(durationNum)) {
    return res.status(400).json({ error: 'Los IDs y duración deben ser números válidos' });
  }
  
  // Validar rangos
  if (childIdNum <= 0 || gameIdNum <= 0) {
    return res.status(400).json({ error: 'Los IDs deben ser números positivos' });
  }
  
  if (durationNum < 1 || durationNum > 180) {
    return res.status(400).json({ error: 'La duración debe estar entre 1 y 180 minutos' });
  }
  
  // Validar que sean enteros
  if (!Number.isInteger(childIdNum) || !Number.isInteger(gameIdNum) || !Number.isInteger(durationNum)) {
    return res.status(400).json({ error: 'Los valores deben ser números enteros' });
  }
  
  // Agregar valores validados al request
  req.body.childId = childIdNum;
  req.body.gameId = gameIdNum;
  req.body.duration = durationNum;
  
  next();
}

// Rutas API

// Obtener todos los niños
app.get('/children', async (req, res) => {
  try {
    const data = await loadData();
    console.log('GET /children - returning', data.children.length, 'children');
    res.json(data.children);
  } catch (error) {
    console.error('Error in GET /children:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo niño
app.post('/children', validateChild, async (req, res) => {
  // Adquirir lock para operación de escritura
  if (!acquireWriteLock('children')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const data = await loadData();
    const { name, nickname, fatherName, motherName } = req.body;
    
    const trimmedName = name.trim();
    const existingChild = data.children.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingChild) {
      return res.status(400).json({ error: 'Ya existe un niño con ese nombre' });
    }
    
    const displayName = trimmedName + (nickname ? ` (${nickname.trim()})` : '');
    const avatar = trimmedName.charAt(0).toUpperCase();
    
    const newChild = {
      id: data.nextChildId++,
      name: trimmedName,
      nickname: nickname ? nickname.trim() : null,
      fatherName: fatherName ? fatherName.trim() : null,
      motherName: motherName ? motherName.trim() : null,
      displayName,
      avatar,
      totalSessions: 0,
      totalTimePlayed: 0,
      createdAt: new Date().toISOString()
    };
    
    data.children.push(newChild);
    await saveData(data);
    
    console.log('Child created:', newChild.name);
    res.status(201).json(newChild);
  } catch (error) {
    console.error('Error creating child:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    // Liberar lock
    releaseWriteLock('children');
  }
});

// Editar niño existente
app.put('/children/:id', async (req, res) => {
  try {
    const data = await loadData();
    const childId = parseInt(req.params.id);
    const { name, nickname, fatherName, motherName } = req.body;
    
    const child = data.children.find(c => c.id === childId);
    if (!child) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    
    const trimmedName = name.trim();
    
    // Verificar que no haya otro niño con el mismo nombre (excepto el actual)
    const existingChild = data.children.find(c => c.id !== childId && c.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingChild) {
      return res.status(400).json({ error: 'Ya existe otro niño con ese nombre' });
    }
    
    // Actualizar datos del niño
    child.name = trimmedName;
    child.nickname = nickname ? nickname.trim() : null;
    child.fatherName = fatherName ? fatherName.trim() : null;
    child.motherName = motherName ? motherName.trim() : null;
    child.displayName = trimmedName + (nickname ? ` (${nickname.trim()})` : '');
    child.avatar = trimmedName.charAt(0).toUpperCase();
    
    await saveData(data);
    
    console.log('Child updated:', child.name);
    res.json(child);
  } catch (error) {
    console.error('Error updating child:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los juegos
app.get('/games', async (req, res) => {
  try {
    const data = await loadData();
    console.log('GET /games - returning', data.games.length, 'games');
    res.json(data.games);
  } catch (error) {
    console.error('Error in GET /games:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo juego
app.post('/games', async (req, res) => {
  try {
    const data = await loadData();
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const newGame = {
      id: data.nextGameId++,
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    
    data.games.push(newGame);
    await saveData(data);
    
    console.log('Game created:', newGame.name);
    res.status(201).json(newGame);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener sesiones activas
app.get('/sessions/active', async (req, res) => {
  try {
    const data = await loadData();
    const activeSessions = data.sessions.filter(s => !s.endTime);
    
    const sessionsWithDetails = activeSessions.map(session => {
      const child = data.children.find(c => c.id === session.childId);
      const game = data.games.find(g => g.id === session.gameId);
      
      return {
        ...session,
        childName: child ? child.name : 'Niño desconocido',
        childDisplayName: child ? child.displayName : 'Niño desconocido',
        childFatherName: child ? child.fatherName : null,
        childMotherName: child ? child.motherName : null,
        gameName: game ? game.name : 'Juego desconocido'
      };
    });
    
    console.log('GET /sessions/active - returning', sessionsWithDetails.length, 'active sessions');
    res.json(sessionsWithDetails);
  } catch (error) {
    console.error('Error in GET /sessions/active:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar niño
app.delete('/children/:id', async (req, res) => {
  // Adquirir lock para operación de escritura
  if (!acquireWriteLock('children')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const data = await loadData();
    const childId = parseInt(req.params.id);
    
    const childIndex = data.children.findIndex(c => c.id === childId);
    if (childIndex === -1) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    
    // Eliminar el niño
    const deletedChild = data.children.splice(childIndex, 1)[0];
    
    // Eliminar sesiones relacionadas
    data.sessions = data.sessions.filter(s => s.childId !== childId);
    
    await saveData(data);
    
    console.log('Child deleted:', deletedChild.name);
    res.json({ message: 'Niño eliminado exitosamente', deletedChild });
  } catch (error) {
    console.error('Error deleting child:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    // Liberar lock
    releaseWriteLock('children');
  }
});

// Eliminar juego
app.delete('/games/:id', async (req, res) => {
  // Adquirir lock para operación de escritura
  if (!acquireWriteLock('games')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const data = await loadData();
    const gameId = parseInt(req.params.id);
    
    const gameIndex = data.games.findIndex(g => g.id === gameId);
    if (gameIndex === -1) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    // Verificar si hay sesiones activas con este juego
    const activeSessions = data.sessions.filter(s => s.gameId === gameId && !s.endTime);
    if (activeSessions.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un juego que tiene sesiones activas',
        activeSessions: activeSessions.length
      });
    }
    
    // Eliminar el juego
    const deletedGame = data.games.splice(gameIndex, 1)[0];
    
    // Eliminar sesiones relacionadas
    data.sessions = data.sessions.filter(s => s.gameId !== gameId);
    
    await saveData(data);
    
    console.log('Game deleted:', deletedGame.name);
    res.json({ message: 'Juego eliminado exitosamente', deletedGame });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    // Liberar lock
    releaseWriteLock('games');
  }
});

// Iniciar sesión
app.post('/sessions/start', validateSession, async (req, res) => {
  // Adquirir lock para operación de escritura
  if (!acquireWriteLock('sessions')) {
    return res.status(429).json({ error: 'Operación en progreso. Intenta de nuevo en unos segundos.' });
  }
  
  try {
    const data = await loadData();
    const { childId, gameId, duration } = req.body;
    
    const child = data.children.find(c => c.id === parseInt(childId));
    const game = data.games.find(g => g.id === parseInt(gameId));
    
    if (!child || !game) {
      return res.status(400).json({ error: 'Niño o juego no encontrado' });
    }
    
    const session = {
      id: data.nextSessionId++,
      childId: parseInt(childId),
      gameId: parseInt(gameId),
      startTime: Date.now(),
      endTime: null,
      duration: parseInt(duration),
      createdAt: new Date().toISOString()
    };
    
    data.sessions.push(session);
    await saveData(data);
    
    console.log('Session started:', session.id);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    // Liberar lock
    releaseWriteLock('sessions');
  }
});

// Finalizar sesión
app.post('/sessions/:id/end', async (req, res) => {
  try {
    const data = await loadData();
    const sessionId = parseInt(req.params.id);
    
    const session = data.sessions.find(s => s.id === sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    if (session.endTime) {
      return res.status(400).json({ error: 'La sesión ya ha terminado' });
    }
    
    session.endTime = Date.now();
    
    // Actualizar estadísticas del niño
    const child = data.children.find(c => c.id === session.childId);
    if (child) {
      child.totalSessions++;
      child.totalTimePlayed += session.duration;
    }
    
    await saveData(data);
    
    console.log('Session ended:', sessionId);
    res.json(session);
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Extender sesión
app.post('/sessions/extend', async (req, res) => {
  try {
    const data = await loadData();
    const { sessionId, additionalTime } = req.body;
    
    const session = data.sessions.find(s => s.id === parseInt(sessionId));
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    
    if (session.endTime) {
      return res.status(400).json({ error: 'La sesión ya ha terminado' });
    }
    
    // Extender la duración de la sesión
    session.duration += parseInt(additionalTime);
    
    await saveData(data);
    
    console.log('Session extended:', sessionId, 'by', additionalTime, 'minutes');
    res.json(session);
  } catch (error) {
    console.error('Error extending session:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener historial de sesiones
app.get('/sessions', async (req, res) => {
  try {
    const data = await loadData();
    
    const sessionsWithDetails = data.sessions.map(session => {
      const child = data.children.find(c => c.id === session.childId);
      const game = data.games.find(g => g.id === session.gameId);
      
      return {
        ...session,
        childName: child ? child.name : 'Niño desconocido',
        childDisplayName: child ? child.displayName : 'Niño desconocido',
        childFatherName: child ? child.fatherName : null,
        childMotherName: child ? child.motherName : null,
        gameName: game ? game.name : 'Juego desconocido'
      };
    });
    
    console.log('GET /sessions - returning', sessionsWithDetails.length, 'sessions');
    res.json(sessionsWithDetails);
  } catch (error) {
    console.error('Error in GET /sessions:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de estado
app.get('/admin/status', async (req, res) => {
  try {
    const data = await loadData();
    res.json({
      status: 'ok',
      children: data.children.length,
      games: data.games.length,
      sessions: data.sessions.length,
      activeSessions: data.sessions.filter(s => !s.endTime).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de diagnóstico para verificar configuración
app.get('/admin/diagnostic', async (req, res) => {
  try {
    const data = await loadData();
    res.json({
      status: 'ok',
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      storage: process.env.JSONBIN_API_KEY ? 'JSONBin.io' : 'Local',
      jsonbinConfigured: !!process.env.JSONBIN_API_KEY,
      jsonbinBinId: process.env.JSONBIN_BIN_ID ? 'Configured' : 'Not configured',
      data: {
        children: data.children.length,
        games: data.games.length,
        sessions: data.sessions.length,
        activeSessions: data.sessions.filter(s => !s.endTime).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para migrar a JSONBin.io
app.post('/admin/migrate-to-jsonbin', async (req, res) => {
  try {
    const { migrateToJsonBin } = require('./jsonbin-storage');
    const success = await migrateToJsonBin();
    
    if (success) {
      res.json({ message: 'Migración a JSONBin.io completada exitosamente' });
    } else {
      res.status(500).json({ error: 'Error durante la migración' });
    }
  } catch (error) {
    console.error('Error in migration:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
  console.log(`Almacenamiento: ${process.env.JSONBIN_API_KEY ? 'JSONBin.io' : 'Local'}`);
});

module.exports = app;
