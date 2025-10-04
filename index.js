// Vercel Entrypoint - Temporizador de Juegos
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Sistema de persistencia híbrido: JSON local + variables de entorno para Vercel
const dataFile = path.join(__dirname, 'data.json');

// Función para cargar datos desde variables de entorno (Vercel) o archivo (local)
function loadData() {
  try {
    if (process.env.VERCEL) {
      // En Vercel, intentar cargar desde /tmp con múltiples ubicaciones
      const tmpFiles = ['/tmp/temporizador-data.json', '/tmp/data.json'];
      
      for (const tmpFile of tmpFiles) {
        try {
          if (fs.existsSync(tmpFile)) {
            const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
            console.log('Data loaded from', tmpFile, ':', data);
            return {
              children: data.children || [],
              games: data.games || [],
              sessions: data.sessions || [],
              nextChildId: data.nextChildId || 1,
              nextGameId: data.nextGameId || 1,
              nextSessionId: data.nextSessionId || 1
            };
          }
        } catch (tmpError) {
          console.log('Could not load from', tmpFile, ':', tmpError.message);
        }
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
    children: [
      { id: 1, name: 'David' },
      { id: 2, name: 'Santiago' }
    ],
    games: [
      { id: 1, name: 'bici' },
      { id: 2, name: 'videojuegos' }
    ],
    sessions: [],
    nextChildId: 3,
    nextGameId: 3,
    nextSessionId: 1
  };
}

// Función para guardar datos
function saveData(newData) {
  try {
    if (process.env.VERCEL) {
      // En Vercel, actualizar memoria global inmediatamente
      globalData = newData;
      console.log('Updated global memory with new data');
      
      // También actualizar la variable data global para consistencia
      data = newData;
      
      // Intentar guardar en /tmp para persistencia temporal con redundancia
      try {
        const tmpFile = '/tmp/temporizador-data.json';
        fs.writeFileSync(tmpFile, JSON.stringify(newData, null, 2));
        console.log('Data saved to /tmp successfully');
        
        // También guardar en backup para redundancia
        const tmpFile2 = '/tmp/data.json';
        fs.writeFileSync(tmpFile2, JSON.stringify(newData, null, 2));
        console.log('Data saved to backup /tmp/data.json');
        
      } catch (tmpError) {
        console.log('Could not save to /tmp:', tmpError.message);
        // En caso de error con /tmp, al menos tenemos la memoria global
      }
      
      // Log de estado para debug
      console.log('Current data state:');
      console.log('- Children:', newData.children.length);
      console.log('- Games:', newData.games.length);
      console.log('- Sessions:', newData.sessions.length);
      
      return;
    }
    
    // En local, guardar en archivo
    fs.writeFileSync(dataFile, JSON.stringify(newData, null, 2));
    console.log('Data saved to local file');
  } catch (error) {
    console.error('Error saving data:', error);
    throw error; // Re-lanzar el error para que se maneje en el endpoint
  }
}

// Memoria global persistente para Vercel
let globalData = null;
let dataLock = false; // Lock simple para operaciones atómicas

// Función para obtener datos persistentes
function getPersistentData() {
  if (process.env.VERCEL) {
    // En Vercel, priorizar memoria global que se actualiza con cada saveData
    if (globalData && (globalData.children.length > 0 || globalData.games.length > 0 || globalData.sessions.length > 0)) {
      console.log('Using global memory data:', JSON.stringify(globalData, null, 2));
      return globalData;
    }
    
    // Si no hay datos en memoria global, intentar cargar desde /tmp
    const loadedData = loadData();
    if (loadedData && (loadedData.children.length > 0 || loadedData.games.length > 0 || loadedData.sessions.length > 0)) {
      globalData = loadedData;
      console.log('Loaded fresh data from /tmp:', JSON.stringify(globalData, null, 2));
      return globalData;
    }
    
    // Si no hay datos en ningún lado, inicializar con datos por defecto
    console.log('No data found, initializing with defaults');
    globalData = {
      children: [
        { id: 1, name: 'David' },
        { id: 2, name: 'Santiago' }
      ],
      games: [
        { id: 1, name: 'bici' },
        { id: 2, name: 'videojuegos' }
      ],
      sessions: [],
      nextChildId: 3,
      nextGameId: 3,
      nextSessionId: 1
    };
    return globalData;
  } else {
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

// Inicializar datos por defecto
initializeDefaultData();

// Middleware de validación
const validateChild = (req, res, next) => {
  const { name, nickname, fatherName, motherName } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 50 caracteres' });
  }
  if (nickname && (typeof nickname !== 'string' || nickname.trim().length > 20)) {
    return res.status(400).json({ error: 'El apodo debe tener máximo 20 caracteres' });
  }
  if (fatherName && (typeof fatherName !== 'string' || fatherName.trim().length > 30)) {
    return res.status(400).json({ error: 'El nombre del padre debe tener máximo 30 caracteres' });
  }
  if (motherName && (typeof motherName !== 'string' || motherName.trim().length > 30)) {
    return res.status(400).json({ error: 'El nombre de la madre debe tener máximo 30 caracteres' });
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

// Función para operaciones atómicas
async function atomicOperation(operation) {
  // Esperar hasta que el lock esté libre
  while (dataLock) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Adquirir lock
  dataLock = true;
  
  try {
    const result = await operation();
    return result;
  } finally {
    // Liberar lock
    dataLock = false;
  }
}

// CRUD Niños
app.post('/children', validateChild, async (req, res) => {
  try {
    const result = await atomicOperation(async () => {
      const currentData = getPersistentData();
      const { name, nickname, fatherName, motherName } = req.body;
    
      console.log('Creating child with data:', { name, nickname, fatherName, motherName });
      
      // Verificar duplicados ANTES de crear
      const trimmedName = name.trim();
      const existingChild = currentData.children.find(c => 
        c.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (existingChild) {
        console.log('Duplicate child detected:', existingChild);
        throw new Error('Ya existe un niño con ese nombre');
      }
      
      // Generar ID único usando timestamp + random para evitar colisiones
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      
      const child = { 
        id: newId, 
        name: trimmedName,
        nickname: nickname ? nickname.trim() : undefined,
        fatherName: fatherName ? fatherName.trim() : undefined,
        motherName: motherName ? motherName.trim() : undefined,
        displayName: trimmedName + (nickname ? ` (${nickname.trim()})` : ''),
        avatar: trimmedName.charAt(0).toUpperCase(),
        createdAt: new Date().toISOString(),
        totalSessions: 0,
        totalTimePlayed: 0
      };
      
      currentData.children.push(child);
      console.log('Child created:', JSON.stringify(child, null, 2));
      
      saveData(currentData);
      console.log('Data saved successfully');
      
      return child;
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating child:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

app.get('/children', (_, res) => {
  try {
    const currentData = getPersistentData();
    console.log('GET /children - returning', currentData.children.length, 'children');
    res.json(currentData.children);
  } catch (error) {
    console.error('Error in GET /children:', error);
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
  } catch (error) {
    console.error('Error deleting child:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Editar niño
app.put('/children/:id', validateChild, (req, res) => {
  try {
    const currentData = getPersistentData();
    const id = parseInt(req.params.id);
    const { name, nickname, fatherName, motherName } = req.body;

    console.log(`Attempting to edit child with ID: ${id}`);
    console.log('Available children IDs:', currentData.children.map(c => c.id));

    const childIndex = currentData.children.findIndex((c) => c.id === id);
    if (childIndex === -1) {
      console.log(`Child with ID ${id} not found in ${currentData.children.length} children`);
      return res.status(404).json({ error: 'Niño no encontrado' });
    }

    // Actualizar el niño
    const updatedChild = {
      ...currentData.children[childIndex],
      name: name.trim(),
      nickname: nickname ? nickname.trim() : undefined,
      fatherName: fatherName ? fatherName.trim() : undefined,
      motherName: motherName ? motherName.trim() : undefined,
      displayName: name.trim() + (nickname ? ` (${nickname.trim()})` : ''),
      avatar: name.trim().charAt(0).toUpperCase()
    };

    currentData.children[childIndex] = updatedChild;
    saveData(currentData);

    console.log(`Child edited successfully: ${updatedChild.name}`);
    res.json(updatedChild);
  } catch (error) {
    console.error('Error editing child:', error);
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
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/games', (_, res) => {
  try {
    const currentData = getPersistentData();
    res.json(currentData.games);
  } catch (error) {
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
  } catch (error) {
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
    
    console.log('Creating session with data:', { childId, gameId, duration });
    console.log('Current data before adding session:', JSON.stringify(currentData, null, 2));
    
    const session = { 
      id: currentData.nextSessionId++, 
      childId, 
      gameId, 
      start: Date.now(), 
      duration: Number(duration),
      end: null
    };
    
    currentData.sessions.push(session);
    console.log('Session created:', JSON.stringify(session, null, 2));
    console.log('Total sessions before save:', currentData.sessions.length);
    
    saveData(currentData);
    console.log('Session data saved successfully');
    
    // Verificar que se guardó correctamente
    const verifyData = getPersistentData();
    console.log('Total sessions after save:', verifyData.sessions.length);
    
    res.status(201).json(session);
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver sesiones activas
app.get('/sessions/active', (_, res) => {
  try {
    const currentData = getPersistentData();
    const sessions = currentData.sessions.filter((s) => !s.end);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver historial de sesiones
app.get('/sessions', (_, res) => {
  try {
    const currentData = getPersistentData();
    const sessions = currentData.sessions.sort((a, b) => b.start - a.start);
    res.json(sessions);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
      gamesList: currentData.games,
      globalDataExists: !!globalData,
      globalDataChildren: globalData ? globalData.children.length : 0,
      dataLock: dataLock
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para debug de persistencia
app.get('/admin/debug', (req, res) => {
  try {
    const currentData = getPersistentData();
    
    // Verificar archivos en /tmp
    let tmpData = null;
    try {
      const tmpFile = '/tmp/temporizador-data.json';
      if (fs.existsSync(tmpFile)) {
        tmpData = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
      }
    } catch (e) {
      console.log('Could not read /tmp file:', e.message);
    }
    
    res.json({
      currentData: {
        children: currentData.children.length,
        nextChildId: currentData.nextChildId,
        lastChild: currentData.children[currentData.children.length - 1]
      },
      globalData: {
        exists: !!globalData,
        children: globalData ? globalData.children.length : 0,
        lastChild: globalData ? globalData.children[globalData.children.length - 1] : null
      },
      tmpData: {
        exists: !!tmpData,
        children: tmpData ? tmpData.children.length : 0,
        lastChild: tmpData ? tmpData.children[tmpData.children.length - 1] : null
      },
      dataLock: dataLock
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en debug', details: error.message });
  }
});

// Endpoint para debug completo
app.get('/admin/debug-full', (req, res) => {
  try {
    const currentData = getPersistentData();
    res.json({
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      globalDataExists: !!globalData,
      globalDataChildren: globalData ? globalData.children.length : 0,
      globalDataSessions: globalData ? globalData.sessions.length : 0,
      currentData: currentData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para forzar recarga de datos
app.post('/admin/reload', (req, res) => {
  try {
    data = getPersistentData();
    res.json({ message: 'Datos recargados correctamente', data });
  } catch (error) {
    console.error('Error reloading data:', error);
    res.status(500).json({ error: 'Error al recargar datos' });
  }
});

// Endpoint para sincronizar datos desde local a producción
app.post('/admin/sync-data', (req, res) => {
  try {
    const { children, games, sessions, nextChildId, nextGameId, nextSessionId } = req.body;
    
    // Validar que los datos sean válidos
    if (!Array.isArray(children) || !Array.isArray(games) || !Array.isArray(sessions)) {
      return res.status(400).json({ error: 'Datos inválidos: se esperan arrays para children, games y sessions' });
    }
    
    const syncData = {
      children: children || [],
      games: games || [],
      sessions: sessions || [],
      nextChildId: nextChildId || 1,
      nextGameId: nextGameId || 1,
      nextSessionId: nextSessionId || 1
    };
    
    // Guardar los datos sincronizados
    saveData(syncData);
    
    console.log('Data synced from local to production:', {
      childrenCount: syncData.children.length,
      gamesCount: syncData.games.length,
      sessionsCount: syncData.sessions.length
    });
    
    res.json({ 
      message: 'Datos sincronizados correctamente desde local',
      synced: {
        children: syncData.children.length,
        games: syncData.games.length,
        sessions: syncData.sessions.length
      }
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: 'Error al sincronizar datos' });
  }
});

// Endpoint para forzar recarga de datos
app.post('/admin/reload-data', (req, res) => {
  try {
    console.log('Forcing data reload...');
    
    // Recargar datos frescos
    const freshData = loadData();
    
    // Actualizar memoria global
    globalData = freshData;
    data = freshData;
    
    res.json({ 
      message: 'Datos recargados correctamente',
      data: {
        children: freshData.children.length,
        games: freshData.games.length,
        sessions: freshData.sessions.length
      }
    });
  } catch (error) {
    console.error('Error reloading data:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
});

// Exportar la aplicación para Vercel
module.exports = app;
