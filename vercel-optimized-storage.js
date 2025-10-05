// VERCEL-OPTIMIZED STORAGE - Solución definitiva para Vercel
// Implementando persistencia que funciona específicamente en serverless

const fs = require('fs').promises;
const axios = require('axios');

// ============================================================================
// CONFIGURACIÓN VERCEL-OPTIMIZED
// ============================================================================

const CONFIG = {
  // En Vercel, usar múltiples archivos para mayor confiabilidad
  STORAGE_FILES: {
    primary: '/tmp/data.json',
    backup: '/tmp/data_backup.json',
    temp: '/tmp/data_temp.json'
  },
  
  // Timeouts optimizados para Vercel
  TIMEOUTS: {
    FAST: 1000,
    NORMAL: 3000,
    SLOW: 8000
  },
  
  // Retry policy para Vercel
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 500
};

// ============================================================================
// MEMORY CACHE (Ultra-fast access)
// ============================================================================

let memoryCache = null;
let cacheTimestamp = 0;
let cacheTimeout = 10000; // 10 seconds for Vercel

function getMemoryCache() {
  if (memoryCache && (Date.now() - cacheTimestamp < cacheTimeout)) {
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
// VERCEL FILE STORAGE (Multiple files for reliability)
// ============================================================================

async function saveToVercelFiles(data) {
  const writePromises = [];
  
  // Write to multiple files for reliability
  for (const [name, filePath] of Object.entries(CONFIG.STORAGE_FILES)) {
    writePromises.push(
      fs.writeFile(filePath, JSON.stringify(data, null, 2)).catch(error => {
        console.log(`⚠️ Failed to write to ${name}:`, error.message);
        return false;
      })
    );
  }
  
  const results = await Promise.allSettled(writePromises);
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  
  if (successCount > 0) {
    console.log(`✅ Vercel files: ${successCount}/${writePromises.length} files written successfully`);
    return true;
  } else {
    throw new Error('All Vercel file writes failed');
  }
}

async function loadFromVercelFiles() {
  // Try to load from files in order of preference
  for (const [name, filePath] of Object.entries(CONFIG.STORAGE_FILES)) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      console.log(`📁 Vercel file loaded from ${name}`);
      return parsed;
    } catch (error) {
      console.log(`⚠️ Failed to load from ${name}:`, error.message);
    }
  }
  
  throw new Error('All Vercel files failed to load');
}

// ============================================================================
// CLOUD STORAGE (JSONBin.io with aggressive retry)
// ============================================================================

async function saveToCloud(data) {
  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;
  
  if (!apiKey || !binId) {
    throw new Error('Cloud storage not configured');
  }
  
  // Aggressive retry for cloud storage
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, data, {
        headers: { 
          'X-Master-Key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.TIMEOUTS.NORMAL
      });
      
      console.log(`✅ Cloud storage: SUCCESS (attempt ${attempt})`);
      return true;
    } catch (error) {
      console.log(`❌ Cloud storage attempt ${attempt} failed:`, error.message);
      
      if (attempt === CONFIG.RETRY_ATTEMPTS) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
    }
  }
}

async function loadFromCloud() {
  const apiKey = process.env.JSONBIN_API_KEY;
  const binId = process.env.JSONBIN_BIN_ID;
  
  if (!apiKey || !binId) {
    throw new Error('Cloud storage not configured');
  }
  
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: { 'X-Master-Key': apiKey },
        timeout: CONFIG.TIMEOUTS.NORMAL
      });
      
      console.log(`✅ Cloud storage read: SUCCESS (attempt ${attempt})`);
      return response.data.record;
    } catch (error) {
      console.log(`❌ Cloud read attempt ${attempt} failed:`, error.message);
      
      if (attempt === CONFIG.RETRY_ATTEMPTS) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
    }
  }
}

// ============================================================================
// MAIN LOAD OPERATION (Vercel-optimized)
// ============================================================================

async function loadData() {
  console.log('🔄 Vercel-optimized storage: Loading data...');
  
  // Layer 1: Memory cache
  const memoryData = getMemoryCache();
  if (memoryData) {
    return memoryData;
  }
  
  // Layer 2: Vercel files (primary)
  try {
    const fileData = await loadFromVercelFiles();
    setMemoryCache(fileData);
    return fileData;
  } catch (error) {
    console.log('⚠️ Vercel files failed, trying cloud...');
  }
  
  // Layer 3: Cloud storage
  try {
    const cloudData = await loadFromCloud();
    setMemoryCache(cloudData);
    
    // Immediately backup to Vercel files
    try {
      await saveToVercelFiles(cloudData);
    } catch (backupError) {
      console.log('⚠️ Could not backup cloud data to Vercel files');
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
// MAIN SAVE OPERATION (Vercel-optimized with immediate persistence)
// ============================================================================

async function saveData(newData) {
  console.log('💾 Vercel-optimized storage: Saving data...');
  
  // Validate data structure
  if (!validateData(newData)) {
    throw new Error('Invalid data structure');
  }
  
  // Update memory cache immediately
  setMemoryCache(newData);
  
  // Save to Vercel files first (fastest)
  let vercelSuccess = false;
  try {
    await saveToVercelFiles(newData);
    vercelSuccess = true;
    console.log('✅ Vercel files: IMMEDIATE SUCCESS');
  } catch (error) {
    console.log('❌ Vercel files: FAILED -', error.message);
  }
  
  // Then try cloud storage (in background)
  let cloudSuccess = false;
  try {
    await saveToCloud(newData);
    cloudSuccess = true;
    console.log('✅ Cloud storage: SUCCESS');
  } catch (error) {
    console.log('❌ Cloud storage: FAILED -', error.message);
  }
  
  // Consider successful if at least one layer succeeded
  if (!vercelSuccess && !cloudSuccess) {
    throw new Error('All storage layers failed');
  }
  
  const successCount = (vercelSuccess ? 1 : 0) + (cloudSuccess ? 1 : 0);
  console.log(`🎉 Data saved successfully to ${successCount}/2 storage layers`);
  
  // Force cache refresh to ensure consistency
  setMemoryCache(newData);
  
  return true;
}

// ============================================================================
// DATA VALIDATION (Enhanced for Vercel)
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
// DEFAULT DATA (Vercel-optimized)
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
// EXPORT VERCEL-OPTIMIZED STORAGE
// ============================================================================

module.exports = {
  loadData,
  saveData
};
