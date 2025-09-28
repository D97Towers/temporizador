import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar base de datos
const db = new Database(path.join(__dirname, '../data.db'));

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children (id),
    FOREIGN KEY (game_id) REFERENCES games (id)
  )
`);

type Child = { id: number; name: string };
type Game = { id: number; name: string };
type Session = { id: number; childId: number; gameId: number; start: number; end?: number; duration: number };
type DBSession = { id: number; child_id: number; game_id: number; start_time: number; end_time: number | null; duration: number };

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
    const stmt = db.prepare('INSERT INTO children (name) VALUES (?)');
    const result = stmt.run(req.body.name.trim());
    const child = { id: result.lastInsertRowid, name: req.body.name.trim() };
    res.status(201).json(child);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/children', (_, res) => {
  try {
    const children = db.prepare('SELECT id, name FROM children ORDER BY created_at DESC').all();
    res.json(children);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/children/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const stmt = db.prepare('DELETE FROM children WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    res.json({ message: 'Niño eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CRUD Juegos
app.post('/games', validateGame, (req, res) => {
  try {
    const stmt = db.prepare('INSERT INTO games (name) VALUES (?)');
    const result = stmt.run(req.body.name.trim());
    const game = { id: result.lastInsertRowid, name: req.body.name.trim() };
    res.status(201).json(game);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/games', (_, res) => {
  try {
    const games = db.prepare('SELECT id, name FROM games ORDER BY created_at DESC').all();
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/games/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const stmt = db.prepare('DELETE FROM games WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
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
    const child = db.prepare('SELECT id FROM children WHERE id = ?').get(childId);
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(gameId);
    
    if (!child) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    // Verificar si el niño ya tiene una sesión activa
    const activeSession = db.prepare('SELECT id FROM sessions WHERE child_id = ? AND end_time IS NULL').get(childId);
    if (activeSession) {
      return res.status(400).json({ error: 'El niño ya tiene una sesión activa' });
    }
    
    const stmt = db.prepare('INSERT INTO sessions (child_id, game_id, start_time, duration) VALUES (?, ?, ?, ?)');
    const result = stmt.run(childId, gameId, Date.now(), Number(duration));
    
    const session = { 
      id: result.lastInsertRowid, 
      childId, 
      gameId, 
      start: Date.now(), 
      duration: Number(duration) 
    };
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Finalizar sesión de juego
app.post('/sessions/end', (req, res) => {
  try {
    const { sessionId: sid } = req.body;
    const stmt = db.prepare('UPDATE sessions SET end_time = ? WHERE id = ? AND end_time IS NULL');
    const result = stmt.run(Date.now(), sid);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
    }
    
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sid) as DBSession;
    res.json({
      id: session.id,
      childId: session.child_id,
      gameId: session.game_id,
      start: session.start_time,
      end: session.end_time,
      duration: session.duration
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver sesiones activas
app.get('/sessions/active', (_, res) => {
  try {
    const sessions = db.prepare(`
      SELECT id, child_id as childId, game_id as gameId, start_time as start, duration 
      FROM sessions 
      WHERE end_time IS NULL 
      ORDER BY start_time DESC
    `).all();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver historial de sesiones
app.get('/sessions', (_, res) => {
  try {
    const sessions = db.prepare(`
      SELECT id, child_id as childId, game_id as gameId, start_time as start, end_time as end, duration 
      FROM sessions 
      ORDER BY start_time DESC
    `).all();
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
    
    const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND end_time IS NULL').get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
    }
    
    // Extender la duración de la sesión
    const stmt = db.prepare('UPDATE sessions SET duration = duration + ? WHERE id = ?');
    stmt.run(additionalTime, sessionId);
    
    const updatedSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as DBSession;
    
    res.json({ 
      message: 'Tiempo extendido correctamente', 
      session: {
        id: updatedSession.id,
        childId: updatedSession.child_id,
        gameId: updatedSession.game_id,
        start: updatedSession.start_time,
        duration: updatedSession.duration
      },
      newDuration: updatedSession.duration 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));