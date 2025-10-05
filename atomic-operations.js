// ATOMIC OPERATIONS WITH TRANSACTIONS (Google/Apple Standard)
// Implementando operaciones atómicas para garantizar consistencia de datos

const enterpriseStorage = require('./enterprise-storage');

// ============================================================================
// TRANSACTION MANAGER (Database-like transactions)
// ============================================================================

class TransactionManager {
  constructor() {
    this.activeTransactions = new Map();
    this.transactionTimeout = 30000; // 30 seconds
  }
  
  async beginTransaction() {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Load current state as snapshot
    const snapshot = await enterpriseStorage.loadData();
    
    const transaction = {
      id: transactionId,
      startTime,
      snapshot: JSON.parse(JSON.stringify(snapshot)), // Deep copy
      operations: [],
      status: 'ACTIVE'
    };
    
    this.activeTransactions.set(transactionId, transaction);
    
    console.log(`🔄 Transaction ${transactionId} started`);
    return transactionId;
  }
  
  async commitTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      console.error(`Transaction ${transactionId} not found in active transactions:`, Array.from(this.activeTransactions.keys()));
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    if (transaction.status !== 'ACTIVE') {
      throw new Error(`Transaction ${transactionId} is not active`);
    }
    
    try {
      // Apply all operations atomically
      const finalData = this.applyOperations(transaction.snapshot, transaction.operations);
      
      // Validate final state
      if (!this.validateTransactionData(finalData)) {
        throw new Error('Transaction validation failed');
      }
      
      // Save atomically
      await enterpriseStorage.saveData(finalData);
      
      // Record events for audit
      for (const operation of transaction.operations) {
        await enterpriseStorage.recordEvent(operation.type, operation.data);
      }
      
      transaction.status = 'COMMITTED';
      this.activeTransactions.delete(transactionId);
      
      console.log(`✅ Transaction ${transactionId} committed successfully`);
      return true;
      
    } catch (error) {
      transaction.status = 'FAILED';
      this.activeTransactions.delete(transactionId);
      console.error(`❌ Transaction ${transactionId} failed:`, error.message);
      throw error;
    }
  }
  
  async rollbackTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    transaction.status = 'ROLLED_BACK';
    this.activeTransactions.delete(transactionId);
    
    console.log(`🔄 Transaction ${transactionId} rolled back`);
    return true;
  }
  
  applyOperations(snapshot, operations) {
    const data = JSON.parse(JSON.stringify(snapshot)); // Deep copy
    
    for (const operation of operations) {
      switch (operation.type) {
        case 'CREATE_CHILD':
          data.children.push(operation.data);
          data.nextChildId = Math.max(data.nextChildId, operation.data.id + 1);
          break;
          
        case 'UPDATE_CHILD':
          const childIndex = data.children.findIndex(c => c.id === operation.data.id);
          if (childIndex !== -1) {
            data.children[childIndex] = { ...data.children[childIndex], ...operation.data };
          }
          break;
          
        case 'DELETE_CHILD':
          data.children = data.children.filter(c => c.id !== operation.data.id);
          data.sessions = data.sessions.filter(s => s.childId !== operation.data.id);
          break;
          
        case 'CREATE_GAME':
          data.games.push(operation.data);
          data.nextGameId = Math.max(data.nextGameId, operation.data.id + 1);
          break;
          
        case 'UPDATE_GAME':
          const gameIndex = data.games.findIndex(g => g.id === operation.data.id);
          if (gameIndex !== -1) {
            data.games[gameIndex] = { ...data.games[gameIndex], ...operation.data };
          }
          break;
          
        case 'DELETE_GAME':
          data.games = data.games.filter(g => g.id !== operation.data.id);
          data.sessions = data.sessions.filter(s => s.gameId !== operation.data.id);
          break;
          
        case 'CREATE_SESSION':
          data.sessions.push(operation.data);
          data.nextSessionId = Math.max(data.nextSessionId, operation.data.id + 1);
          break;
          
        case 'END_SESSION':
          const sessionIndex = data.sessions.findIndex(s => s.id === operation.data.id);
          if (sessionIndex !== -1) {
            data.sessions[sessionIndex].endTime = operation.data.endTime;
          }
          break;
          
        case 'EXTEND_SESSION':
          const extendSessionIndex = data.sessions.findIndex(s => s.id === operation.data.id);
          if (extendSessionIndex !== -1) {
            data.sessions[extendSessionIndex].duration += operation.data.additionalTime;
          }
          break;
      }
    }
    
    return data;
  }
  
  validateTransactionData(data) {
    // Validate data structure
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.children)) return false;
    if (!Array.isArray(data.games)) return false;
    if (!Array.isArray(data.sessions)) return false;
    
    // Validate IDs are unique
    const childIds = data.children.map(c => c.id);
    const gameIds = data.games.map(g => g.id);
    const sessionIds = data.sessions.map(s => s.id);
    
    if (new Set(childIds).size !== childIds.length) return false;
    if (new Set(gameIds).size !== gameIds.length) return false;
    if (new Set(sessionIds).size !== sessionIds.length) return false;
    
    return true;
  }
  
  // Cleanup expired transactions
  cleanupExpiredTransactions() {
    const now = Date.now();
    for (const [id, transaction] of this.activeTransactions) {
      if (now - transaction.startTime > this.transactionTimeout) {
        console.log(`⏰ Transaction ${id} expired, cleaning up`);
        this.activeTransactions.delete(id);
      }
    }
  }
}

