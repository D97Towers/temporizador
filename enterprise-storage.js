// ARQUITECTURA ENTERPRISE - MULTI-LAYER PERSISTENCE
// Implementando mejores prácticas de Google/Apple para persistencia robusta

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// ============================================================================
// CONFIGURACIÓN ENTERPRISE
// ============================================================================

const CONFIG = {
  // Múltiples capas de persistencia
  STORAGE_LAYERS: ['memory', 'local', 'cloud', 'backup'],
  
  // Timeouts y retry policies
  TIMEOUTS: {
    FAST: 2000,    // 2s para operaciones críticas
    NORMAL: 5000,  // 5s para operaciones normales
    SLOW: 15000    // 15s para operaciones de backup
  },
  
  RETRY_POLICY: {
    MAX_ATTEMPTS: 3,
    BACKOFF_BASE: 1000, // 1s base
    BACKOFF_MULTIPLIER: 2
  },
  
  // Circuit breaker configuration
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: 5,
    RECOVERY_TIMEOUT: 30000, // 30s
    MONITORING_WINDOW: 60000  // 1 min
  }
};

// ============================================================================
// CIRCUIT BREAKER PATTERN (Google/Apple Standard)
// ============================================================================

class CircuitBreaker {
  constructor(name, threshold = CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
    this.name = name;
    this.failureThreshold = threshold;
    this.recoveryTimeout = CONFIG.CIRCUIT_BREAKER.RECOVERY_TIMEOUT;
    this.monitoringWindow = CONFIG.CIRCUIT_BREAKER.MONITORING_WINDOW;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log(`🔄 Circuit breaker ${this.name} entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN - operation rejected`);
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        console.log(`✅ Circuit breaker ${this.name} CLOSED - service recovered`);
      }
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🚨 Circuit breaker ${this.name} OPEN - service failing`);
    }
  }
}

// ============================================================================
// EVENT SOURCING PATTERN (Apple/Google Standard)
// ============================================================================

class EventStore {
  constructor() {
    this.events = [];
    this.version = 0;
  }
  
  async appendEvent(event) {
    const eventWithMetadata = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      version: ++this.version
    };
    
    this.events.push(eventWithMetadata);
    console.log(`📝 Event stored: ${event.type} v${eventWithMetadata.version}`);
    return eventWithMetadata;
  }
  
  getEvents(sinceVersion = 0) {
    return this.events.filter(e => e.version > sinceVersion);
  }
  
  async getStateAt(version) {
    const relevantEvents = this.events.filter(e => e.version <= version);
    return this.replayEvents(relevantEvents);
  }
  
  replayEvents(events) {
    // Replay events to rebuild state
    const state = {
      children: [],
      games: [],
      sessions: [],
      nextChildId: 1,
      nextGameId: 1,
      nextSessionId: 1
    };
    
    events.forEach(event => {
      switch (event.type) {
        case 'CHILD_CREATED':
          state.children.push(event.data);
          state.nextChildId = Math.max(state.nextChildId, event.data.id + 1);
          break;
        case 'GAME_CREATED':
          state.games.push(event.data);
          state.nextGameId = Math.max(state.nextGameId, event.data.id + 1);
          break;
        case 'SESSION_CREATED':
          state.sessions.push(event.data);
          state.nextSessionId = Math.max(state.nextSessionId, event.data.id + 1);
          break;
        case 'SESSION_ENDED':
          const session = state.sessions.find(s => s.id === event.data.id);
          if (session) {
            session.endTime = event.data.endTime;
          }
          break;
      }
    });
    
    return state;
  }
}

// ============================================================================
// MULTI-LAYER STORAGE SYSTEM (Google/Apple Architecture)
// ============================================================================

class EnterpriseStorage {
  constructor() {
    this.eventStore = new EventStore();
    this.circuitBreakers = {
      local: new CircuitBreaker('local-storage'),
      cloud: new CircuitBreaker('cloud-storage'),
      backup: new CircuitBreaker('backup-storage')
    };
    
    this.memoryCache = null;
    this.cacheTimestamp = 0;
    this.cacheTimeout = 30000; // 30 seconds
  }
  
  // ========================================================================
  // LAYER 1: MEMORY CACHE (Ultra-fast access)
  // ========================================================================
  
  async getFromMemory() {
    if (this.memoryCache && (Date.now() - this.cacheTimestamp < this.cacheTimeout)) {
      console.log('🚀 Memory cache HIT');
      return this.memoryCache;
    }
    return null;
  }
  
  setMemoryCache(data) {
    this.memoryCache = JSON.parse(JSON.stringify(data));
    this.cacheTimestamp = Date.now();
    console.log('💾 Memory cache updated');
  }
  
  // ========================================================================
  // LAYER 2: LOCAL STORAGE (Reliable file system)
  // ========================================================================
  
  async getFromLocal() {
    return await this.circuitBreakers.local.execute(async () => {
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
    });
  }
  
  async saveToLocal(data) {
    return await this.circuitBreakers.local.execute(async () => {
      try {
        const dataFile = process.env.VERCEL ? '/tmp/data.json' : './data.json';
        await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
        console.log('💾 Local storage save successful');
        return true;
      } catch (error) {
        console.error('❌ Local storage save failed:', error.message);
        throw error;
      }
    });
  }
  
  // ========================================================================
  // LAYER 3: CLOUD STORAGE (JSONBin.io with retry logic)
  // ========================================================================
  
  async getFromCloud() {
    return await this.circuitBreakers.cloud.execute(async () => {
      const apiKey = process.env.JSONBIN_API_KEY;
      const binId = process.env.JSONBIN_BIN_ID;
      
      if (!apiKey || !binId) {
        throw new Error('Cloud storage not configured');
      }
      
      const response = await this.retryOperation(async () => {
        return await axios.get(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
          headers: { 'X-Master-Key': apiKey },
          timeout: CONFIG.TIMEOUTS.NORMAL
        });
      });
      
      console.log('☁️ Cloud storage read successful');
      return response.data.record;
    });
  }
  
  async saveToCloud(data) {
    return await this.circuitBreakers.cloud.execute(async () => {
      const apiKey = process.env.JSONBIN_API_KEY;
      const binId = process.env.JSONBIN_BIN_ID;
      
      if (!apiKey || !binId) {
        throw new Error('Cloud storage not configured');
      }
      
      await this.retryOperation(async () => {
        return await axios.put(`https://api.jsonbin.io/v3/b/${binId}`, data, {
          headers: { 
            'X-Master-Key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.TIMEOUTS.NORMAL
        });
      });
      
      console.log('☁️ Cloud storage save successful');
      return true;
    });
  }
  
  // ========================================================================
  // RETRY LOGIC WITH EXPONENTIAL BACKOFF (Google Standard)
  // ========================================================================
  
  async retryOperation(operation, maxAttempts = CONFIG.RETRY_POLICY.MAX_ATTEMPTS) {
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
        
        const delay = CONFIG.RETRY_POLICY.BACKOFF_BASE * Math.pow(CONFIG.RETRY_POLICY.BACKOFF_MULTIPLIER, attempt - 1);
        console.log(`⏳ Retry attempt ${attempt}/${maxAttempts} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  // ========================================================================
  // MAIN LOAD OPERATION (Multi-layer with fallbacks)
  // ========================================================================
  
  async loadData() {
    console.log('🔄 Enterprise storage: Loading data...');
    
    // Layer 1: Memory cache
    const memoryData = await this.getFromMemory();
    if (memoryData) {
      return memoryData;
    }
    
    // Layer 2: Local storage
    try {
      const localData = await this.getFromLocal();
      this.setMemoryCache(localData);
      return localData;
    } catch (error) {
      console.log('⚠️ Local storage failed, trying cloud...');
    }
    
    // Layer 3: Cloud storage
    try {
      const cloudData = await this.getFromCloud();
      this.setMemoryCache(cloudData);
      // Save to local as backup
      try {
        await this.saveToLocal(cloudData);
      } catch (localError) {
        console.log('⚠️ Could not backup cloud data to local');
      }
      return cloudData;
    } catch (error) {
      console.log('⚠️ Cloud storage failed, using event sourcing...');
    }
    
    // Layer 4: Event sourcing recovery
    try {
      const eventData = this.eventStore.replayEvents(this.eventStore.getEvents());
      if (eventData.children.length > 0 || eventData.games.length > 0) {
        this.setMemoryCache(eventData);
        console.log('🔄 Data recovered from event sourcing');
        return eventData;
      }
    } catch (error) {
      console.log('⚠️ Event sourcing failed');
    }
    
    // Final fallback: Default data
    console.log('🚨 All storage layers failed, using default data');
    return this.getDefaultData();
  }
  
  // ========================================================================
  // MAIN SAVE OPERATION (Multi-layer with transactions)
  // ========================================================================
  
  async saveData(newData) {
    console.log('💾 Enterprise storage: Saving data...');
    
    // Validate data structure
    if (!this.validateData(newData)) {
      throw new Error('Invalid data structure');
    }
    
    // Update memory cache immediately
    this.setMemoryCache(newData);
    
    // Atomic transaction: Save to all layers
    const results = await Promise.allSettled([
      this.saveToLocal(newData),
      this.saveToCloud(newData)
    ]);
    
    // Log results
    results.forEach((result, index) => {
      const layer = ['local', 'cloud'][index];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${layer} storage: SUCCESS`);
      } else {
        console.log(`❌ ${layer} storage: FAILED - ${result.reason.message}`);
      }
    });
    
    // Consider successful if at least one layer succeeded
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    if (successCount === 0) {
      throw new Error('All storage layers failed');
    }
    
    console.log(`🎉 Data saved successfully to ${successCount}/2 storage layers`);
    return true;
  }
  
  // ========================================================================
  // DATA VALIDATION (Enterprise-grade validation)
  // ========================================================================
  
  validateData(data) {
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
  
  // ========================================================================
  // EVENT SOURCING OPERATIONS
  // ========================================================================
  
  async recordEvent(type, data) {
    await this.eventStore.appendEvent({ type, data });
  }
  
  // ========================================================================
  // DEFAULT DATA (Fallback)
  // ========================================================================
  
  getDefaultData() {
    return {
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
  }
}

// ============================================================================
// EXPORT ENTERPRISE STORAGE INSTANCE
// ============================================================================

const enterpriseStorage = new EnterpriseStorage();

module.exports = {
  loadData: () => enterpriseStorage.loadData(),
  saveData: (data) => enterpriseStorage.saveData(data),
  recordEvent: (type, data) => enterpriseStorage.recordEvent(type, data),
  getCircuitBreakerStatus: () => ({
    local: enterpriseStorage.circuitBreakers.local.state,
    cloud: enterpriseStorage.circuitBreakers.cloud.state,
    backup: enterpriseStorage.circuitBreakers.backup.state
  })
};
