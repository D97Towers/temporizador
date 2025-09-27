"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Servir archivos estáticos de la carpeta public
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
let children = [];
let games = [];
let sessions = [];
let childId = 1, gameId = 1, sessionId = 1;
// Middleware de validación
const validateChild = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres' });
    }
    next();
};
const validateGame = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres' });
    }
    next();
};
const validateSession = (req, res, next) => {
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
        const child = { id: childId++, name: req.body.name.trim() };
        children.push(child);
        res.status(201).json(child);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.get('/children', (_, res) => {
    try {
        res.json(children);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.delete('/children/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = children.findIndex(c => c.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Niño no encontrado' });
        }
        children.splice(index, 1);
        res.json({ message: 'Niño eliminado correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// CRUD Juegos
app.post('/games', validateGame, (req, res) => {
    try {
        const game = { id: gameId++, name: req.body.name.trim() };
        games.push(game);
        res.status(201).json(game);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.get('/games', (_, res) => {
    try {
        res.json(games);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.delete('/games/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = games.findIndex(g => g.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Juego no encontrado' });
        }
        games.splice(index, 1);
        res.json({ message: 'Juego eliminado correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Iniciar sesión de juego con duración personalizada
app.post('/sessions/start', validateSession, (req, res) => {
    try {
        const { childId, gameId, duration } = req.body;
        // Verificar que el niño y el juego existen
        const child = children.find(c => c.id === childId);
        const game = games.find(g => g.id === gameId);
        if (!child) {
            return res.status(404).json({ error: 'Niño no encontrado' });
        }
        if (!game) {
            return res.status(404).json({ error: 'Juego no encontrado' });
        }
        // Verificar si el niño ya tiene una sesión activa
        const activeSession = sessions.find(s => s.childId === childId && !s.end);
        if (activeSession) {
            return res.status(400).json({ error: 'El niño ya tiene una sesión activa' });
        }
        const session = {
            id: sessionId++,
            childId,
            gameId,
            start: Date.now(),
            duration: Number(duration)
        };
        sessions.push(session);
        res.status(201).json(session);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Finalizar sesión de juego
app.post('/sessions/end', (req, res) => {
    try {
        const { sessionId: sid } = req.body;
        const session = sessions.find(s => s.id === sid && !s.end);
        if (!session) {
            return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
        }
        session.end = Date.now();
        res.json(session);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ver sesiones activas
app.get('/sessions/active', (_, res) => {
    try {
        res.json(sessions.filter(s => !s.end));
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ver historial de sesiones
app.get('/sessions', (_, res) => {
    try {
        // Ordenar por fecha de inicio (más recientes primero)
        const sortedSessions = sessions.sort((a, b) => b.start - a.start);
        res.json(sortedSessions);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
