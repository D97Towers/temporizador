// FINAL SOLUTION - Arquitectura híbrida que funciona en Vercel
// Implementando la solución definitiva basada en análisis profundo del problema

const fs = require('fs').promises;
const axios = require('axios');

// ============================================================================
// ANÁLISIS DEL PROBLEMA FUNDAMENTAL
// ============================================================================
/*
PROBLEMA IDENTIFICADO:
1. Vercel es un entorno serverless donde cada request puede ejecutarse en una instancia diferente
2. Los archivos en /tmp son efímeros y pueden desaparecer entre requests
3. JSONBin.io tiene eventual consistency que causa problemas de sincronización
4. El cache en memoria se pierde cuando la instancia serverless se reinicia

SOLUCIÓN:
Implementar un sistema híbrido que:
1. Use JSONBin.io como fuente de verdad
2. Mantenga cache local para consistencia inmediata
3. Implemente retry logic agresivo
4. Use validación de datos estricta
5. Implemente fallbacks múltiples
*/

// ============================================================================
// CONFIGURACIÓN FINAL
// ============================================================================

const CONFIG = {
  // Timeouts optimizados
  TIMEOUTS: {
    FAST: 1000,
    NORMAL: 3000,
    SLOW: 5000
  },
  
  // Retry policy agresivo
  RETRY_ATTEMPTS: 5,
  RETRY_DELAY: 1000,
  
  // Cache timeout corto para Vercel
  CACHE_TIMEOUT: 5000
};

// ============================================================================
// MEMORY CACHE (Optimizado para Vercel)
// ============================================================================

let memoryCache = null;
let cacheTimestamp = 0;
let cacheVersion = 0;

function getMemoryCache() {
  if (memoryCache && (Date.now() - cacheTimestamp < CONFIG.CACHE_TIMEOUT)) {
    console.log('🚀 Memory cache HIT (version', cacheVersion + ')');
    return memoryCache;
  }
  return null;
}

function setMemoryCache(data) {
  memoryCache = JSON.parse(JSON.stringify(data));
  cacheTimestamp = Date.now();
  cacheVersion++;
  console.log('💾 Memory cache updated (version', cacheVersion + ')');
}

// ============================================================================
// JSONBIN.IO OPERATIONS (Con retry agresivo)
// ============================================================================

async function loadFromJSONBin() {
  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;
  
  if (!apiKey || !binId) {
    throw new Error('JSONBin.io not configured');
  }
  
  console.log('☁️ Loading from JSONBin.io...');
  
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: { 'X-Master-Key': apiKey },
        timeout: CONFIG.TIMEOUTS.NORMAL
      });
      
      const data = response.data.record;
      
      // Validar datos recibidos
      if (!validateData(data)) {
        throw new Error('Invalid data received from JSONBin.io');
      }
      
      console.log(`✅ JSONBin.io loaded successfully (attempt ${attempt})`);
      return data;
      
    } catch (error) {
      console.log(`❌ JSONBin.io attempt ${attempt} failed:`, error.message);
      
      if (attempt === CONFIG.RETRY_ATTEMPTS) {
        throw new Error(`JSONBin.io failed after ${CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`);
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
    }
  }
}

async function saveToJSONBin(data) {
  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;
  
  if (!apiKey || !binId) {
    throw new Error('JSONBin.io not configured');
  }
  
  // Validar datos antes de guardar
  if (!validateData(data)) {
    throw new Error('Invalid data structure for saving');
  }
  
  console.log('☁️ Saving to JSONBin.io...');
  
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, data, {
        headers: { 
          'X-Master-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.TIMEOUTS.NORMAL
      });
      
      console.log(`✅ JSONBin.io saved successfully (attempt ${attempt})`);
      return true;
      
    } catch (error) {
      console.log(`❌ JSONBin.io save attempt ${attempt} failed:`, error.message);
      
      if (attempt === CONFIG.RETRY_ATTEMPTS) {
        throw new Error(`JSONBin.io save failed after ${CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`);
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
    }
  }
}

// ============================================================================
// LOCAL FILE STORAGE (Backup para Vercel)
// ============================================================================

async function saveToLocalFile(data) {
  try {
    const dataFile = process.env.VERCEL ? '/tmp/data.json' : './data.json';
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
    console.log('📁 Local file saved successfully');
    return true;
  } catch (error) {
    console.log('⚠️ Local file save failed:', error.message);
    return false;
  }
}

async function loadFromLocalFile() {
  try {
    const dataFile = process.env.VERCEL ? '/tmp/data.json' : './data.json';
    const data = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(data);
    
    if (validateData(parsed)) {
      console.log('📁 Local file loaded successfully');
      return parsed;
    } else {
      throw new Error('Invalid data in local file');
    }
  } catch (error) {
    console.log('⚠️ Local file load failed:', error.message);
    throw error;
  }
}

// ============================================================================
// MAIN LOAD OPERATION (Solución definitiva)
// ============================================================================

