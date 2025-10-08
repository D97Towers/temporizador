#!/usr/bin/env node

const https = require('https');

const BASE_URL = 'https://temporizador-jade.vercel.app';

// Función para hacer peticiones HTTP
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Backend-Test-Script'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = responseData ? JSON.parse(responseData) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: responseData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Tests
async function runTests() {
  console.log('🧪 INICIANDO PRUEBAS EXHAUSTIVAS DEL BACKEND\n');
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Verificar endpoints disponibles
  console.log('📋 1. VERIFICANDO ENDPOINTS DISPONIBLES');
  const endpoints = [
    '/test',
    '/test-db', 
    '/children',
    '/games',
    '/admin/status',
    '/sessions', // Este probablemente fallará
    '/sessions/active', // Este probablemente fallará
    '/sessions/end', // Este probablemente fallará
    '/sessions/start' // Este probablemente fallará
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint);
      if (response.status === 200) {
        console.log(`✅ ${endpoint} - OK`);
        results.passed++;
      } else {
        console.log(`❌ ${endpoint} - Status: ${response.status}`);
        results.failed++;
        results.errors.push(`${endpoint}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
      results.failed++;
      results.errors.push(`${endpoint}: ${error.message}`);
    }
  }

  // Test 2: Verificar datos existentes
  console.log('\n📊 2. VERIFICANDO DATOS EXISTENTES');
  
  try {
    const childrenResponse = await makeRequest('/children');
    if (childrenResponse.status === 200) {
      console.log(`✅ Niños: ${childrenResponse.data.length} registros`);
      results.passed++;
    } else {
      console.log(`❌ Error obteniendo niños: ${childrenResponse.status}`);
      results.failed++;
    }
  } catch (error) {
    console.log(`❌ Error obteniendo niños: ${error.message}`);
    results.failed++;
  }

  try {
    const gamesResponse = await makeRequest('/games');
    if (gamesResponse.status === 200) {
      console.log(`✅ Juegos: ${gamesResponse.data.length} registros`);
      results.passed++;
    } else {
      console.log(`❌ Error obteniendo juegos: ${gamesResponse.status}`);
      results.failed++;
    }
  } catch (error) {
    console.log(`❌ Error obteniendo juegos: ${error.message}`);
    results.failed++;
  }

  // Test 3: Probar creación de datos
  console.log('\n➕ 3. PROBANDO CREACIÓN DE DATOS');
  
  // Crear un niño de prueba
  try {
    const newChild = {
      name: 'TestChild',
      nickname: 'Test',
      father_name: 'TestFather',
      mother_name: 'TestMother'
    };
    
    const createChildResponse = await makeRequest('/children', 'POST', newChild);
    if (createChildResponse.status === 200 || createChildResponse.status === 201) {
      console.log('✅ Creación de niño exitosa');
      results.passed++;
    } else {
      console.log(`❌ Error creando niño: ${createChildResponse.status}`);
      console.log(`   Response: ${createChildResponse.raw}`);
      results.failed++;
      results.errors.push(`Crear niño: ${createChildResponse.raw}`);
    }
  } catch (error) {
    console.log(`❌ Error creando niño: ${error.message}`);
    results.failed++;
  }

  // Crear un juego de prueba
  try {
    const newGame = { name: 'TestGame' };
    const createGameResponse = await makeRequest('/games', 'POST', newGame);
    if (createGameResponse.status === 200 || createGameResponse.status === 201) {
      console.log('✅ Creación de juego exitosa');
      results.passed++;
    } else {
      console.log(`❌ Error creando juego: ${createGameResponse.status}`);
      console.log(`   Response: ${createGameResponse.raw}`);
      results.failed++;
      results.errors.push(`Crear juego: ${createGameResponse.raw}`);
    }
  } catch (error) {
    console.log(`❌ Error creando juego: ${error.message}`);
    results.failed++;
  }

  // Test 4: Probar funcionalidad de sesiones (si existe)
  console.log('\n⏱️ 4. PROBANDO FUNCIONALIDAD DE SESIONES');
  
  // Intentar iniciar una sesión
  try {
    const sessionData = {
      child_id: 1,
      game_id: 1,
      duration: 5 // 5 minutos para prueba
    };
    
    const startSessionResponse = await makeRequest('/sessions/start', 'POST', sessionData);
    if (startSessionResponse.status === 200 || startSessionResponse.status === 201) {
      console.log('✅ Inicio de sesión exitoso');
      results.passed++;
    } else {
      console.log(`❌ Error iniciando sesión: ${startSessionResponse.status}`);
      console.log(`   Response: ${startSessionResponse.raw}`);
      results.failed++;
      results.errors.push(`Iniciar sesión: ${startSessionResponse.raw}`);
    }
  } catch (error) {
    console.log(`❌ Error iniciando sesión: ${error.message}`);
    results.failed++;
    results.errors.push(`Iniciar sesión: ${error.message}`);
  }

  // Test 5: Verificar estado del sistema
  console.log('\n📈 5. VERIFICANDO ESTADO DEL SISTEMA');
  
  try {
    const statusResponse = await makeRequest('/admin/status');
    if (statusResponse.status === 200) {
      console.log('✅ Estado del sistema obtenido');
      console.log(`   Base de datos: ${statusResponse.data.storage || 'Desconocido'}`);
      results.passed++;
    } else {
      console.log(`❌ Error obteniendo estado: ${statusResponse.status}`);
      results.failed++;
    }
  } catch (error) {
    console.log(`❌ Error obteniendo estado: ${error.message}`);
    results.failed++;
  }

  // Resumen final
  console.log('\n📊 RESUMEN DE PRUEBAS:');
  console.log(`✅ Exitosas: ${results.passed}`);
  console.log(`❌ Fallidas: ${results.failed}`);
  console.log(`📊 Total: ${results.passed + results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n🚨 ERRORES ENCONTRADOS:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  if (results.failed > 0) {
    console.log('\n🔧 RECOMENDACIONES:');
    console.log('1. Verificar que todos los endpoints estén implementados');
    console.log('2. Revisar la configuración de la base de datos');
    console.log('3. Verificar que las tablas tengan RLS habilitado correctamente');
    console.log('4. Revisar los logs del servidor para más detalles');
  }

  return results;
}

// Ejecutar pruebas
runTests().catch(console.error);
