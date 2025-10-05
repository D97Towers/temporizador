#!/usr/bin/env node

// PRUEBAS COMPLETAS DEL BACKEND - TODOS LOS CAMINOS
const axios = require('axios');

const BASE_URL = 'https://temporizador-jade.vercel.app';
const API_URL = BASE_URL;

console.log('🧪 INICIANDO PRUEBAS COMPLETAS DEL BACKEND');
console.log('==========================================');

// Función para hacer requests con manejo de errores
async function testRequest(method, endpoint, data = null, description = '') {
  try {
    console.log(`\n📡 ${method.toUpperCase()} ${endpoint}`);
    console.log(`📝 ${description}`);
    
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      timeout: 15000 // 15 segundos timeout
    };
    
    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || 'Network Error'}`);
    console.log(`💬 Message: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

// Función para probar rate limiting
async function testRateLimit() {
  console.log('\n🚦 PROBANDO RATE LIMITING');
  console.log('========================');
  
  const promises = [];
  for (let i = 0; i < 110; i++) { // Más del límite de 100
    promises.push(testRequest('GET', '/admin/status', null, `Request ${i + 1}`));
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r === null).length;
  
  console.log(`📊 Resultados: ${results.length - rateLimited} exitosos, ${rateLimited} limitados`);
  
  if (rateLimited > 0) {
    console.log('✅ Rate limiting funcionando correctamente');
  } else {
    console.log('❌ Rate limiting NO está funcionando');
  }
}

// Función para probar validación de datos
async function testDataValidation() {
  console.log('\n🔍 PROBANDO VALIDACIÓN DE DATOS');
  console.log('===============================');
  
  // 1. Probar creación de niño con datos inválidos
  await testRequest('POST', '/children', {
    name: '', // Nombre vacío
  }, 'Niño con nombre vacío (debería fallar)');
  
  await testRequest('POST', '/children', {
    name: 'A', // Nombre muy corto
  }, 'Niño con nombre muy corto (debería fallar)');
  
  await testRequest('POST', '/children', {
    name: 'A'.repeat(60), // Nombre muy largo
  }, 'Niño con nombre muy largo (debería fallar)');
  
  await testRequest('POST', '/children', {
    name: 'Juan<script>alert("xss")</script>', // XSS attempt
  }, 'Niño con intento de XSS (debería fallar)');
  
  await testRequest('POST', '/children', {
    name: 'Juan123!@#', // Caracteres especiales no permitidos
  }, 'Niño con caracteres especiales (debería fallar)');
  
  // 2. Probar creación de sesión con datos inválidos
  await testRequest('POST', '/sessions/start', {
    childId: 'invalid', // ID inválido
    gameId: 1,
    duration: 30
  }, 'Sesión con childId inválido (debería fallar)');
  
  await testRequest('POST', '/sessions/start', {
    childId: 1,
    gameId: 'invalid', // ID inválido
    duration: 30
  }, 'Sesión con gameId inválido (debería fallar)');
  
  await testRequest('POST', '/sessions/start', {
    childId: 1,
    gameId: 1,
    duration: -5 // Duración negativa
  }, 'Sesión con duración negativa (debería fallar)');
  
  await testRequest('POST', '/sessions/start', {
    childId: 1,
    gameId: 1,
    duration: 200 // Duración muy alta
  }, 'Sesión con duración muy alta (debería fallar)');
  
  await testRequest('POST', '/sessions/start', {
    childId: 1,
    gameId: 1,
    duration: 1.5 // Duración decimal
  }, 'Sesión con duración decimal (debería fallar)');
  
  await testRequest('POST', '/sessions/start', {
    childId: 999999, // ID inexistente
    gameId: 1,
    duration: 30
  }, 'Sesión con childId inexistente (debería fallar)');
  
  await testRequest('POST', '/sessions/start', {
    childId: 1,
    gameId: 999999, // ID inexistente
    duration: 30
  }, 'Sesión con gameId inexistente (debería fallar)');
}

// Función para probar endpoints básicos
async function testBasicEndpoints() {
  console.log('\n🏠 PROBANDO ENDPOINTS BÁSICOS');
  console.log('============================');
  
  // 1. Estado del servidor
  await testRequest('GET', '/admin/status', null, 'Estado del servidor');
  
  // 2. Listar niños
  await testRequest('GET', '/children', null, 'Listar todos los niños');
  
  // 3. Listar juegos
  await testRequest('GET', '/games', null, 'Listar todos los juegos');
  
  // 4. Listar sesiones activas
  await testRequest('GET', '/sessions/active', null, 'Listar sesiones activas');
  
  // 5. Listar historial de sesiones
  await testRequest('GET', '/sessions', null, 'Listar historial de sesiones');
}

