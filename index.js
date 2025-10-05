// Vercel Entrypoint - Temporizador de Juegos con JSONBin.io
const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadData, saveData } = require('./jsonbin-storage');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware de validación
function validateChild(req, res, next) {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  next();
}

function validateSession(req, res, next) {
  const { childId, gameId, duration } = req.body;
  if (!childId || !gameId || !duration) {
    return res.status(400).json({ error: 'childId, gameId y duration son requeridos' });
  }
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

// Iniciar sesión
app.post('/sessions/start', validateSession, async (req, res) => {
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
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      storage: process.env.JSONBIN_API_KEY ? 'JSONBin.io' : 'Local',
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
