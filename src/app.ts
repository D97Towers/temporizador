import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

type Child = { id: number; name: string };
type Game = { id: number; name: string };
type Session = { id: number; childId: number; gameId: number; start: number; end?: number; duration: number };

let children: Child[] = [];
let games: Game[] = [];
let sessions: Session[] = [];

let childId = 1, gameId = 1, sessionId = 1;

// CRUD Niños
app.post('/children', (req, res) => {
  const child = { id: childId++, name: req.body.name };
  children.push(child);
  res.json(child);
});
app.get('/children', (_, res) => res.json(children));

// CRUD Juegos
app.post('/games', (req, res) => {
  const game = { id: gameId++, name: req.body.name };
  games.push(game);
  res.json(game);
});
app.get('/games', (_, res) => res.json(games));

// Iniciar sesión de juego con duración personalizada
app.post('/sessions/start', (req, res) => {
  const { childId, gameId, duration } = req.body;
  const session = { id: sessionId++, childId, gameId, start: Date.now(), duration: Number(duration) };
  sessions.push(session);
  res.json(session);
});

// Finalizar sesión de juego
app.post('/sessions/end', (req, res) => {
  const { sessionId: sid } = req.body;
  const session = sessions.find(s => s.id === sid && !s.end);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
  session.end = Date.now();
  res.json(session);
});

// Ver sesiones activas
app.get('/sessions/active', (_, res) => {
  res.json(sessions.filter(s => !s.end));
});

// Ver historial de sesiones
app.get('/sessions', (_, res) => {
  res.json(sessions);
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));