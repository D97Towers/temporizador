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
    if (!session)
        return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
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
const PORT = 3010;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