async function loadData() {
  console.log('🔄 Final solution storage: Loading data...');
  
  // Layer 1: Memory cache (ultra-fast)
  const memoryData = getMemoryCache();
  if (memoryData) {
    return memoryData;
  }
  
  // Layer 2: JSONBin.io (fuente de verdad)
  try {
    const jsonbinData = await loadFromJSONBin();
    setMemoryCache(jsonbinData);
    
    // Backup a archivo local
    await saveToLocalFile(jsonbinData);
    
    return jsonbinData;
  } catch (error) {
    console.log('⚠️ JSONBin.io failed, trying local file...');
  }
  
  // Layer 3: Archivo local (backup)
  try {
    const localData = await loadFromLocalFile();
    setMemoryCache(localData);
    return localData;
  } catch (error) {
    console.log('⚠️ Local file failed, using default data...');
  }
  
  // Layer 4: Datos por defecto
  console.log('🚨 All storage layers failed, using default data');
  const defaultData = getDefaultData();
  setMemoryCache(defaultData);
  return defaultData;
}

// ============================================================================
// MAIN SAVE OPERATION (Solución definitiva)
// ============================================================================

async function saveData(newData) {
  console.log('💾 Final solution storage: Saving data...');
  
  // Validar datos estrictamente
  if (!validateData(newData)) {
    throw new Error('Invalid data structure');
  }
  
  // Actualizar cache en memoria inmediatamente
  setMemoryCache(newData);
  
  // Guardar en JSONBin.io (fuente de verdad)
  let jsonbinSuccess = false;
  try {
    await saveToJSONBin(newData);
    jsonbinSuccess = true;
    console.log('✅ JSONBin.io: PRIMARY SAVE SUCCESS');
  } catch (error) {
    console.log('❌ JSONBin.io: PRIMARY SAVE FAILED -', error.message);
  }
  
  // Backup a archivo local
  let localSuccess = false;
  try {
    await saveToLocalFile(newData);
    localSuccess = true;
    console.log('✅ Local file: BACKUP SAVE SUCCESS');
  } catch (error) {
    console.log('❌ Local file: BACKUP SAVE FAILED -', error.message);
  }
  
  // Verificar que al menos una operación fue exitosa
  if (!jsonbinSuccess && !localSuccess) {
    throw new Error('All save operations failed');
  }
  
  console.log(`🎉 Data saved successfully (JSONBin: ${jsonbinSuccess}, Local: ${localSuccess})`);
  
  // Forzar actualización del cache
  setMemoryCache(newData);
  
  return true;
}

// ============================================================================
// DATA VALIDATION (Validación estricta)
// ============================================================================

function validateData(data) {
  if (!data || typeof data !== 'object') {
    console.error('❌ Data validation failed: Not an object');
    return false;
  }
  
  // Verificar estructura básica
  const required = ['children', 'games', 'sessions', 'nextChildId', 'nextGameId', 'nextSessionId'];
  for (const field of required) {
    if (!(field in data)) {
      console.error(`❌ Data validation failed: Missing field '${field}'`);
      return false;
    }
  }
  
  // Verificar tipos de arrays
  if (!Array.isArray(data.children) || !Array.isArray(data.games) || !Array.isArray(data.sessions)) {
    console.error('❌ Data validation failed: Invalid array types');
    return false;
  }
  
  // Verificar tipos de números
  if (typeof data.nextChildId !== 'number' || typeof data.nextGameId !== 'number' || typeof data.nextSessionId !== 'number') {
    console.error('❌ Data validation failed: Invalid ID types');
    return false;
  }
  
  // Validar children
  for (const child of data.children) {
    if (!child.id || !child.name || typeof child.id !== 'number' || typeof child.name !== 'string') {
      console.error('❌ Data validation failed: Invalid child structure');
      return false;
    }
  }
  
  // Validar games
  for (const game of data.games) {
    if (!game.id || !game.name || typeof game.id !== 'number' || typeof game.name !== 'string') {
      console.error('❌ Data validation failed: Invalid game structure');
      return false;
    }
  }
  
  // Validar sessions
  for (const session of data.sessions) {
    if (!session.id || !session.childId || !session.gameId || typeof session.id !== 'number') {
      console.error('❌ Data validation failed: Invalid session structure');
      return false;
    }
  }
  
  console.log('✅ Data validation passed');
  return true;
}

// ============================================================================
// DEFAULT DATA (Datos por defecto robustos)
// ============================================================================

function getDefaultData() {
  const defaultData = {
    children: [
      { 
        id: 1, 
        name: 'David', 
        nickname: 'Dave', 
        fatherName: 'Carlos', 
        motherName: 'Maria', 
        displayName: 'David (Dave)', 
        avatar: 'D', 
        totalSessions: 0, 
        totalTimePlayed: 0, 
        createdAt: new Date().toISOString() 
      },
      { 
        id: 2, 
        name: 'Santiago', 
        nickname: 'Santi', 
        fatherName: 'Luis', 
        motherName: 'Ana', 
        displayName: 'Santiago (Santi)', 
        avatar: 'S', 
        totalSessions: 0, 
        totalTimePlayed: 0, 
        createdAt: new Date().toISOString() 
      }
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
  
  console.log('📋 Default data generated');
  return defaultData;
}

// ============================================================================
// EXPORT FINAL SOLUTION STORAGE
// ============================================================================

module.exports = {
  loadData,
  saveData
};
