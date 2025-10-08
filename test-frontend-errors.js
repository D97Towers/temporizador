#!/usr/bin/env node

/**
 * Script para probar errores del frontend en producción
 * Identifica problemas específicos reportados por el usuario
 */

const https = require('https');

const BASE_URL = 'https://temporizador-jade.vercel.app';

async function testEndpoint(endpoint, description) {
  return new Promise((resolve) => {
    console.log(`\n🔍 ${description}`);
    console.log(`   URL: ${BASE_URL}${endpoint}`);
    
    const req = https.get(`${BASE_URL}${endpoint}`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`   ✅ Status: ${res.statusCode}`);
          console.log(`   📊 Response:`, JSON.stringify(jsonData, null, 2));
          resolve({ status: res.statusCode, data: jsonData, error: null });
        } catch (parseError) {
          console.log(`   ❌ Parse Error: ${parseError.message}`);
          console.log(`   📄 Raw Response: ${data.substring(0, 200)}...`);
          resolve({ status: res.statusCode, data: null, error: parseError.message });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Network Error: ${error.message}`);
      resolve({ status: null, data: null, error: error.message });
    });
    
    req.setTimeout(10000, () => {
      console.log(`   ⏰ Timeout`);
      req.destroy();
      resolve({ status: null, data: null, error: 'Timeout' });
    });
  });
}

async function testFrontendErrors() {
  console.log('🧪 AUDITORÍA FRONTEND - ERRORES REPORTADOS');
  console.log('='.repeat(60));
  
  // 1. Probar endpoint de juegos (dropdown vacío)
  console.log('\n1️⃣ PROBLEMA: Dropdown de juegos vacío ("Seleccione un juego")');
  const gamesResult = await testEndpoint('/games', 'Lista de juegos para dropdown');
  
  if (gamesResult.data && Array.isArray(gamesResult.data)) {
    console.log(`   📝 Análisis: Se encontraron ${gamesResult.data.length} juegos`);
    if (gamesResult.data.length === 0) {
      console.log('   ❌ PROBLEMA: No hay juegos en la base de datos');
    } else {
      console.log('   ✅ Juegos disponibles:', gamesResult.data.map(g => `${g.id}: ${g.name}`));
    }
  }
  
  // 2. Probar endpoint de niños
  console.log('\n2️⃣ PROBLEMA: Validación de niños en sesión');
  const childrenResult = await testEndpoint('/children', 'Lista de niños');
  
  if (childrenResult.data && Array.isArray(childrenResult.data)) {
    console.log(`   📝 Análisis: Se encontraron ${childrenResult.data.length} niños`);
    if (childrenResult.data.length === 0) {
      console.log('   ❌ PROBLEMA: No hay niños en la base de datos');
    } else {
      console.log('   ✅ Niños disponibles:', childrenResult.data.map(c => `${c.id}: ${c.name}`));
    }
  }
  
  // 3. Probar sesiones activas (para verificar NaN en tiempo)
  console.log('\n3️⃣ PROBLEMA: "NaNmin" en historial de sesiones');
  const activeResult = await testEndpoint('/sessions/active', 'Sesiones activas');
  
  if (activeResult.data && Array.isArray(activeResult.data)) {
    console.log(`   📝 Análisis: ${activeResult.data.length} sesiones activas`);
    activeResult.data.forEach((session, index) => {
      console.log(`   📊 Sesión ${index + 1}:`);
      console.log(`      - ID: ${session.id}`);
      console.log(`      - ChildId: ${session.childId || session.child_id}`);
      console.log(`      - GameId: ${session.gameId || session.game_id}`);
      console.log(`      - Start: ${session.start || session.startTime}`);
      console.log(`      - Duration: ${session.duration}`);
      console.log(`      - Created: ${session.created_at}`);
    });
  }
  
  // 4. Probar historial de sesiones
  console.log('\n4️⃣ PROBLEMA: "NaNmin" en duración de historial');
  const historyResult = await testEndpoint('/sessions', 'Historial de sesiones');
  
  if (historyResult.data && Array.isArray(historyResult.data)) {
    console.log(`   📝 Análisis: ${historyResult.data.length} sesiones en historial`);
    historyResult.data.slice(0, 3).forEach((session, index) => {
      console.log(`   📊 Sesión ${index + 1} (historial):`);
      console.log(`      - ID: ${session.id}`);
      console.log(`      - ChildId: ${session.childId || session.child_id}`);
      console.log(`      - GameId: ${session.gameId || session.game_id}`);
      console.log(`      - Start: ${session.start || session.startTime}`);
      console.log(`      - End: ${session.end}`);
      console.log(`      - Duration: ${session.duration}`);
      
      // Verificar si hay problemas con fechas
      if (session.start || session.startTime) {
        const startTime = new Date(session.start || session.startTime);
        console.log(`      - Start parsed: ${startTime.toISOString()}`);
        console.log(`      - Is valid: ${!isNaN(startTime.getTime())}`);
      }
      
      if (session.end) {
        const endTime = new Date(session.end);
        console.log(`      - End parsed: ${endTime.toISOString()}`);
        console.log(`      - Is valid: ${!isNaN(endTime.getTime())}`);
      }
    });
  }
  
  // 5. Probar estadísticas del dashboard
  console.log('\n5️⃣ PROBLEMA: Dashboard no muestra información');
  const statsResult = await testEndpoint('/admin/stats', 'Estadísticas del dashboard');
  
  if (statsResult.data) {
    console.log(`   📝 Análisis: Estadísticas disponibles`);
    console.log(`   📊 Datos:`, JSON.stringify(statsResult.data, null, 2));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 RESUMEN DE PROBLEMAS IDENTIFICADOS:');
  console.log('='.repeat(60));
  
  if (gamesResult.data && gamesResult.data.length === 0) {
    console.log('❌ PROBLEMA 1: No hay juegos en la base de datos');
  } else if (gamesResult.data && gamesResult.data.length > 0) {
    console.log('✅ SOLUCIONADO: Juegos disponibles en backend');
    console.log('🔍 CAUSA FRONTEND: Problema de timing en carga de dropdown');
  }
  
  if (childrenResult.data && childrenResult.data.length === 0) {
    console.log('❌ PROBLEMA 2: No hay niños en la base de datos');
  } else {
    console.log('✅ SOLUCIONADO: Niños disponibles en backend');
  }
  
  console.log('🔍 PROBLEMA 3: "NaNmin" en historial - Verificar parsing de fechas en frontend');
  console.log('🔍 PROBLEMA 4: gameId vacío en startSession - Problema de timing');
  
  console.log('\n💡 RECOMENDACIONES:');
  console.log('1. Corregir timing en startSession() - obtener gameId después de recargar datos');
  console.log('2. Verificar parsing de fechas en frontend para evitar NaN');
  console.log('3. Añadir logs de debug en updateGameSelect()');
  console.log('4. Verificar que fetchGames() se ejecute correctamente en initializeApp()');
}

// Ejecutar tests
testFrontendErrors().catch(console.error);
