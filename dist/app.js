"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Servir archivos estáticos de la carpeta public
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Sistema de persistencia híbrido: JSON local + variables de entorno para Vercel
const dataFile = path_1.default.join(__dirname, '../data.json');
// Función para cargar datos desde variables de entorno (Vercel) o archivo (local)
function loadData() {
    try {
        if (process.env.VERCEL) {
            // En Vercel, intentar cargar desde /tmp primero
            try {
                const tmpFile = '/tmp/temporizador-data.json';
                if (fs_1.default.existsSync(tmpFile)) {
                    const data = JSON.parse(fs_1.default.readFileSync(tmpFile, 'utf8'));
                    console.log('Data loaded from /tmp:', data);
                    return {
                        children: data.children || [],
                        games: data.games || [],
                        sessions: data.sessions || [],
                        nextChildId: data.nextChildId || 1,
                        nextGameId: data.nextGameId || 1,
                        nextSessionId: data.nextSessionId || 1
                    };
                }
            }
            catch (tmpError) {
                console.log('Could not load from /tmp:', tmpError.message);
            }
            // Si no hay archivo en /tmp, intentar desde variables de entorno
            if (process.env.APP_DATA) {
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
        }
        // En local, cargar desde archivo
        if (fs_1.default.existsSync(dataFile)) {
            const data = JSON.parse(fs_1.default.readFileSync(dataFile, 'utf8'));
            return {
                children: data.children || [],
                games: data.games || [],
                sessions: data.sessions || [],
                nextChildId: data.nextChildId || 1,
                nextGameId: data.nextGameId || 1,
                nextSessionId: data.nextSessionId || 1
            };
        }
    }
    catch (error) {
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
function saveData(newData) {
    try {
        if (process.env.VERCEL) {
            // En Vercel, usar tanto memoria global como intentar guardar en /tmp
            globalData = newData;
            // Intentar guardar en /tmp para persistencia temporal
            try {
                const tmpFile = '/tmp/temporizador-data.json';
                fs_1.default.writeFileSync(tmpFile, JSON.stringify(newData, null, 2));
                console.log('Data saved to /tmp and global memory (Vercel)');
            }
            catch (tmpError) {
                console.log('Could not save to /tmp, using global memory only:', tmpError.message);
            }
            return;
        }
        // En local, guardar en archivo
        fs_1.default.writeFileSync(dataFile, JSON.stringify(newData, null, 2));
    }
    catch (error) {
        console.error('Error saving data:', error);
    }
}
// Memoria global persistente para Vercel
let globalData = null;
// Función para obtener datos persistentes
function getPersistentData() {
    if (process.env.VERCEL) {
        // En Vercel, intentar cargar desde /tmp o memoria global
        const loadedData = loadData();
        if (!globalData) {
            globalData = loadedData;
            console.log('Loaded data into global memory:', JSON.stringify(globalData, null, 2));
        }
        else {
            // Sincronizar memoria global con datos cargados
            globalData = loadedData;
        }
        console.log('Current data state:', JSON.stringify(globalData, null, 2));
        return globalData;
    }
    else {
        // En local, usar sistema de archivos
        return loadData();
    }
}
// Cargar datos iniciales
let data = getPersistentData();
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
// Función para cargar datos desde variable de entorno persistente
function loadPersistentData() {
    try {
        if (process.env.VERCEL && process.env.PERSISTENT_DATA) {
            const persistentData = JSON.parse(process.env.PERSISTENT_DATA);
            console.log('Loading persistent data from environment:', persistentData);
            return persistentData;
        }
    }
    catch (error) {
        console.error('Error loading persistent data:', error);
    }
    return null;
}
// Función para guardar datos en variable de entorno (simulado)
function savePersistentData(data) {
    if (process.env.VERCEL) {
        console.log('Saving persistent data (simulated):', JSON.stringify(data, null, 2));
        // En un entorno real, aquí se actualizaría la variable de entorno
        // Por ahora, solo log para debug
    }
}
// Inicializar datos por defecto
initializeDefaultData();
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
        const currentData = getPersistentData();
        const child = { id: currentData.nextChildId++, name: req.body.name.trim() };
        currentData.children.push(child);
        saveData(currentData);
        res.status(201).json(child);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.get('/children', (_, res) => {
    try {
        const currentData = getPersistentData();
        res.json(currentData.children);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.delete('/children/:id', (req, res) => {
    try {
        const currentData = getPersistentData();
        const id = parseInt(req.params.id);
        console.log(`Attempting to delete child with ID: ${id}`);
        console.log(`Available children:`, currentData.children.map((c) => ({ id: c.id, name: c.name })));
        const index = currentData.children.findIndex((c) => c.id === id);
        console.log(`Found child at index: ${index}`);
        if (index === -1) {
            console.log(`Child with ID ${id} not found`);
            return res.status(404).json({ error: 'Niño no encontrado' });
        }
        const deletedChild = currentData.children[index];
        currentData.children.splice(index, 1);
        saveData(currentData);
        console.log(`Successfully deleted child:`, deletedChild);
        res.json({ message: 'Niño eliminado correctamente' });
    }
    catch (error) {
        console.error('Error deleting child:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// CRUD Juegos
app.post('/games', validateGame, (req, res) => {
    try {
        const currentData = getPersistentData();
        const game = { id: currentData.nextGameId++, name: req.body.name.trim() };
        currentData.games.push(game);
        saveData(currentData);
        res.status(201).json(game);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.get('/games', (_, res) => {
    try {
        const currentData = getPersistentData();
        res.json(currentData.games);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.delete('/games/:id', (req, res) => {
    try {
        const currentData = getPersistentData();
        const id = parseInt(req.params.id);
        console.log(`Attempting to delete game with ID: ${id}`);
        console.log(`Available games:`, currentData.games.map((g) => ({ id: g.id, name: g.name })));
        const index = currentData.games.findIndex((g) => g.id === id);
        console.log(`Found game at index: ${index}`);
        if (index === -1) {
            console.log(`Game with ID ${id} not found`);
            return res.status(404).json({ error: 'Juego no encontrado' });
        }
        const deletedGame = currentData.games[index];
        currentData.games.splice(index, 1);
        saveData(currentData);
        console.log(`Successfully deleted game:`, deletedGame);
        res.json({ message: 'Juego eliminado correctamente' });
    }
    catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Iniciar sesión de juego con duración personalizada
app.post('/sessions/start', validateSession, (req, res) => {
    try {
        const currentData = getPersistentData();
        const { childId, gameId, duration } = req.body;
        // Verificar que el niño y el juego existen
        const child = currentData.children.find((c) => c.id === childId);
        const game = currentData.games.find((g) => g.id === gameId);
        if (!child) {
            return res.status(404).json({ error: 'Niño no encontrado' });
        }
        if (!game) {
            return res.status(404).json({ error: 'Juego no encontrado' });
        }
        // Verificar si el niño ya tiene una sesión activa
        const activeSession = currentData.sessions.find((s) => s.childId === childId && !s.end);
        if (activeSession) {
            return res.status(400).json({ error: 'El niño ya tiene una sesión activa' });
        }
        const session = {
            id: currentData.nextSessionId++,
            childId,
            gameId,
            start: Date.now(),
            duration: Number(duration)
        };
        currentData.sessions.push(session);
        saveData(currentData);
        res.status(201).json(session);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Finalizar sesión de juego
app.post('/sessions/end', (req, res) => {
    try {
        const currentData = getPersistentData();
        const { sessionId: sid } = req.body;
        const session = currentData.sessions.find((s) => s.id === sid && !s.end);
        if (!session) {
            return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
        }
        session.end = Date.now();
        saveData(currentData);
        res.json(session);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ver sesiones activas
app.get('/sessions/active', (_, res) => {
    try {
        const currentData = getPersistentData();
        const sessions = currentData.sessions.filter((s) => !s.end);
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ver historial de sesiones
app.get('/sessions', (_, res) => {
    try {
        const currentData = getPersistentData();
        const sessions = currentData.sessions.sort((a, b) => b.start - a.start);
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Extender tiempo de sesión
app.post('/sessions/extend', (req, res) => {
    try {
        const currentData = getPersistentData();
        const { sessionId, additionalTime } = req.body;
        if (!sessionId || !additionalTime) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        if (additionalTime < 1 || additionalTime > 60) {
            return res.status(400).json({ error: 'El tiempo adicional debe estar entre 1 y 60 minutos' });
        }
        const session = currentData.sessions.find((s) => s.id === sessionId && !s.end);
        if (!session) {
            return res.status(404).json({ error: 'Sesión no encontrada o ya finalizada' });
        }
        // Extender la duración de la sesión
        session.duration += additionalTime;
        saveData(currentData);
        res.json({
            message: 'Tiempo extendido correctamente',
            session: session,
            newDuration: session.duration
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Endpoint para resetear datos (solo para desarrollo)
app.post('/admin/reset', (req, res) => {
    try {
        const resetData = {
            children: [],
            games: [],
            sessions: [],
            nextChildId: 1,
            nextGameId: 1,
            nextSessionId: 1
        };
        saveData(resetData);
        res.json({ message: 'Datos reseteados correctamente' });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Endpoint para obtener estado de datos
app.get('/admin/status', (req, res) => {
    try {
        const currentData = getPersistentData();
        res.json({
            children: currentData.children.length,
            games: currentData.games.length,
            sessions: currentData.sessions.length,
            environment: process.env.VERCEL ? 'Vercel' : 'Local',
            nextChildId: currentData.nextChildId,
            nextGameId: currentData.nextGameId,
            nextSessionId: currentData.nextSessionId,
            childrenList: currentData.children,
            gamesList: currentData.games
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Endpoint para debug completo
app.get('/admin/debug', (req, res) => {
    try {
        const currentData = getPersistentData();
        res.json({
            environment: process.env.VERCEL ? 'Vercel' : 'Local',
            globalDataExists: !!globalData,
            currentData: currentData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
const PORT = process.env.PORT || 3010;
// Endpoint para forzar recarga de datos
app.post('/admin/reload', (req, res) => {
    try {
        data = getPersistentData();
        res.json({ message: 'Datos recargados correctamente', data });
    }
    catch (error) {
        console.error('Error reloading data:', error);
        res.status(500).json({ error: 'Error al recargar datos' });
    }
});
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