// ============================================================================
// ATOMIC OPERATIONS (Business Logic with Transactions)
// ============================================================================

class AtomicOperations {
  constructor() {
    this.transactionManager = new TransactionManager();
    
    // Cleanup expired transactions every minute
    setInterval(() => {
      this.transactionManager.cleanupExpiredTransactions();
    }, 60000);
  }
  
  // ========================================================================
  // CHILD OPERATIONS
  // ========================================================================
  
  async createChild(childData) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      // Validate input
      if (!childData.name || typeof childData.name !== 'string') {
        throw new Error('Child name is required and must be a string');
      }
      
      // Check for duplicates
      const currentData = await enterpriseStorage.loadData();
      const existingChild = currentData.children.find(c => 
        c.name.toLowerCase() === childData.name.toLowerCase()
      );
      
      if (existingChild) {
        throw new Error('Child with this name already exists');
      }
      
      // Generate new child
      const newChild = {
        id: currentData.nextChildId,
        name: childData.name.trim(),
        nickname: childData.nickname?.trim() || null,
        fatherName: childData.fatherName?.trim() || null,
        motherName: childData.motherName?.trim() || null,
        displayName: this.generateDisplayName(childData.name, childData.nickname),
        avatar: this.generateAvatar(childData.name),
        totalSessions: 0,
        totalTimePlayed: 0,
        createdAt: new Date().toISOString()
      };
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'CREATE_CHILD',
        data: newChild
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Child created atomically: ${newChild.name}`);
      return newChild;
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  async updateChild(childId, updateData) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      const currentData = await enterpriseStorage.loadData();
      const child = currentData.children.find(c => c.id === childId);
      
      if (!child) {
        throw new Error('Child not found');
      }
      
      // Validate updates
      const validatedUpdates = {};
      if (updateData.name) {
        if (typeof updateData.name !== 'string') {
          throw new Error('Name must be a string');
        }
        validatedUpdates.name = updateData.name.trim();
        
        // Check for duplicate names (excluding current child)
        const duplicate = currentData.children.find(c => 
          c.id !== childId && c.name.toLowerCase() === updateData.name.toLowerCase()
        );
        if (duplicate) {
          throw new Error('Child with this name already exists');
        }
      }
      
      if (updateData.nickname !== undefined) {
        validatedUpdates.nickname = updateData.nickname?.trim() || null;
      }
      
      if (updateData.fatherName !== undefined) {
        validatedUpdates.fatherName = updateData.fatherName?.trim() || null;
      }
      
      if (updateData.motherName !== undefined) {
        validatedUpdates.motherName = updateData.motherName?.trim() || null;
      }
      
      // Update display name if name or nickname changed
      if (validatedUpdates.name || validatedUpdates.nickname !== undefined) {
        validatedUpdates.displayName = this.generateDisplayName(
          validatedUpdates.name || child.name,
          validatedUpdates.nickname !== undefined ? validatedUpdates.nickname : child.nickname
        );
      }
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'UPDATE_CHILD',
        data: { id: childId, ...validatedUpdates }
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Child updated atomically: ID ${childId}`);
      return { id: childId, ...validatedUpdates };
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  async deleteChild(childId) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      const currentData = await enterpriseStorage.loadData();
      const child = currentData.children.find(c => c.id === childId);
      
      if (!child) {
        throw new Error('Child not found');
      }
      
      // Check for active sessions
      const activeSessions = currentData.sessions.filter(s => 
        s.childId === childId && !s.endTime
      );
      
      if (activeSessions.length > 0) {
        throw new Error('Cannot delete child with active sessions');
      }
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'DELETE_CHILD',
        data: { id: childId }
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Child deleted atomically: ${child.name}`);
      return child;
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  // ========================================================================
  // GAME OPERATIONS
  // ========================================================================
  
  async createGame(gameData) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      // Validate input
      if (!gameData.name || typeof gameData.name !== 'string') {
        throw new Error('Game name is required and must be a string');
      }
      
      // Check for duplicates
      const currentData = await enterpriseStorage.loadData();
      const existingGame = currentData.games.find(g => 
        g.name.toLowerCase() === gameData.name.toLowerCase()
      );
      
      if (existingGame) {
        throw new Error('Game with this name already exists');
      }
      
      // Generate new game
      const newGame = {
        id: currentData.nextGameId,
        name: gameData.name.trim(),
        createdAt: new Date().toISOString()
      };
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'CREATE_GAME',
        data: newGame
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Game created atomically: ${newGame.name}`);
      return newGame;
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  async deleteGame(gameId) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      const currentData = await enterpriseStorage.loadData();
      const game = currentData.games.find(g => g.id === gameId);
      
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Check for active sessions
      const activeSessions = currentData.sessions.filter(s => 
        s.gameId === gameId && !s.endTime
      );
      
      if (activeSessions.length > 0) {
        throw new Error('Cannot delete game with active sessions');
      }
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'DELETE_GAME',
        data: { id: gameId }
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Game deleted atomically: ${game.name}`);
      return game;
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  // ========================================================================
  // SESSION OPERATIONS
  // ========================================================================
  
  async createSession(sessionData) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      const currentData = await enterpriseStorage.loadData();
      
      // Validate child exists
      const child = currentData.children.find(c => c.id === sessionData.childId);
      if (!child) {
        throw new Error('Child not found');
      }
      
      // Validate game exists
      const game = currentData.games.find(g => g.id === sessionData.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      // Validate duration
      if (!sessionData.duration || sessionData.duration < 1 || sessionData.duration > 180) {
        throw new Error('Duration must be between 1 and 180 minutes');
      }
      
      // Check for existing active session
      const existingSession = currentData.sessions.find(s => 
        s.childId === sessionData.childId && !s.endTime
      );
      
      if (existingSession) {
        throw new Error('Child already has an active session');
      }
      
      // Generate new session
      const newSession = {
        id: currentData.nextSessionId,
        childId: sessionData.childId,
        gameId: sessionData.gameId,
        duration: sessionData.duration,
        startTime: Date.now(),
        endTime: null,
        createdAt: new Date().toISOString()
      };
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'CREATE_SESSION',
        data: newSession
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Session created atomically: Child ${child.name} - Game ${game.name}`);
      return newSession;
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  async endSession(sessionId) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      const currentData = await enterpriseStorage.loadData();
      const session = currentData.sessions.find(s => s.id === sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      if (session.endTime) {
        throw new Error('Session is already ended');
      }
      
      const endTime = Date.now();
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'END_SESSION',
        data: { id: sessionId, endTime }
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Session ended atomically: ID ${sessionId}`);
      return { ...session, endTime };
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  async extendSession(sessionId, additionalTime) {
    const transactionId = await this.transactionManager.beginTransaction();
    
    try {
      const currentData = await enterpriseStorage.loadData();
      const session = currentData.sessions.find(s => s.id === sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      if (session.endTime) {
        throw new Error('Cannot extend ended session');
      }
      
      if (!additionalTime || additionalTime < 1 || additionalTime > 60) {
        throw new Error('Additional time must be between 1 and 60 minutes');
      }
      
      // Add operation to transaction
      const transaction = this.transactionManager.activeTransactions.get(transactionId);
      transaction.operations.push({
        type: 'EXTEND_SESSION',
        data: { id: sessionId, additionalTime }
      });
      
      // Commit transaction
      await this.transactionManager.commitTransaction(transactionId);
      
      console.log(`✅ Session extended atomically: ID ${sessionId} +${additionalTime}min`);
      return { ...session, duration: session.duration + additionalTime };
      
    } catch (error) {
      await this.transactionManager.rollbackTransaction(transactionId);
      throw error;
    }
  }
  
  // ========================================================================
  // UTILITY METHODS
  // ========================================================================
  
  generateDisplayName(name, nickname) {
    return nickname ? `${name} (${nickname})` : name;
  }
  
  generateAvatar(name) {
    return name.charAt(0).toUpperCase();
  }
  
  // Get transaction status
  getTransactionStatus() {
    return {
      activeTransactions: this.transactionManager.activeTransactions.size,
      circuitBreakerStatus: enterpriseStorage.getCircuitBreakerStatus()
    };
  }
}

// ============================================================================
// EXPORT ATOMIC OPERATIONS INSTANCE
// ============================================================================

const atomicOperations = new AtomicOperations();

module.exports = {
  // Child operations
  createChild: (data) => atomicOperations.createChild(data),
  updateChild: (id, data) => atomicOperations.updateChild(id, data),
  deleteChild: (id) => atomicOperations.deleteChild(id),
  
  // Game operations
  createGame: (data) => atomicOperations.createGame(data),
  deleteGame: (id) => atomicOperations.deleteGame(id),
  
  // Session operations
  createSession: (data) => atomicOperations.createSession(data),
  endSession: (id) => atomicOperations.endSession(id),
  extendSession: (id, time) => atomicOperations.extendSession(id, time),
  
  // Status
  getStatus: () => atomicOperations.getTransactionStatus()
};