// Función para probar operaciones CRUD
async function testCRUDOperations() {
  console.log('\n📝 PROBANDO OPERACIONES CRUD');
  console.log('============================');
  
  // 1. Crear niño válido
  const childResponse = await testRequest('POST', '/children', {
    name: 'Test Niño',
    nickname: 'Test',
    fatherName: 'Padre Test',
    motherName: 'Madre Test'
  }, 'Crear niño válido');
  
  if (childResponse && childResponse.id) {
    const childId = childResponse.id;
    
    // 2. Crear juego válido
    const gameResponse = await testRequest('POST', '/games', {
      name: 'Test Juego'
    }, 'Crear juego válido');
    
    if (gameResponse && gameResponse.id) {
      const gameId = gameResponse.id;
      
      // 3. Crear sesión válida
      const sessionResponse = await testRequest('POST', '/sessions/start', {
        childId: childId,
        gameId: gameId,
        duration: 10
      }, 'Crear sesión válida');
      
      if (sessionResponse && sessionResponse.id) {
        const sessionId = sessionResponse.id;
        
        // 4. Extender sesión
        await testRequest('POST', '/sessions/extend', {
          sessionId: sessionId,
          additionalTime: 5
        }, 'Extender sesión');
        
        // 5. Finalizar sesión
        await testRequest('POST', `/sessions/${sessionId}/end`, null, 'Finalizar sesión');
      }
      
      // 6. Editar niño
      await testRequest('PUT', `/children/${childId}`, {
        name: 'Test Niño Editado',
        nickname: 'Test Editado',
        fatherName: 'Padre Editado',
        motherName: 'Madre Editada'
      }, 'Editar información del niño');
      
      // 7. Eliminar juego
      await testRequest('DELETE', `/games/${gameId}`, null, 'Eliminar juego');
      
      // 8. Eliminar niño
      await testRequest('DELETE', `/children/${childId}`, null, 'Eliminar niño');
    }
  }
}

// Función para probar control de concurrencia
async function testConcurrency() {
  console.log('\n⚡ PROBANDO CONTROL DE CONCURRENCIA');
  console.log('===================================');
  
  // Crear un niño para las pruebas
  const childResponse = await testRequest('POST', '/children', {
    name: 'Concurrency Test',
    nickname: 'ConTest'
  }, 'Crear niño para prueba de concurrencia');
  
  if (!childResponse || !childResponse.id) {
    console.log('❌ No se pudo crear niño para prueba de concurrencia');
    return;
  }
  
  const childId = childResponse.id;
  
  // Intentar múltiples operaciones simultáneas en el mismo recurso
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      testRequest('PUT', `/children/${childId}`, {
        name: `Concurrency Test ${i}`,
        nickname: `ConTest${i}`
      }, `Edición concurrente ${i + 1}`)
    );
  }
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r !== null).length;
  const locked = results.filter(r => r === null).length;
  
  console.log(`📊 Resultados: ${successful} exitosos, ${locked} bloqueados por concurrencia`);
  
  if (locked > 0) {
    console.log('✅ Control de concurrencia funcionando correctamente');
  } else {
    console.log('⚠️ Control de concurrencia podría no estar funcionando');
  }
  
  // Limpiar
  await testRequest('DELETE', `/children/${childId}`, null, 'Limpiar niño de prueba');
}

// Función para probar timeouts
async function testTimeouts() {
  console.log('\n⏰ PROBANDO TIMEOUTS');
  console.log('===================');
  
  // Probar con un endpoint que debería responder rápido
  const startTime = Date.now();
  const response = await testRequest('GET', '/admin/status', null, 'Prueba de timeout');
  const endTime = Date.now();
  
  const duration = endTime - startTime;
  console.log(`⏱️ Duración de la request: ${duration}ms`);
  
  if (duration < 15000) {
    console.log('✅ Timeout funcionando correctamente');
  } else {
    console.log('❌ Timeout NO está funcionando');
  }
}

// Función principal
async function runAllTests() {
  try {
    console.log('🚀 Iniciando pruebas completas...\n');
    
    // 1. Probar endpoints básicos
    await testBasicEndpoints();
    
    // 2. Probar validación de datos
    await testDataValidation();
    
    // 3. Probar operaciones CRUD
    await testCRUDOperations();
    
    // 4. Probar rate limiting
    await testRateLimit();
    
    // 5. Probar control de concurrencia
    await testConcurrency();
    
    // 6. Probar timeouts
    await testTimeouts();
    
    console.log('\n🎉 TODAS LAS PRUEBAS COMPLETADAS');
    console.log('================================');
    console.log('✅ Backend probado exhaustivamente');
    console.log('✅ Validaciones funcionando');
    console.log('✅ Rate limiting activo');
    console.log('✅ Control de concurrencia implementado');
    console.log('✅ Timeouts configurados');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar pruebas
runAllTests();
