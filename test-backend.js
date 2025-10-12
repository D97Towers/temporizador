/**
 * SISTEMA DE PRUEBAS COMPLETAS PARA BACKEND
 * Verifica todos los endpoints y funcionalidades sin afectar datos reales
 */

const express = require('express');
const request = require('supertest');

// Importar el servidor principal
const app = require('./index.js');

class BackendTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Iniciando pruebas completas del backend...');
    
    // Test 1: Verificar que el servidor se inicia
    await this.testServerStartup();
    
    // Test 2: Verificar endpoints básicos
    await this.testBasicEndpoints();
    
    // Test 3: Verificar endpoints de niños
    await this.testChildrenEndpoints();
    
    // Test 4: Verificar endpoints de juegos
    await this.testGamesEndpoints();
    
    // Test 5: Verificar endpoints de sesiones
    await this.testSessionsEndpoints();
    
    // Test 6: Verificar manejo de errores
    await this.testErrorHandling();
    
    // Test 7: Verificar validaciones
    await this.testValidations();
    
    this.displayResults();
    return this.results;
  }

  async testServerStartup() {
    console.log('📋 Probando inicio del servidor...');
    
    try {
      // Verificar que el servidor responde
      const response = await request(app).get('/');
      this.addTest('Servidor responde', response.status === 200 || response.status === 404, 
                   `Status: ${response.status}`);
      
      // Verificar que el servidor tiene las rutas configuradas
      const healthResponse = await request(app).get('/health');
      this.addTest('Endpoint de salud', healthResponse.status === 200 || healthResponse.status === 404,
                   `Health check status: ${healthResponse.status}`);
      
    } catch (error) {
      this.addTest('Servidor se inicia', false, `Error: ${error.message}`);
    }
  }

  async testBasicEndpoints() {
    console.log('📋 Probando endpoints básicos...');
    
    const endpoints = [
      { path: '/', method: 'GET', expectedStatus: [200, 404] },
      { path: '/health', method: 'GET', expectedStatus: [200, 404] },
      { path: '/api/status', method: 'GET', expectedStatus: [200, 404] }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await request(app)[endpoint.method.toLowerCase()](endpoint.path);
        const isExpected = endpoint.expectedStatus.includes(response.status);
        this.addTest(`${endpoint.method} ${endpoint.path}`, isExpected,
                     `Status: ${response.status}, Expected: ${endpoint.expectedStatus.join(' or ')}`);
      } catch (error) {
        this.addTest(`${endpoint.method} ${endpoint.path}`, false, `Error: ${error.message}`);
      }
    }
  }

  async testChildrenEndpoints() {
    console.log('📋 Probando endpoints de niños...');
    
    // Test GET /children
    try {
      const response = await request(app).get('/children');
      this.addTest('GET /children', response.status === 200, 
                   `Status: ${response.status}, Body: ${JSON.stringify(response.body).substring(0, 100)}...`);
    } catch (error) {
      this.addTest('GET /children', false, `Error: ${error.message}`);
    }

    // Test POST /children con datos válidos
    try {
      const validChildData = {
        name: 'Test Child',
        nickname: 'Test',
        fatherName: 'Test Father',
        motherName: 'Test Mother'
      };
      
      const response = await request(app)
        .post('/children')
        .send(validChildData);
      
      this.addTest('POST /children (datos válidos)', response.status === 201, 
                   `Status: ${response.status}, Message: ${response.body.message || 'No message'}`);
    } catch (error) {
      this.addTest('POST /children (datos válidos)', false, `Error: ${error.message}`);
    }

    // Test POST /children con datos inválidos
    try {
      const invalidChildData = {
        name: '', // Nombre vacío
        fatherName: 'Test Father'
      };
      
      const response = await request(app)
        .post('/children')
        .send(invalidChildData);
      
      this.addTest('POST /children (datos inválidos)', response.status === 400, 
                   `Status: ${response.status}, Should reject invalid data`);
    } catch (error) {
      this.addTest('POST /children (datos inválidos)', false, `Error: ${error.message}`);
    }
  }

  async testGamesEndpoints() {
    console.log('📋 Probando endpoints de juegos...');
    
    // Test GET /games
    try {
      const response = await request(app).get('/games');
      this.addTest('GET /games', response.status === 200, 
                   `Status: ${response.status}, Games count: ${response.body.length || 0}`);
    } catch (error) {
      this.addTest('GET /games', false, `Error: ${error.message}`);
    }

    // Test POST /games con datos válidos
    try {
      const validGameData = {
        name: 'Test Game',
        description: 'Test Description'
      };
      
      const response = await request(app)
        .post('/games')
        .send(validGameData);
      
      this.addTest('POST /games (datos válidos)', response.status === 201, 
                   `Status: ${response.status}, Message: ${response.body.message || 'No message'}`);
    } catch (error) {
      this.addTest('POST /games (datos válidos)', false, `Error: ${error.message}`);
    }
  }

  async testSessionsEndpoints() {
    console.log('📋 Probando endpoints de sesiones...');
    
    // Test GET /sessions/active
    try {
      const response = await request(app).get('/sessions/active');
      this.addTest('GET /sessions/active', response.status === 200, 
                   `Status: ${response.status}, Active sessions: ${response.body.length || 0}`);
    } catch (error) {
      this.addTest('GET /sessions/active', false, `Error: ${error.message}`);
    }

    // Test GET /sessions
    try {
      const response = await request(app).get('/sessions');
      this.addTest('GET /sessions', response.status === 200, 
                   `Status: ${response.status}, All sessions: ${response.body.length || 0}`);
    } catch (error) {
      this.addTest('GET /sessions', false, `Error: ${error.message}`);
    }

    // Test POST /sessions con datos válidos
    try {
      const validSessionData = {
        child_id: 'test-child-id',
        game_id: 'test-game-id',
        duration: 30
      };
      
      const response = await request(app)
        .post('/sessions')
        .send(validSessionData);
      
      this.addTest('POST /sessions (datos válidos)', response.status === 201, 
                   `Status: ${response.status}, Message: ${response.body.message || 'No message'}`);
    } catch (error) {
      this.addTest('POST /sessions (datos válidos)', false, `Error: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('📋 Probando manejo de errores...');
    
    // Test endpoint inexistente
    try {
      const response = await request(app).get('/nonexistent-endpoint');
      this.addTest('Endpoint inexistente', response.status === 404, 
                   `Status: ${response.status}, Should return 404`);
    } catch (error) {
      this.addTest('Endpoint inexistente', false, `Error: ${error.message}`);
    }

    // Test método no permitido
    try {
      const response = await request(app).delete('/children');
      this.addTest('Método no permitido', response.status === 405, 
                   `Status: ${response.status}, Should return 405`);
    } catch (error) {
      this.addTest('Método no permitido', false, `Error: ${error.message}`);
    }
  }

  async testValidations() {
    console.log('📋 Probando validaciones...');
    
    // Test validación de datos requeridos
    try {
      const response = await request(app)
        .post('/children')
        .send({}); // Datos vacíos
      
      this.addTest('Validación datos requeridos', response.status === 400, 
                   `Status: ${response.status}, Should validate required fields`);
    } catch (error) {
      this.addTest('Validación datos requeridos', false, `Error: ${error.message}`);
    }

    // Test validación de tipos de datos
    try {
      const response = await request(app)
        .post('/sessions')
        .send({
          child_id: 'test',
          game_id: 'test',
          duration: 'invalid' // Duración inválida
        });
      
      this.addTest('Validación tipos de datos', response.status === 400, 
                   `Status: ${response.status}, Should validate data types`);
    } catch (error) {
      this.addTest('Validación tipos de datos', false, `Error: ${error.message}`);
    }
  }

  addTest(name, passed, details) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
    
    this.results.tests.push({
      name,
      passed,
      details,
      status: passed ? '✅ PASS' : '❌ FAIL'
    });
    
    console.log(`  ${passed ? '✅' : '❌'} ${name}: ${details}`);
  }

  displayResults() {
    console.log('\n📊 RESULTADOS DE PRUEBAS DEL BACKEND');
    console.log('=====================================');
    console.log(`Total: ${this.results.total} | Pasaron: ${this.results.passed} | Fallaron: ${this.results.failed}`);
    console.log(`Porcentaje de éxito: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detalles de pruebas:');
    this.results.tests.forEach(test => {
      console.log(`  ${test.status} ${test.name}: ${test.details}`);
    });

    if (this.results.failed === 0) {
      console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL BACKEND PASARON! Sistema listo para producción.');
    } else {
      console.log(`\n⚠️ ${this.results.failed} pruebas del backend fallaron. Revisar antes de merge.`);
    }
  }
}

// Función para ejecutar las pruebas
async function runBackendTests() {
  const tester = new BackendTester();
  return await tester.runAllTests();
}

module.exports = { BackendTester, runBackendTests };

// Si se ejecuta directamente
if (require.main === module) {
  runBackendTests().then(results => {
    process.exit(results.failed === 0 ? 0 : 1);
  }).catch(error => {
    console.error('Error ejecutando pruebas:', error);
    process.exit(1);
  });
}
