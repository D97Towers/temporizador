// Almacenamiento en JSONBin.io - Solución óptima para el proyecto
const axios = require('axios');

// Configuración de JSONBin.io
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Función para cargar datos desde JSONBin.io
async function loadData() {
  try {
    // Si no hay configuración de JSONBin.io, usar datos locales
    if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
      console.log('JSONBin.io not configured, using local storage');
      return loadLocalData();
    }

    const response = await axios.get(`${JSONBIN_BASE_URL}/${JSONBIN_BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': JSONBIN_API_KEY
      }
    });

    const data = response.data.record;
    console.log('Data loaded from JSONBin.io:', {
      children: data.children?.length || 0,
      games: data.games?.length || 0,
      sessions: data.sessions?.length || 0
    });

    return {
      children: data.children || [],
      games: data.games || [],
      sessions: data.sessions || [],
      nextChildId: data.nextChildId || 1,
      nextGameId: data.nextGameId || 1,
      nextSessionId: data.nextSessionId || 1
    };
  } catch (error) {
    console.error('Error loading from JSONBin.io:', error.message);
    console.log('Falling back to local storage');
    return loadLocalData();
  }
}

// Función para guardar datos en JSONBin.io
async function saveData(newData) {
  try {
    // Si no hay configuración de JSONBin.io, usar almacenamiento local
    if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
      console.log('JSONBin.io not configured, using local storage');
      return saveLocalData(newData);
    }

    await axios.put(`${JSONBIN_BASE_URL}/${JSONBIN_BIN_ID}`, newData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      }
    });

    console.log('Data saved to JSONBin.io successfully');
    return true;
  } catch (error) {
    console.error('Error saving to JSONBin.io:', error.message);
    console.log('Falling back to local storage');
    return saveLocalData(newData);
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
      return {
        children: data.children || [],
        games: data.games || [],
        sessions: data.sessions || [],
        nextChildId: data.nextChildId || 1,
        nextGameId: data.nextGameId || 1,
        nextSessionId: data.nextSessionId || 1
      };
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
  return {
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
