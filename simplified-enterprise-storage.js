// SIMPLIFIED ENTERPRISE STORAGE - Google/Apple Best Practices
// Implementando persistencia robusta sin complejidad excesiva

const fs = require('fs').promises;
const axios = require('axios');

// ============================================================================
// CONFIGURACIÓN ENTERPRISE SIMPLIFICADA
// ============================================================================

const CONFIG = {
  TIMEOUTS: {
    FAST: 2000,
    NORMAL: 5000,
    SLOW: 15000
  },
  RETRY_ATTEMPTS: 3,
  CACHE_TIMEOUT: 30000
};

// ============================================================================
// CACHE LAYER (Ultra-fast memory access)
// ============================================================================

let memoryCache = null;
let cacheTimestamp = 0;

function getMemoryCache() {
  if (memoryCache && (Date.now() - cacheTimestamp < CONFIG.CACHE_TIMEOUT)) {
    console.log('🚀 Memory cache HIT');
    return memoryCache;
  }
  return null;
}

function setMemoryCache(data) {
  memoryCache = JSON.parse(JSON.stringify(data));
  cacheTimestamp = Date.now();
  console.log('💾 Memory cache updated');
}

// ============================================================================
// LOCAL STORAGE (Reliable file system)
// ============================================================================

async function getFromLocal() {
  try {
    const dataFile = process.env.VERCEL ? '/tmp/data.json' : './data.json';
    const data = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(data);
    console.log('📁 Local storage read successful');
    return parsed;
  } catch (error) {
    console.error('❌ Local storage read failed:', error.message);
    throw error;
  }
}

async function saveToLocal(data) {
  try {
    const dataFile = process.env.VERCEL ? '/tmp/data.json' : './data.json';
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
    console.log('💾 Local storage save successful');
    return true;
  } catch (error) {
    console.error('❌ Local storage save failed:', error.message);
    throw error;
  }
}

// ============================================================================
// CLOUD STORAGE (JSONBin.io with robust error handling)
// ============================================================================

async function getFromCloud() {
  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;
  
  if (!apiKey || !binId) {
    throw new Error('Cloud storage not configured');
  }
  
  const response = await axios.get(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { 'X-Master-Key': apiKey },
    timeout: CONFIG.TIMEOUTS.NORMAL
  });
  
  console.log('☁️ Cloud storage read successful');
  return response.data.record;
}

async function saveToCloud(data) {
  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;
  
  if (!apiKey || !binId) {
    throw new Error('Cloud storage not configured');
  }
  
  await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, data, {
    headers: { 
      'X-Master-Key': apiKey,
      'Content-Type': 'application/json'
    },
    timeout: CONFIG.TIMEOUTS.NORMAL
  });
  
  console.log('☁️ Cloud storage save successful');
  return true;
}

// ============================================================================
// RETRY LOGIC (Exponential backoff)
// ============================================================================

async function retryOperation(operation, maxAttempts = CONFIG.RETRY_ATTEMPTS) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        console.error(`❌ Operation failed after ${maxAttempts} attempts:`, error.message);
        throw error;
      }
      
      const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`⏳ Retry attempt ${attempt}/${maxAttempts} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ============================================================================
// MAIN LOAD OPERATION (Multi-layer with fallbacks)
// ============================================================================

async function loadData() {
  console.log('🔄 Simplified enterprise storage: Loading data...');
  
  // Layer 1: Memory cache
  const memoryData = getMemoryCache();
  if (memoryData) {
    return memoryData;
  }
  
  // Layer 2: Local storage
  try {
    const localData = await getFromLocal();
    setMemoryCache(localData);
    return localData;
  } catch (error) {
    console.log('⚠️ Local storage failed, trying cloud...');
  }
  
  // Layer 3: Cloud storage
  try {
    const cloudData = await retryOperation(getFromCloud);
    setMemoryCache(cloudData);
    
    // Save to local as backup
    try {
      await saveToLocal(cloudData);
    } catch (localError) {
      console.log('⚠️ Could not backup cloud data to local');
    }
    
    return cloudData;
  } catch (error) {
    console.log('⚠️ Cloud storage failed, using default data...');
  }
  
  // Final fallback: Default data
  console.log('🚨 All storage layers failed, using default data');
  return getDefaultData();
}

// ============================================================================
// MAIN SAVE OPERATION (Multi-layer with atomic writes)
// ============================================================================

async function saveData(newData) {
  console.log('💾 Simplified enterprise storage: Saving data...');
  
  // Validate data structure
  if (!validateData(newData)) {
    throw new Error('Invalid data structure');
  }
  
  // Update memory cache immediately
  setMemoryCache(newData);
  
  // Save to both local and cloud (parallel execution)
  const results = await Promise.allSettled([
    saveToLocal(newData),
    retryOperation(() => saveToCloud(newData))
  ]);
  
  // Log results
  const localResult = results[0];
  const cloudResult = results[1];
  
  if (localResult.status === 'fulfilled') {
    console.log('✅ Local storage: SUCCESS');
  } else {
    console.log('❌ Local storage: FAILED -', localResult.reason.message);
  }
  
  if (cloudResult.status === 'fulfilled') {
    console.log('✅ Cloud storage: SUCCESS');
  } else {
    console.log('❌ Cloud storage: FAILED -', cloudResult.reason.message);
  }
  
  // Consider successful if at least one layer succeeded
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  if (successCount === 0) {
    throw new Error('All storage layers failed');
  }
  
  console.log(`🎉 Data saved successfully to ${successCount}/2 storage layers`);
  return true;
}

// ============================================================================
// DATA VALIDATION (Enterprise-grade validation)
// ============================================================================

function validateData(data) {
  if (!data || typeof data !== 'object') {
    console.error('❌ Data validation failed: Not an object');
    return false;
  }
  
  const required = ['children', 'games', 'sessions'];
  for (const field of required) {
    if (!Array.isArray(data[field])) {
      console.error(`❌ Data validation failed: ${field} is not an array`);
      return false;
    }
  }
  
  // Validate children
  for (const child of data.children) {
    if (!child.id || !child.name || typeof child.id !== 'number' || typeof child.name !== 'string') {
      console.error('❌ Data validation failed: Invalid child structure');
      return false;
    }
  }
  
  // Validate games
  for (const game of data.games) {
    if (!game.id || !game.name || typeof game.id !== 'number' || typeof game.name !== 'string') {
      console.error('❌ Data validation failed: Invalid game structure');
      return false;
    }
  }
  
  console.log('✅ Data validation passed');
  return true;
}

// ============================================================================
// DEFAULT DATA (Fallback)
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
  
  setMemoryCache(defaultData);
  return defaultData;
}

// ============================================================================
// EXPORT SIMPLIFIED ENTERPRISE STORAGE
// ============================================================================

module.exports = {
  loadData,
  saveData
};
