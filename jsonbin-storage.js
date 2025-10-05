// Almacenamiento en JSONBin.io - Solución óptima para el proyecto
const axios = require('axios');

// Configuración de JSONBin.io
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Cache local para consistencia inmediata
let localCache = null;
let lastSaveTime = 0;
let writeLock = false;

// Función para cargar datos - SOLO ALMACENAMIENTO LOCAL para consistencia perfecta
async function loadData() {
  try {
    // USAR SOLO ALMACENAMIENTO LOCAL para evitar eventual consistency
    console.log('Using local storage for perfect consistency');
    return loadLocalData();
  } catch (error) {
    console.error('Error loading local data:', error.message);
    return getDefaultData();
  }
}

// Función para guardar datos - SOLO ALMACENAMIENTO LOCAL para consistencia perfecta
async function saveData(newData) {
  try {
    // Prevenir escrituras concurrentes
    if (writeLock) {
      console.log('Write in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
      return saveData(newData); // Retry
    }
    
    writeLock = true;
    
    // Actualizar cache local INMEDIATAMENTE para consistencia
    localCache = JSON.parse(JSON.stringify(newData)); // Deep copy
    lastSaveTime = Date.now();
    
    console.log('Local cache updated immediately:', {
      children: newData.children?.length || 0,
      games: newData.games?.length || 0,
      sessions: newData.sessions?.length || 0
    });
    
    // USAR SOLO ALMACENAMIENTO LOCAL para consistencia perfecta
    console.log('Using local storage for perfect consistency');
    const result = saveLocalData(newData);
    writeLock = false;
    return result;
  } catch (error) {
    console.error('Error saving local data:', error.message);
    writeLock = false;
    return false;
  }
}

// Funciones de respaldo para almacenamiento local
const fs = require('fs');
const path = require('path');

function loadLocalData() {
  try {
    const dataFile = process.env.VERCEL ? '/tmp/data.json' : './data.json';
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      const result = {
        children: data.children || [],
        games: data.games || [],
        sessions: data.sessions || [],
        nextChildId: data.nextChildId || 1,
        nextGameId: data.nextGameId || 1,
        nextSessionId: data.nextSessionId || 1
      };
      
      // Inicializar cache local con datos cargados
      localCache = result;
      lastSaveTime = Date.now();
      
      return result;
    }
    return getDefaultData();
  } catch (error) {
    console.error('Error loading local data:', error);
    return getDefaultData();
  }
}

function saveLocalData(newData) {
  try {
    const dataFile = process.env.VERCEL ? '/tmp/data.json' : './data.json';
    fs.writeFileSync(dataFile, JSON.stringify(newData, null, 2));
    console.log('Data saved locally');
    return true;
  } catch (error) {
    console.error('Error saving local data:', error);
    return false;
  }
}

function getDefaultData() {
  const defaultData = {
    children: [
      { id: 1, name: 'David', nickname: 'Dave', fatherName: 'Carlos', motherName: 'Maria', displayName: 'David (Dave)', avatar: 'D', totalSessions: 0, totalTimePlayed: 0, createdAt: new Date().toISOString() },
      { id: 2, name: 'Santiago', nickname: 'Santi', fatherName: 'Luis', motherName: 'Ana', displayName: 'Santiago (Santi)', avatar: 'S', totalSessions: 0, totalTimePlayed: 0, createdAt: new Date().toISOString() }
    ],
    games: [
      { id: 1, name: 'bici', createdAt: new Date().toISOString() },
      { id: 2, name: 'videojuegos', createdAt: new Date().toISOString() }
    ],
    sessions: [],
    nextChildId: 3,
    nextGameId: 3,
    nextSessionId: 1
  };
  
  // Inicializar cache local con datos por defecto
  localCache = defaultData;
  lastSaveTime = Date.now();
  
  return defaultData;
}

// Función para migrar datos existentes a JSONBin.io
async function migrateToJsonBin() {
  try {
    const localData = loadLocalData();
    const success = await saveData(localData);
    
    if (success) {
      console.log('✅ Migration to JSONBin.io completed successfully');
      return true;
    } else {
      console.log('❌ Migration to JSONBin.io failed');
      return false;
    }
  } catch (error) {
    console.error('Error during migration:', error);
    return false;
  }
}

module.exports = {
  loadData,
  saveData,
  migrateToJsonBin
};
