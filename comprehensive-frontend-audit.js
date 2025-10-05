#!/usr/bin/env node

const axios = require('axios');

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

class ComprehensiveFrontendAuditor {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.totalTests = 0;
  }

  logTest(testName, passed, details = '', severity = 'info') {
    this.totalTests++;
    const result = { testName, passed, details, severity, timestamp: new Date().toISOString() };
    
    if (passed) {
      this.passed.push(result);
      console.log(`✅ ${testName}${details ? ': ' + details : ''}`);
    } else {
      if (severity === 'error') {
        this.errors.push(result);
        console.log(`❌ ${testName}${details ? ': ' + details : ''}`);
      } else {
        this.warnings.push(result);
        console.log(`⚠️ ${testName}${details ? ': ' + details : ''}`);
      }
    }
  }

  async testBasicConnectivity() {
    console.log('\n🔍 1. AUDITORÍA DE CONECTIVIDAD BÁSICA');
    console.log('='.repeat(60));
    
    try {
      const response = await axios.get(`${PRODUCTION_URL}/admin/status`, { timeout: 10000 });
      this.logTest('Conexión al servidor', response.status === 200, `Status: ${response.status}`);
      
      const data = response.data;
      this.logTest('Estructura de respuesta', !!data && typeof data === 'object', 'Respuesta válida');
      this.logTest('Campo environment', !!data.environment, `Value: ${data.environment}`);
      this.logTest('Campo storage', !!data.storage, `Value: ${data.storage}`);
      this.logTest('Campo children', typeof data.children === 'number', `Value: ${data.children}`);
      this.logTest('Campo games', typeof data.games === 'number', `Value: ${data.games}`);
      this.logTest('Campo sessions', typeof data.sessions === 'number', `Value: ${data.sessions}`);
      this.logTest('Campo activeSessions', typeof data.activeSessions === 'number', `Value: ${data.activeSessions}`);
      
      return data;
    } catch (error) {
      this.logTest('Conexión al servidor', false, error.message, 'error');
      return null;
    }
  }

  async testDataEndpoints() {
    console.log('\n🔍 2. AUDITORÍA DE ENDPOINTS DE DATOS');
    console.log('='.repeat(60));
    
    const endpoints = [
      { path: '/children', name: 'Niños' },
      { path: '/games', name: 'Juegos' },
      { path: '/sessions/active', name: 'Sesiones Activas' },
      { path: '/sessions', name: 'Historial de Sesiones' }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${PRODUCTION_URL}${endpoint.path}`, { timeout: 10000 });
        this.logTest(`GET ${endpoint.path}`, response.status === 200, `Status: ${response.status}`);
        
        const data = response.data;
        this.logTest(`${endpoint.name} - Estructura`, Array.isArray(data), `Tipo: ${Array.isArray(data) ? 'Array' : typeof data}`);
        
        if (Array.isArray(data)) {
          this.logTest(`${endpoint.name} - Longitud`, data.length >= 0, `Items: ${data.length}`);
          
          // Validar estructura de elementos
          if (data.length > 0) {
            const firstItem = data[0];
            this.logTest(`${endpoint.name} - Primer elemento`, !!firstItem, 'Elemento válido');
            
            if (firstItem) {
              // Validaciones específicas por tipo
              if (endpoint.path === '/children') {
                this.logTest(`${endpoint.name} - Campo id`, typeof firstItem.id === 'number', `ID: ${firstItem.id}`);
                this.logTest(`${endpoint.name} - Campo name`, typeof firstItem.name === 'string', `Name: ${firstItem.name}`);
                this.logTest(`${endpoint.name} - Campo displayName`, typeof firstItem.displayName === 'string', `DisplayName: ${firstItem.displayName}`);
              } else if (endpoint.path === '/games') {
                this.logTest(`${endpoint.name} - Campo id`, typeof firstItem.id === 'number', `ID: ${firstItem.id}`);
                this.logTest(`${endpoint.name} - Campo name`, typeof firstItem.name === 'string', `Name: ${firstItem.name}`);
              } else if (endpoint.path === '/sessions/active' || endpoint.path === '/sessions') {
                this.logTest(`${endpoint.name} - Campo id`, typeof firstItem.id === 'number', `ID: ${firstItem.id}`);
                this.logTest(`${endpoint.name} - Campo childId`, typeof firstItem.childId === 'number', `ChildID: ${firstItem.childId}`);
                this.logTest(`${endpoint.name} - Campo gameId`, typeof firstItem.gameId === 'number', `GameID: ${firstItem.gameId}`);
                this.logTest(`${endpoint.name} - Campo duration`, typeof firstItem.duration === 'number', `Duration: ${firstItem.duration}`);
              }
            }
          }
        }
        
        results[endpoint.path] = data;
      } catch (error) {
        this.logTest(`GET ${endpoint.path}`, false, error.message, 'error');
        results[endpoint.path] = null;
      }
    }
    
    return results;
  }

  async testCRUDOperations() {
    console.log('\n🔍 3. AUDITORÍA DE OPERACIONES CRUD');
    console.log('='.repeat(60));
    
    // Test CREATE - Agregar niño
    const testChildName = `TestChild${Date.now()}`;
    try {
      const createResponse = await axios.post(`${PRODUCTION_URL}/children`, {
        name: testChildName,
        nickname: 'TestNick',
        fatherName: 'TestFather',
        motherName: 'TestMother'
      }, { timeout: 10000 });
      
      this.logTest('CREATE Niño', createResponse.status === 201, `Status: ${createResponse.status}`);
      
      if (createResponse.status === 201) {
        const newChild = createResponse.data;
        this.logTest('CREATE Niño - Estructura', !!newChild.id && !!newChild.name, `ID: ${newChild.id}, Name: ${newChild.name}`);
        
        // Test READ - Verificar que el niño existe
        const readResponse = await axios.get(`${PRODUCTION_URL}/children`, { timeout: 10000 });
        const children = readResponse.data;
        const foundChild = children.find(c => c.id === newChild.id);
        this.logTest('READ Niño', !!foundChild, foundChild ? 'Encontrado' : 'No encontrado');
        
        // Test UPDATE - Editar niño
        const updateResponse = await axios.put(`${PRODUCTION_URL}/children/${newChild.id}`, {
          name: `${testChildName}Updated`,
          nickname: 'UpdatedNick',
          fatherName: 'UpdatedFather',
          motherName: 'UpdatedMother'
        }, { timeout: 10000 });
        
        this.logTest('UPDATE Niño', updateResponse.status === 200, `Status: ${updateResponse.status}`);
        
        if (updateResponse.status === 200) {
          const updatedChild = updateResponse.data;
          this.logTest('UPDATE Niño - Campos', updatedChild.name.includes('Updated'), `Name: ${updatedChild.name}`);
        }
      }
    } catch (error) {
      this.logTest('CREATE Niño', false, error.message, 'error');
    }
    
    // Test CREATE - Agregar juego
    const testGameName = `TestGame${Date.now()}`;
    try {
      const createGameResponse = await axios.post(`${PRODUCTION_URL}/games`, {
        name: testGameName
      }, { timeout: 10000 });
      
      this.logTest('CREATE Juego', createGameResponse.status === 201, `Status: ${createGameResponse.status}`);
    } catch (error) {
      this.logTest('CREATE Juego', false, error.message, 'error');
    }
  }

  async testSessionOperations() {
    console.log('\n🔍 4. AUDITORÍA DE OPERACIONES DE SESIONES');
    console.log('='.repeat(60));
    
    try {
      // Obtener niños y juegos disponibles
      const childrenResponse = await axios.get(`${PRODUCTION_URL}/children`, { timeout: 10000 });
      const gamesResponse = await axios.get(`${PRODUCTION_URL}/games`, { timeout: 10000 });
      
      const children = childrenResponse.data;
      const games = gamesResponse.data;
      
      this.logTest('Sesiones - Niños disponibles', children.length > 0, `Count: ${children.length}`);
      this.logTest('Sesiones - Juegos disponibles', games.length > 0, `Count: ${games.length}`);
      
      if (children.length > 0 && games.length > 0) {
        const child = children[0];
        const game = games[0];
        
        // Test START Session
        const startResponse = await axios.post(`${PRODUCTION_URL}/sessions/start`, {
          childId: child.id,
          gameId: game.id,
          duration: 1
        }, { timeout: 10000 });
        
        this.logTest('START Sesión', startResponse.status === 201, `Status: ${startResponse.status}`);
        
        if (startResponse.status === 201) {
          const session = startResponse.data;
          this.logTest('START Sesión - Estructura', !!session.id && !!session.childId && !!session.gameId, `ID: ${session.id}`);
          
          // Test GET Active Sessions
          const activeResponse = await axios.get(`${PRODUCTION_URL}/sessions/active`, { timeout: 10000 });
          const activeSessions = activeResponse.data;
          const foundSession = activeSessions.find(s => s.id === session.id);
          this.logTest('GET Sesiones Activas', !!foundSession, foundSession ? 'Encontrada' : 'No encontrada');
          
          // Test EXTEND Session
          try {
            const extendResponse = await axios.post(`${PRODUCTION_URL}/sessions/extend`, {
              sessionId: session.id,
              additionalTime: 5
            }, { timeout: 10000 });
            
            this.logTest('EXTEND Sesión', extendResponse.status === 200, `Status: ${extendResponse.status}`);
          } catch (error) {
            this.logTest('EXTEND Sesión', false, error.message, 'error');
          }
          
          // Test END Session
          const endResponse = await axios.post(`${PRODUCTION_URL}/sessions/${session.id}/end`, {}, { timeout: 10000 });
          this.logTest('END Sesión', endResponse.status === 200, `Status: ${endResponse.status}`);
          
          // Test GET Session History
          const historyResponse = await axios.get(`${PRODUCTION_URL}/sessions`, { timeout: 10000 });
          const historySessions = historyResponse.data;
          const foundInHistory = historySessions.find(s => s.id === session.id);
          this.logTest('GET Historial Sesiones', !!foundInHistory, foundInHistory ? 'Encontrada en historial' : 'No encontrada');
        }
      }
    } catch (error) {
      this.logTest('Sesiones - Operaciones', false, error.message, 'error');
    }
  }

  async testDataConsistency() {
    console.log('\n🔍 5. AUDITORÍA DE CONSISTENCIA DE DATOS');
    console.log('='.repeat(60));
    
    try {
      // Test múltiples requests simultáneos
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(axios.get(`${PRODUCTION_URL}/children`, { timeout: 10000 }));
        promises.push(axios.get(`${PRODUCTION_URL}/games`, { timeout: 10000 }));
      }
      
      const responses = await Promise.all(promises);
      const childrenResponses = responses.filter((_, index) => index % 2 === 0);
      const gamesResponses = responses.filter((_, index) => index % 2 === 1);
      
      // Verificar consistencia de niños
      const childrenCounts = childrenResponses.map(r => r.data.length);
      const allChildrenSame = childrenCounts.every(count => count === childrenCounts[0]);
      this.logTest('Consistencia Niños - Requests Simultáneos', allChildrenSame, 
        `Conteos: ${childrenCounts.slice(0, 10).join(', ')}${childrenCounts.length > 10 ? '...' : ''}`);
      
      // Verificar consistencia de juegos
      const gamesCounts = gamesResponses.map(r => r.data.length);
      const allGamesSame = gamesCounts.every(count => count === gamesCounts[0]);
      this.logTest('Consistencia Juegos - Requests Simultáneos', allGamesSame, 
        `Conteos: ${gamesCounts.slice(0, 10).join(', ')}${gamesCounts.length > 10 ? '...' : ''}`);
      
      // Test coherencia entre endpoints
      const statusResponse = await axios.get(`${PRODUCTION_URL}/admin/status`, { timeout: 10000 });
      const status = statusResponse.data;
      const actualChildrenResponse = await axios.get(`${PRODUCTION_URL}/children`, { timeout: 10000 });
      const actualGamesResponse = await axios.get(`${PRODUCTION_URL}/games`, { timeout: 10000 });
      
      const childrenCoherent = status.children === actualChildrenResponse.data.length;
      const gamesCoherent = status.games === actualGamesResponse.data.length;
      
      this.logTest('Coherencia Status vs Children', childrenCoherent, 
        `Status: ${status.children}, Real: ${actualChildrenResponse.data.length}`);
      this.logTest('Coherencia Status vs Games', gamesCoherent, 
        `Status: ${status.games}, Real: ${actualGamesResponse.data.length}`);
      
    } catch (error) {
      this.logTest('Consistencia de Datos', false, error.message, 'error');
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 6. AUDITORÍA DE MANEJO DE ERRORES');
    console.log('='.repeat(60));
    
    // Test 404 errors
    try {
      await axios.get(`${PRODUCTION_URL}/nonexistent`, { timeout: 10000 });
      this.logTest('Error 404 - Endpoint Inexistente', false, 'Debería retornar 404', 'error');
    } catch (error) {
      this.logTest('Error 404 - Endpoint Inexistente', error.response?.status === 404, 
        `Status: ${error.response?.status}`, 'error');
    }
    
    // Test 400 errors - Datos inválidos
    try {
      await axios.post(`${PRODUCTION_URL}/children`, {
        // name faltante
        nickname: 'test'
      }, { timeout: 10000 });
      this.logTest('Error 400 - Datos Inválidos', false, 'Debería retornar 400', 'error');
    } catch (error) {
      this.logTest('Error 400 - Datos Inválidos', error.response?.status === 400, 
        `Status: ${error.response?.status}`, 'error');
    }
    
    // Test 404 errors - Recurso no encontrado
    try {
      await axios.put(`${PRODUCTION_URL}/children/999999`, {
        name: 'Test'
      }, { timeout: 10000 });
      this.logTest('Error 404 - Niño No Encontrado', false, 'Debería retornar 404', 'error');
    } catch (error) {
      this.logTest('Error 404 - Niño No Encontrado', error.response?.status === 404, 
        `Status: ${error.response?.status}`, 'error');
    }
  }

  async testPerformance() {
    console.log('\n🔍 7. AUDITORÍA DE RENDIMIENTO');
    console.log('='.repeat(60));
    
    const endpoints = ['/children', '/games', '/sessions/active', '/sessions'];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${PRODUCTION_URL}${endpoint}`, { timeout: 10000 });
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.logTest(`Performance ${endpoint}`, duration < 5000, `${duration}ms`, 
          duration > 2000 ? 'warning' : 'info');
        
        // Test tamaño de respuesta
        const responseSize = JSON.stringify(response.data).length;
        this.logTest(`Response Size ${endpoint}`, responseSize < 1000000, `${responseSize} bytes`, 
          responseSize > 500000 ? 'warning' : 'info');
          
      } catch (error) {
        this.logTest(`Performance ${endpoint}`, false, error.message, 'error');
      }
    }
  }

  generateReport() {
    console.log('\n📊 REPORTE FINAL DE AUDITORÍA');
    console.log('='.repeat(60));
    
    const totalPassed = this.passed.length;
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    
    console.log(`\n📈 ESTADÍSTICAS:`);
    console.log(`✅ Pruebas pasadas: ${totalPassed}/${this.totalTests} (${((totalPassed/this.totalTests)*100).toFixed(1)}%)`);
    console.log(`❌ Errores: ${totalErrors}`);
    console.log(`⚠️ Advertencias: ${totalWarnings}`);
    
    if (totalErrors > 0) {
      console.log(`\n🚨 ERRORES CRÍTICOS:`);
      this.errors.forEach(error => {
        console.log(`   ❌ ${error.testName}: ${error.details}`);
      });
    }
    
    if (totalWarnings > 0) {
      console.log(`\n⚠️ ADVERTENCIAS:`);
      this.warnings.forEach(warning => {
        console.log(`   ⚠️ ${warning.testName}: ${warning.details}`);
      });
    }
    
    if (totalErrors === 0 && totalWarnings === 0) {
      console.log(`\n🎉 ¡AUDITORÍA COMPLETA - TODAS LAS PRUEBAS PASARON!`);
    } else if (totalErrors === 0) {
      console.log(`\n✅ AUDITORÍA COMPLETA - Solo advertencias menores`);
    } else {
      console.log(`\n🚨 AUDITORÍA COMPLETA - Se encontraron errores críticos`);
    }
    
    // Generar reporte detallado
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.totalTests,
        passed: totalPassed,
        errors: totalErrors,
        warnings: totalWarnings,
        successRate: ((totalPassed/this.totalTests)*100).toFixed(1) + '%'
      },
      errors: this.errors,
      warnings: this.warnings,
      passed: this.passed.slice(0, 10) // Solo primeros 10 para no saturar
    };
    
    console.log(`\n📄 Reporte detallado guardado en: audit-report.json`);
    require('fs').writeFileSync('audit-report.json', JSON.stringify(report, null, 2));
  }

  async runFullAudit() {
    console.log('🔍 AUDITORÍA EXHAUSTIVA DEL FRONTEND');
    console.log('='.repeat(60));
    console.log(`🎯 URL: ${PRODUCTION_URL}`);
    console.log(`⏰ Inicio: ${new Date().toISOString()}`);
    
    try {
      await this.testBasicConnectivity();
      await this.testDataEndpoints();
      await this.testCRUDOperations();
      await this.testSessionOperations();
      await this.testDataConsistency();
      await this.testErrorHandling();
      await this.testPerformance();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Error durante la auditoría:', error.message);
    }
  }
}

// Ejecutar auditoría
const auditor = new ComprehensiveFrontendAuditor();
auditor.runFullAudit();
