import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// Sistema de persistencia híbrido: JSON local + variables de entorno para Vercel
const dataFile = path.join(__dirname, '../data.json');

// Función para cargar datos desde variables de entorno (Vercel) o archivo (local)
function loadData() {
  try {
    // En Vercel, intentar cargar desde variables de entorno
    if (process.env.VERCEL && process.env.APP_DATA) {
      const data = JSON.parse(process.env.APP_DATA);
      return {
        children: data.children || [],
        games: data.games || [],
        sessions: data.sessions || [],
        nextChildId: data.nextChildId || 1,
        nextGameId: data.nextGameId || 1,
        nextSessionId: data.nextSessionId || 1
      };
    }
    
    // En local, cargar desde archivo
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      return {
        children: data.children || [],
        games: data.games || [],
        sessions: data.sessions || [],
        nextChildId: data.nextChildId || 1,
        nextGameId: data.nextGameId || 1,
        nextSessionId: data.nextSessionId || 1
      };
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  
  // Datos por defecto
  return {
    children: [],
    games: [],
    sessions: [],
    nextChildId: 1,
    nextGameId: 1,
    nextSessionId: 1
  };
}

// Función para guardar datos
function saveData(data: any) {
  try {
    // En Vercel, no podemos guardar archivos, solo log para debug
    if (process.env.VERCEL) {
      console.log('Data updated (Vercel):', JSON.stringify(data, null, 2));
      return;
    }
    
    // En local, guardar en archivo
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Cargar datos iniciales
let data = loadData();

// Función para inicializar datos de prueba en Vercel si no hay datos
function initializeDefaultData() {
  if (process.env.VERCEL && data.children.length === 0) {
    console.log('Initializing default data for Vercel...');
    data.children = [
      { id: 1, name: 'David' },
      { id: 2, name: 'Santiago' }
    ];
    data.games = [
      { id: 1, name: 'bici' },
      { id: 2, name: 'videojuegos' }
    ];
    data.nextChildId = 3;
    data.nextGameId = 3;
    data.nextSessionId = 1;
    saveData(data);
  }
}

// Inicializar datos por defecto
initializeDefaultData();

type Child = { id: number; name: string };
type Game = { id: number; name: string };
type Session = { id: number; childId: number; gameId: number; start: number; end?: number; duration: number };

// Middleware de validación
const validateChild = (req: any, res: any, next: any) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres' });
  }
  next();
};

const validateGame = (req: any, res: any, next: any) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres' });
  }
  next();
};

const validateSession = (req: any, res: any, next: any) => {
  const { childId, gameId, duration } = req.body;
  if (!childId || !gameId || !duration) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  if (duration < 1 || duration > 180) {
    return res.status(400).json({ error: 'La duración debe estar entre 1 y 180 minutos' });
  }
  next();
};

// CRUD Niños
app.post('/children', validateChild, (req, res) => {
  try {
    const child = { id: data.nextChildId++, name: req.body.name.trim() };
    data.children.push(child);
    saveData(data);
    res.status(201).json(child);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/children', (_, res) => {
  try {
    res.json(data.children);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/children/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = data.children.findIndex((c: Child) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    data.children.splice(index, 1);
    saveData(data);
    res.json({ message: 'Niño eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CRUD Juegos
app.post('/games', validateGame, (req, res) => {
  try {
    const game = { id: data.nextGameId++, name: req.body.name.trim() };
    data.games.push(game);
    saveData(data);
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/games', (_, res) => {
  try {
    res.json(data.games);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/games/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = data.games.findIndex((g: Game) => g.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    data.games.splice(index, 1);
    saveData(data);
    res.json({ message: 'Juego eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar sesión de juego con duración personalizada
app.post('/sessions/start', validateSession, (req, res) => {
  try {
    const { childId, gameId, duration } = req.body;
    
    // Verificar que el niño y el juego existen
    const child = data.children.find((c: Child) => c.id === childId);
    const game = data.games.find((g: Game) => g.id === gameId);
    
    if (!child) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    // Verificar si el niño ya tiene una sesión activa
    const activeSession = data.sessions.find((s: Session) => s.childId === childId && !s.end);
    if (activeSession) {
      return res.status(400).json({ error: 'El niño ya tiene una sesión activa' });
    }
    
    const session = { 
      id: data.nextSessionId++, 
      childId, 
      gameId, 
      start: Date.now(), 
      duration: Number(duration) 
    };
    data.sessions.push(session);
    saveData(data);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Finalizar sesión de juego
app.post('/sessions/end', (req, res) => {
  try {
    const { sessionId: sid } = req.body;
    const session = data.sessions.find((s: Session) => s.id === sid && !s.end);
    
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
    }
    
    session.end = Date.now();
    saveData(data);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver sesiones activas
app.get('/sessions/active', (_, res) => {
  try {
    const sessions = data.sessions.filter((s: Session) => !s.end);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver historial de sesiones
app.get('/sessions', (_, res) => {
  try {
    const sessions = data.sessions.sort((a: Session, b: Session) => b.start - a.start);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Extender tiempo de sesión
app.post('/sessions/extend', (req, res) => {
  try {
    const { sessionId, additionalTime } = req.body;
    
    if (!sessionId || !additionalTime) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    if (additionalTime < 1 || additionalTime > 60) {
      return res.status(400).json({ error: 'El tiempo adicional debe estar entre 1 y 60 minutos' });
    }
    
    const session = data.sessions.find((s: Session) => s.id === sessionId && !s.end);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
    }
    
    // Extender la duración de la sesión
    session.duration += additionalTime;
    saveData(data);
    
    res.json({ 
      message: 'Tiempo extendido correctamente', 
      session: session,
      newDuration: session.duration 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para resetear datos (solo para desarrollo)
app.post('/admin/reset', (req, res) => {
  try {
    data = {
      children: [],
      games: [],
      sessions: [],
      nextChildId: 1,
      nextGameId: 1,
      nextSessionId: 1
    };
    saveData(data);
    res.json({ message: 'Datos reseteados correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener estado de datos
app.get('/admin/status', (req, res) => {
  try {
    res.json({
      children: data.children.length,
      games: data.games.length,
      sessions: data.sessions.length,
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      nextChildId: data.nextChildId,
      nextGameId: data.nextGameId,
      nextSessionId: data.nextSessionId
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));