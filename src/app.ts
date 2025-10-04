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
    if (process.env.VERCEL) {
      // En Vercel, intentar cargar desde /tmp primero
      try {
        const tmpFile = '/tmp/temporizador-data.json';
        if (fs.existsSync(tmpFile)) {
          const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
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
      } catch (tmpError) {
        console.log('Could not load from /tmp:', (tmpError as Error).message);
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
    children: [],
    games: [],
    sessions: [],
    nextChildId: 1,
    nextGameId: 1,
    nextSessionId: 1
  };
}

// Función para guardar datos
function saveData(newData: any) {
  try {
    if (process.env.VERCEL) {
      // En Vercel, usar tanto memoria global como intentar guardar en /tmp
      globalData = newData;
      
      // Intentar guardar en /tmp para persistencia temporal
      try {
        const tmpFile = '/tmp/temporizador-data.json';
        fs.writeFileSync(tmpFile, JSON.stringify(newData, null, 2));
        console.log('Data saved to /tmp and global memory (Vercel)');
      } catch (tmpError) {
        console.log('Could not save to /tmp, using global memory only:', (tmpError as Error).message);
      }
      
      return;
    }
    
    // En local, actualizar variable data y guardar en archivo
    data = newData;
    fs.writeFileSync(dataFile, JSON.stringify(newData, null, 2));
    console.log('Data saved to file and updated in memory (Local)');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Memoria global persistente para Vercel
let globalData: any = null;

// Cargar datos iniciales
let data: any = loadData();

// Función para obtener datos persistentes
function getPersistentData(): any {
  if (process.env.VERCEL) {
    // En Vercel, intentar cargar desde /tmp o memoria global
    const loadedData = loadData();
    
    if (!globalData) {
      globalData = loadedData;
      console.log('Loaded data into global memory:', JSON.stringify(globalData, null, 2));
    } else {
      // Sincronizar memoria global con datos cargados
      globalData = loadedData;
    }
    
    console.log('Current data state:', JSON.stringify(globalData, null, 2));
    return globalData;
  } else {
    // En local, usar la variable data que mantiene el estado en memoria
    return data;
  }
}

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
  } catch (error) {
    console.error('Error loading persistent data:', error);
  }
  return null;
}

// Función para guardar datos en variable de entorno (simulado)
function savePersistentData(data: any) {
  if (process.env.VERCEL) {
    console.log('Saving persistent data (simulated):', JSON.stringify(data, null, 2));
    // En un entorno real, aquí se actualizaría la variable de entorno
    // Por ahora, solo log para debug
  }
}

// Inicializar datos por defecto
initializeDefaultData();

type Child = {
  id: number;
  name: string;
  nickname?: string;
  displayName: string;
  avatar: string;
  fatherName?: string;
  motherName?: string;
  createdAt: string;
  totalSessions: number;
  totalTimePlayed: number; // en minutos
};
type Game = { id: number; name: string };
type Session = { id: number; childId: number; gameId: number; start: number; end?: number; duration: number };

// Función para generar displayName simple
function generateDisplayName(name: string, nickname?: string): string {
  return nickname && nickname.trim() ? nickname.trim() : name.trim();
}

// Función para verificar duplicados considerando padres
function checkForDuplicates(name: string, nickname: string, fatherName: string, motherName: string, existingChildren: Child[]): { isDuplicate: boolean; suggestion?: string } {
  const displayName = generateDisplayName(name, nickname);

  // Buscar duplicados exactos (mismo nombre + mismo apodo + mismos padres)
  const exactDuplicate = existingChildren.find(c => {
    if (c.displayName !== displayName) return false;
    
    const sameFather = (!fatherName && !c.fatherName) || (fatherName && c.fatherName && fatherName.toLowerCase() === c.fatherName.toLowerCase());
    const sameMother = (!motherName && !c.motherName) || (motherName && c.motherName && motherName.toLowerCase() === c.motherName.toLowerCase());
    
    return sameFather && sameMother;
  });

  if (exactDuplicate) {
    return {
      isDuplicate: true,
      suggestion: `Ya existe un niño con ese nombre y esos padres. Verifica la información.`
    };
  }

  // Buscar posibles duplicados (mismo nombre pero padres diferentes)
  const sameNameDifferentParents = existingChildren.find(c => 
    c.displayName === displayName && 
    ((fatherName && c.fatherName && fatherName.toLowerCase() !== c.fatherName.toLowerCase()) ||
     (motherName && c.motherName && motherName.toLowerCase() !== c.motherName.toLowerCase()))
  );

  if (sameNameDifferentParents) {
    return {
      isDuplicate: false,
      suggestion: `Ya existe otro niño con el nombre "${displayName}" pero con padres diferentes. Esto ayudará a diferenciarlos.`
    };
  }

  return { isDuplicate: false };
}

// Función para calcular estadísticas del niño
function calculateChildStats(childId: number, sessions: Session[]): { totalSessions: number; totalTimePlayed: number } {
  const childSessions = sessions.filter(s => s.childId === childId && s.end);
  
  return {
    totalSessions: childSessions.length,
    totalTimePlayed: childSessions.reduce((total, session) => total + session.duration, 0)
  };
}

// Middleware de validación simplificado
const validateChild = (req: any, res: any, next: any) => {
  const { name, nickname, fatherName, motherName } = req.body;
  
  // Validar nombre (requerido)
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 30) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 30 caracteres' });
  }
  
  // Validar nickname (opcional)
  if (nickname && (typeof nickname !== 'string' || nickname.trim().length > 20)) {
    return res.status(400).json({ error: 'El apodo no puede exceder 20 caracteres' });
  }

  // Validar nombre del padre (opcional)
  if (fatherName && (typeof fatherName !== 'string' || fatherName.trim().length > 30)) {
    return res.status(400).json({ error: 'El nombre del padre no puede exceder 30 caracteres' });
  }

  // Validar nombre de la madre (opcional)
  if (motherName && (typeof motherName !== 'string' || motherName.trim().length > 30)) {
    return res.status(400).json({ error: 'El nombre de la madre no puede exceder 30 caracteres' });
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
    const currentData = getPersistentData();
    const { name, nickname, fatherName, motherName } = req.body;
    
    // Verificar duplicados
    const duplicateCheck = checkForDuplicates(
      name.trim(), 
      nickname?.trim(), 
      fatherName?.trim(), 
      motherName?.trim(), 
      currentData.children
    );
    if (duplicateCheck.isDuplicate) {
      return res.status(400).json({ 
        error: 'Nombre duplicado', 
        suggestion: duplicateCheck.suggestion,
        duplicate: true 
      });
    }
    
    // Crear objeto niño con información de padres
    const child: Child = { 
      id: currentData.nextChildId++, 
      name: name.trim(),
      nickname: nickname ? nickname.trim() : undefined,
      displayName: generateDisplayName(name.trim(), nickname?.trim()),
      avatar: name.trim().charAt(0).toUpperCase(),
      fatherName: fatherName ? fatherName.trim() : undefined,
      motherName: motherName ? motherName.trim() : undefined,
      createdAt: new Date().toISOString(),
      totalSessions: 0,
      totalTimePlayed: 0
    };
    
    currentData.children.push(child);
    saveData(currentData);
    res.status(201).json(child);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/children', (_, res) => {
  try {
    const currentData = getPersistentData();
    
    // Actualizar estadísticas de cada niño
    const childrenWithStats = currentData.children.map((child: Child) => {
      const stats = calculateChildStats(child.id, currentData.sessions);
      return {
        ...child,
        totalSessions: stats.totalSessions,
        totalTimePlayed: stats.totalTimePlayed
      };
    });
    
    res.json(childrenWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para migrar niños existentes (agregar displayId si no existe)
app.post('/children/migrate', (req, res) => {
  try {
    const currentData = getPersistentData();
    let migrated = 0;
    
    currentData.children.forEach((child: any) => {
      if (!child.displayName) {
        child.displayName = generateDisplayName(child.name, child.nickname || '');
        child.avatar = child.name.charAt(0).toUpperCase();
        migrated++;
      }
    });
    
    if (migrated > 0) {
      saveData(currentData);
    }
    
    res.json({ 
      message: `Migración completada. ${migrated} niños actualizados.`,
      migrated,
      children: currentData.children
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/children/:id', (req, res) => {
  try {
    const currentData = getPersistentData();
    const id = parseInt(req.params.id);
    
    console.log(`Attempting to delete child with ID: ${id}`);
    console.log(`Available children:`, currentData.children.map((c: Child) => ({ id: c.id, name: c.name })));
    
    const index = currentData.children.findIndex((c: Child) => c.id === id);
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

// Endpoint para editar niño
app.put('/children/:id', validateChild, (req, res) => {
  try {
    const currentData = getPersistentData();
    const id = parseInt(req.params.id);
    const { name, nickname, fatherName, motherName } = req.body;
    
    console.log(`Attempting to edit child with ID: ${id}`);
    
    const childIndex = currentData.children.findIndex((c: Child) => c.id === id);
    if (childIndex === -1) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    
    // Verificar duplicados (excluyendo el niño actual)
    const otherChildren = currentData.children.filter((c: Child) => c.id !== id);
    const duplicateCheck = checkForDuplicates(
      name.trim(),
      nickname?.trim(),
      fatherName?.trim(),
      motherName?.trim(),
      otherChildren
    );
    
    if (duplicateCheck.isDuplicate) {
      return res.status(400).json({
        error: 'Nombre duplicado',
        suggestion: duplicateCheck.suggestion,
        duplicate: true
      });
    }
    
    // Actualizar el niño
    const updatedChild: Child = {
      ...currentData.children[childIndex],
      name: name.trim(),
      nickname: nickname ? nickname.trim() : undefined,
      fatherName: fatherName ? fatherName.trim() : undefined,
      motherName: motherName ? motherName.trim() : undefined,
      displayName: generateDisplayName(name.trim(), nickname?.trim()),
      avatar: name.trim().charAt(0).toUpperCase()
    };
    
    currentData.children[childIndex] = updatedChild;
    saveData(currentData);
    
    console.log(`Child edited successfully: ${updatedChild.displayName}`);
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
    console.log(`Available games:`, currentData.games.map((g: Game) => ({ id: g.id, name: g.name })));
    
    const index = currentData.games.findIndex((g: Game) => g.id === id);
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
    const child = currentData.children.find((c: Child) => c.id === childId);
    const game = currentData.games.find((g: Game) => g.id === gameId);
    
    if (!child) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    // Verificar si el niño ya tiene una sesión activa
    const activeSession = currentData.sessions.find((s: Session) => s.childId === childId && !s.end);
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
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Finalizar sesión de juego
app.post('/sessions/end', (req, res) => {
  try {
    const currentData = getPersistentData();
    const { sessionId: sid } = req.body;
    const session = currentData.sessions.find((s: Session) => s.id === sid && !s.end);
    
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

// Ruta de estado para diagnóstico
app.get('/admin/status', (_, res) => {
  try {
    const currentData = getPersistentData();
    const activeSessions = currentData.sessions.filter((s: Session) => !s.end);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      children: currentData.children.length,
      games: currentData.games.length,
      sessions: currentData.sessions.length,
      activeSessions: activeSessions.length
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Ver sesiones activas
app.get('/sessions/active', (_, res) => {
  try {
    const currentData = getPersistentData();
    const sessions = currentData.sessions.filter((s: Session) => !s.end);
    console.log('Active sessions found:', sessions.length);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver historial de sesiones
app.get('/sessions', (_, res) => {
  try {
    const currentData = getPersistentData();
    const sessions = currentData.sessions.sort((a: Session, b: Session) => b.start - a.start);
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
    
    const session = currentData.sessions.find((s: Session) => s.id === sessionId && !s.end);
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
      gamesList: currentData.games
    });
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener estadísticas generales
app.get('/admin/stats', (_, res) => {
  try {
    const currentData = getPersistentData();
    const totalSessions = currentData.sessions.length;
    const activeSessions = currentData.sessions.filter((s: Session) => !s.end).length;
    const completedSessions = totalSessions - activeSessions;
    
    // Calcular tiempo total jugado
    const totalTimePlayed = currentData.sessions
      .filter((s: Session) => s.end)
      .reduce((total: number, session: Session) => total + session.duration, 0);
    
    // Estadísticas por niño
    const childrenStats = currentData.children.map((child: Child) => {
      const stats = calculateChildStats(child.id, currentData.sessions);
      return {
        id: child.id,
        name: child.displayName,
        totalSessions: stats.totalSessions,
        totalTimePlayed: stats.totalTimePlayed
      };
    }).sort((a: any, b: any) => b.totalTimePlayed - a.totalTimePlayed);
    
    // Estadísticas por juego
    const gamesStats = currentData.games.map((game: Game) => {
      const gameSessions = currentData.sessions.filter((s: Session) => s.gameId === game.id && s.end);
      const totalTime = gameSessions.reduce((total: number, session: Session) => total + session.duration, 0);
      return {
        id: game.id,
        name: game.name,
        totalSessions: gameSessions.length,
        totalTimePlayed: totalTime
      };
    }).sort((a: any, b: any) => b.totalTimePlayed - a.totalTimePlayed);
    
    res.json({
      totalChildren: currentData.children.length,
      totalGames: currentData.games.length,
      totalSessions,
      activeSessions,
      completedSessions,
      totalTimePlayed,
      childrenStats,
      gamesStats,
      averageSessionTime: completedSessions > 0 ? Math.round(totalTimePlayed / completedSessions) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener estadísticas detalladas de un niño
app.get('/children/:id/stats', (req, res) => {
  try {
    const currentData = getPersistentData();
    const childId = parseInt(req.params.id);
    
    const child = currentData.children.find((c: Child) => c.id === childId);
    if (!child) {
      return res.status(404).json({ error: 'Niño no encontrado' });
    }
    
    const childSessions = currentData.sessions.filter((s: Session) => s.childId === childId && s.end);
    const stats = calculateChildStats(childId, currentData.sessions);
    
    // Estadísticas por juego para este niño
    const gameStats = currentData.games.map((game: Game) => {
      const gameSessions = childSessions.filter((s: Session) => s.gameId === game.id);
      const totalTime = gameSessions.reduce((total: number, session: Session) => total + session.duration, 0);
      return {
        gameId: game.id,
        gameName: game.name,
        sessions: gameSessions.length,
        totalTime
      };
    }).filter((stat: any) => stat.sessions > 0).sort((a: any, b: any) => b.totalTime - a.totalTime);
    
    res.json({
      child: {
        id: child.id,
        name: child.displayName,
        fatherName: child.fatherName,
        motherName: child.motherName
      },
      stats,
      gameStats,
      averageSessionTime: stats.totalSessions > 0 ? Math.round(stats.totalTimePlayed / stats.totalSessions) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener reportes por fecha
app.get('/admin/reports', (req, res) => {
  try {
    const currentData = getPersistentData();
    const { startDate, endDate } = req.query;
    
    let filteredSessions = currentData.sessions.filter((s: Session) => s.end);
    
    if (startDate && endDate) {
      const start = new Date(startDate as string).getTime();
      const end = new Date(endDate as string).getTime();
      filteredSessions = filteredSessions.filter((s: Session) => s.start >= start && s.start <= end);
    }
    
    const totalTime = filteredSessions.reduce((total: number, session: Session) => total + session.duration, 0);
    
    res.json({
      period: { startDate, endDate },
      totalSessions: filteredSessions.length,
      totalTimePlayed: totalTime,
      averageSessionTime: filteredSessions.length > 0 ? Math.round(totalTime / filteredSessions.length) : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3010;
// Endpoint para forzar recarga de datos
app.post('/admin/reload', (req, res) => {
  try {
    data = loadData();
    res.json({ message: 'Datos recargados correctamente', data });
  } catch (error) {
    console.error('Error reloading data:', error);
    res.status(500).json({ error: 'Error al recargar datos' });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));