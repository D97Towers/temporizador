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
        'User-Agent': 'Frontend-Test-Script'
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

async function testFrontendIssues() {
  console.log('🔍 DIAGNOSTICANDO PROBLEMAS DEL FRONTEND\n');
  
  // Test 1: Verificar datos de juegos
  console.log('🎮 1. VERIFICANDO DATOS DE JUEGOS:');
  try {
    const gamesResponse = await makeRequest('/games');
    if (gamesResponse.status === 200 && gamesResponse.data) {
      console.log(`✅ Juegos disponibles: ${gamesResponse.data.length}`);
      gamesResponse.data.forEach((game, index) => {
        console.log(`   ${index + 1}. ID: ${game.id}, Nombre: "${game.name}"`);
      });
      
      // Verificar estructura
      const firstGame = gamesResponse.data[0];
      console.log('\n📋 Estructura del primer juego:');
      console.log(`   - id: ${typeof firstGame.id} = ${firstGame.id}`);
      console.log(`   - name: ${typeof firstGame.name} = "${firstGame.name}"`);
      console.log(`   - created_at: ${typeof firstGame.created_at} = ${firstGame.created_at}`);
      
    } else {
      console.log(`❌ Error obteniendo juegos: ${gamesResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 2: Verificar datos de niños
  console.log('\n👶 2. VERIFICANDO DATOS DE NIÑOS:');
  try {
    const childrenResponse = await makeRequest('/children');
    if (childrenResponse.status === 200 && childrenResponse.data) {
      console.log(`✅ Niños disponibles: ${childrenResponse.data.length}`);
      childrenResponse.data.forEach((child, index) => {
        console.log(`   ${index + 1}. ID: ${child.id}, Nombre: "${child.name}", Display: "${child.display_name}"`);
      });
      
      // Verificar estructura
      const firstChild = childrenResponse.data[0];
      console.log('\n📋 Estructura del primer niño:');
      console.log(`   - id: ${typeof firstChild.id} = ${firstChild.id}`);
      console.log(`   - name: ${typeof firstChild.name} = "${firstChild.name}"`);
      console.log(`   - display_name: ${typeof firstChild.display_name} = "${firstChild.display_name}"`);
      
    } else {
      console.log(`❌ Error obteniendo niños: ${childrenResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 3: Verificar sesiones activas
  console.log('\n⏱️ 3. VERIFICANDO SESIONES ACTIVAS:');
  try {
    const activeResponse = await makeRequest('/sessions/active');
    if (activeResponse.status === 200 && activeResponse.data) {
      console.log(`✅ Sesiones activas: ${activeResponse.data.length}`);
      activeResponse.data.forEach((session, index) => {
        console.log(`   ${index + 1}. ID: ${session.id}`);
        console.log(`      - child_id: ${session.child_id} (${typeof session.child_id})`);
        console.log(`      - game_id: ${session.game_id} (${typeof session.game_id})`);
        console.log(`      - child_name: "${session.child_name}"`);
        console.log(`      - game_name: "${session.game_name}"`);
        console.log(`      - duration_minutes: ${session.duration_minutes} (${typeof session.duration_minutes})`);
        console.log(`      - start_time: ${session.start_time}`);
      });
      
    } else {
      console.log(`❌ Error obteniendo sesiones activas: ${activeResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 4: Verificar historial de sesiones
  console.log('\n📜 4. VERIFICANDO HISTORIAL DE SESIONES:');
  try {
    const sessionsResponse = await makeRequest('/sessions');
    if (sessionsResponse.status === 200 && sessionsResponse.data) {
      console.log(`✅ Sesiones totales: ${sessionsResponse.data.length}`);
      if (sessionsResponse.data.length > 0) {
        const firstSession = sessionsResponse.data[0];
        console.log('\n📋 Estructura de la primera sesión:');
        console.log(`   - id: ${typeof firstSession.id} = ${firstSession.id}`);
        console.log(`   - child_id: ${typeof firstSession.child_id} = ${firstSession.child_id}`);
        console.log(`   - game_id: ${typeof firstSession.game_id} = ${firstSession.game_id}`);
        console.log(`   - child_name: "${firstSession.child_name}"`);
        console.log(`   - game_name: "${firstSession.game_name}"`);
        console.log(`   - duration_minutes: ${firstSession.duration_minutes}`);
        console.log(`   - start_time: ${firstSession.start_time}`);
        console.log(`   - end_time: ${firstSession.end_time}`);
      }
    } else {
      console.log(`❌ Error obteniendo historial: ${sessionsResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 5: Simular inicio de sesión
  console.log('\n🚀 5. PROBANDO INICIO DE SESIÓN:');
  try {
    const sessionData = {
      child_id: 1,
      game_id: 1,
      duration: 2 // 2 minutos para prueba rápida
    };
    
    const startResponse = await makeRequest('/sessions/start', 'POST', sessionData);
    if (startResponse.status === 201 || startResponse.status === 200) {
      console.log('✅ Sesión iniciada exitosamente');
      console.log(`   ID: ${startResponse.data.id}`);
      console.log(`   Duración: ${startResponse.data.duration_minutes} minutos`);
      console.log(`   Inicio: ${startResponse.data.start_time}`);
      
      // Esperar un poco y verificar que aparezca en activas
      console.log('\n⏳ Esperando 3 segundos y verificando sesiones activas...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const activeResponse2 = await makeRequest('/sessions/active');
      if (activeResponse2.status === 200) {
        const newSession = activeResponse2.data.find(s => s.id === startResponse.data.id);
        if (newSession) {
          console.log('✅ Sesión encontrada en activas');
          console.log(`   - child_name: "${newSession.child_name}"`);
          console.log(`   - game_name: "${newSession.game_name}"`);
          console.log(`   - duration_minutes: ${newSession.duration_minutes}`);
        } else {
          console.log('❌ Sesión no encontrada en activas');
        }
      }
      
    } else {
      console.log(`❌ Error iniciando sesión: ${startResponse.status}`);
      console.log(`   Response: ${startResponse.raw}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
}

testFrontendIssues().catch(console.error);
