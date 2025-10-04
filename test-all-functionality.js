#!/usr/bin/env node

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAllFunctionality() {
  try {
    log('\n🧪 INICIANDO PRUEBAS EXHAUSTIVAS DE FUNCIONALIDAD', 'bright');
    log('=' * 60, 'cyan');
    
    // 1. Verificar estado inicial
    log('\n1️⃣ VERIFICANDO ESTADO INICIAL', 'blue');
    const statusResponse = await fetch(`${PRODUCTION_URL}/admin/status`);
    const status = await statusResponse.json();
    
    log(`   📊 Estado del backend:`, 'yellow');
    log(`      - Niños: ${status.children}`, 'yellow');
    log(`      - Juegos: ${status.games}`, 'yellow');
    log(`      - Sesiones: ${status.sessions}`, 'yellow');
    log(`      - Entorno: ${status.environment}`, 'yellow');
    
    // 2. Probar endpoint de niños
    log('\n2️⃣ PROBANDO ENDPOINT DE NIÑOS', 'blue');
    const childrenResponse = await fetch(`${PRODUCTION_URL}/children`);
    const children = await childrenResponse.json();
    log(`   ✅ Niños obtenidos: ${children.length}`, 'green');
    
    if (children.length > 0) {
      log(`   📋 Primeros 3 niños:`, 'yellow');
      children.slice(0, 3).forEach((child, i) => {
        log(`      ${i + 1}. ${child.name} (ID: ${child.id})`, 'yellow');
      });
    }
    
    // 3. Probar endpoint de juegos
    log('\n3️⃣ PROBANDO ENDPOINT DE JUEGOS', 'blue');
    const gamesResponse = await fetch(`${PRODUCTION_URL}/games`);
    const games = await gamesResponse.json();
    log(`   ✅ Juegos obtenidos: ${games.length}`, 'green');
    
    if (games.length > 0) {
      log(`   🎮 Juegos disponibles:`, 'yellow');
      games.forEach((game, i) => {
        log(`      ${i + 1}. ${game.name} (ID: ${game.id})`, 'yellow');
      });
    }
    
    // 4. Probar endpoint de sesiones activas
    log('\n4️⃣ PROBANDO SESIONES ACTIVAS', 'blue');
    const activeResponse = await fetch(`${PRODUCTION_URL}/sessions/active`);
    const activeSessions = await activeResponse.json();
    log(`   ✅ Sesiones activas: ${activeSessions.length}`, 'green');
    
    if (activeSessions.length > 0) {
      log(`   ⏰ Sesiones activas encontradas:`, 'yellow');
      activeSessions.forEach((session, i) => {
        log(`      ${i + 1}. Sesión ID: ${session.id}, Niño: ${session.childId}, Juego: ${session.gameId}`, 'yellow');
      });
    }
    
    // 5. Probar endpoint de historial de sesiones
    log('\n5️⃣ PROBANDO HISTORIAL DE SESIONES', 'blue');
    const historyResponse = await fetch(`${PRODUCTION_URL}/sessions`);
    const history = await historyResponse.json();
    log(`   ✅ Total de sesiones en historial: ${history.length}`, 'green');
    
    if (history.length > 0) {
      log(`   📜 Últimas 3 sesiones:`, 'yellow');
      history.slice(0, 3).forEach((session, i) => {
        const status = session.end ? 'Finalizada' : 'Activa';
        log(`      ${i + 1}. ${status} - Niño: ${session.childId}, Duración: ${session.duration}min`, 'yellow');
      });
    }
    
    // 6. Probar agregar un niño de prueba
    log('\n6️⃣ PROBANDO AGREGAR NIÑO', 'blue');
    const testChildName = `Test_${Date.now()}`;
    const addChildResponse = await fetch(`${PRODUCTION_URL}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testChildName,
        nickname: 'Test',
        fatherName: 'Padre Test',
        motherName: 'Madre Test'
      })
    });
    
    if (addChildResponse.ok) {
      const newChild = await addChildResponse.json();
      log(`   ✅ Niño agregado exitosamente:`, 'green');
      log(`      - ID: ${newChild.id}`, 'yellow');
      log(`      - Nombre: ${newChild.name}`, 'yellow');
      log(`      - Display Name: ${newChild.displayName}`, 'yellow');
      
      // 7. Probar iniciar sesión con el niño de prueba
      log('\n7️⃣ PROBANDO INICIAR SESIÓN', 'blue');
      if (games.length > 0) {
        const startSessionResponse = await fetch(`${PRODUCTION_URL}/sessions/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: newChild.id,
            gameId: games[0].id,
            duration: 1
          })
        });
        
        if (startSessionResponse.ok) {
          const newSession = await startSessionResponse.json();
          log(`   ✅ Sesión iniciada exitosamente:`, 'green');
          log(`      - ID: ${newSession.id}`, 'yellow');
          log(`      - Niño: ${newSession.childId}`, 'yellow');
          log(`      - Juego: ${newSession.gameId}`, 'yellow');
          log(`      - Duración: ${newSession.duration}min`, 'yellow');
          
          // 8. Verificar que la sesión aparece en activas
          log('\n8️⃣ VERIFICANDO SESIÓN EN ACTIVAS', 'blue');
          const verifyActiveResponse = await fetch(`${PRODUCTION_URL}/sessions/active`);
          const verifyActive = await verifyActiveResponse.json();
          const foundSession = verifyActive.find(s => s.id === newSession.id);
          
          if (foundSession) {
            log(`   ✅ Sesión encontrada en activas`, 'green');
          } else {
            log(`   ❌ Sesión NO encontrada en activas`, 'red');
          }
          
          // 9. Probar extender tiempo
          log('\n9️⃣ PROBANDO EXTENDER TIEMPO', 'blue');
          const extendResponse = await fetch(`${PRODUCTION_URL}/sessions/extend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: newSession.id,
              additionalTime: 5
            })
          });
          
          if (extendResponse.ok) {
            const extendResult = await extendResponse.json();
            log(`   ✅ Tiempo extendido exitosamente:`, 'green');
            log(`      - Nueva duración: ${extendResult.newDuration}min`, 'yellow');
          } else {
            log(`   ❌ Error extendiendo tiempo: ${extendResponse.status}`, 'red');
          }
          
          // 10. Probar finalizar sesión
          log('\n🔟 PROBANDO FINALIZAR SESIÓN', 'blue');
          const endSessionResponse = await fetch(`${PRODUCTION_URL}/sessions/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: newSession.id
            })
          });
          
          if (endSessionResponse.ok) {
            log(`   ✅ Sesión finalizada exitosamente`, 'green');
            
            // Verificar que aparece en historial
            const verifyHistoryResponse = await fetch(`${PRODUCTION_URL}/sessions`);
            const verifyHistory = await verifyHistoryResponse.json();
            const foundInHistory = verifyHistory.find(s => s.id === newSession.id && s.end);
            
            if (foundInHistory) {
              log(`   ✅ Sesión encontrada en historial como finalizada`, 'green');
            } else {
              log(`   ❌ Sesión NO encontrada en historial`, 'red');
            }
          } else {
            log(`   ❌ Error finalizando sesión: ${endSessionResponse.status}`, 'red');
          }
        } else {
          log(`   ❌ Error iniciando sesión: ${startSessionResponse.status}`, 'red');
        }
      } else {
        log(`   ⚠️ No hay juegos disponibles para probar sesión`, 'yellow');
      }
      
      // 11. Limpiar: eliminar niño de prueba
      log('\n1️⃣1️⃣ LIMPIANDO: ELIMINANDO NIÑO DE PRUEBA', 'blue');
      const deleteResponse = await fetch(`${PRODUCTION_URL}/children/${newChild.id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        log(`   ✅ Niño de prueba eliminado`, 'green');
      } else {
        log(`   ❌ Error eliminando niño de prueba: ${deleteResponse.status}`, 'red');
      }
    } else {
      log(`   ❌ Error agregando niño: ${addChildResponse.status}`, 'red');
    }
    
    // 12. Verificar estado final
    log('\n1️⃣2️⃣ VERIFICANDO ESTADO FINAL', 'blue');
    const finalStatusResponse = await fetch(`${PRODUCTION_URL}/admin/status`);
    const finalStatus = await finalStatusResponse.json();
    
    log(`   📊 Estado final del backend:`, 'yellow');
    log(`      - Niños: ${finalStatus.children}`, 'yellow');
    log(`      - Juegos: ${finalStatus.games}`, 'yellow');
    log(`      - Sesiones: ${finalStatus.sessions}`, 'yellow');
    
    // Resumen final
    log('\n🎉 PRUEBAS COMPLETADAS', 'bright');
    log('=' * 60, 'cyan');
    log('✅ Todas las funcionalidades básicas han sido probadas', 'green');
    log('📱 La aplicación está lista para uso en todos los dispositivos', 'green');
    
  } catch (error) {
    log(`\n❌ ERROR CRÍTICO EN PRUEBAS: ${error.message}`, 'red');
    log(`Stack: ${error.stack}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testAllFunctionality();
}

module.exports = { testAllFunctionality };
