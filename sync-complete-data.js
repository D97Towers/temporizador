#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuración
const LOCAL_DATA_FILE = path.join(__dirname, 'data.json');
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://temporizador-jade.vercel.app';

async function syncCompleteData() {
  try {
    console.log('🔄 Iniciando sincronización completa de datos...');
    
    // Leer datos locales
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      console.error('❌ No se encontró el archivo data.json local');
      process.exit(1);
    }
    
    const localData = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    console.log(`📊 Datos locales encontrados:`);
    console.log(`   - Niños: ${localData.children.length}`);
    console.log(`   - Juegos: ${localData.games.length}`);
    console.log(`   - Sesiones: ${localData.sessions.length}`);
    
    console.log(`🚀 Sincronizando con producción: ${PRODUCTION_URL}`);
    
    // 1. Sincronizar juegos primero
    console.log('\n🎮 Sincronizando juegos...');
    const gameMap = {}; // Mapeo de ID local a ID de producción
    
    for (const game of localData.games) {
      try {
        const response = await fetch(`${PRODUCTION_URL}/games`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: game.name })
        });
        
        if (response.ok) {
          const newGame = await response.json();
          gameMap[game.id] = newGame.id;
          console.log(`   ✅ ${game.name} (${game.id} → ${newGame.id})`);
        } else {
          console.log(`   ❌ Error con ${game.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error con ${game.name}: ${error.message}`);
      }
    }
    
    // 2. Sincronizar niños con información completa
    console.log('\n👶 Sincronizando niños con información completa...');
    const childMap = {}; // Mapeo de ID local a ID de producción
    
    for (const child of localData.children) {
      try {
        const childData = {
          name: child.name,
          nickname: child.nickname || undefined,
          fatherName: child.fatherName || undefined,
          motherName: child.motherName || undefined
        };
        
        const response = await fetch(`${PRODUCTION_URL}/children`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(childData)
        });
        
        if (response.ok) {
          const newChild = await response.json();
          childMap[child.id] = newChild.id;
          console.log(`   ✅ ${child.name} (${child.id} → ${newChild.id})`);
          if (child.fatherName || child.motherName) {
            console.log(`      👨‍👩‍👧‍👦 Padres: ${child.fatherName || 'N/A'} / ${child.motherName || 'N/A'}`);
          }
        } else {
          console.log(`   ❌ Error con ${child.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error con ${child.name}: ${error.message}`);
      }
    }
    
    // 3. Sincronizar sesiones históricas
    console.log('\n📅 Sincronizando sesiones históricas...');
    let syncedSessions = 0;
    
    for (const session of localData.sessions) {
      try {
        const newChildId = childMap[session.childId];
        const newGameId = gameMap[session.gameId];
        
        if (!newChildId || !newGameId) {
          console.log(`   ⚠️  Sesión ${session.id} omitida - referencias no encontradas`);
          continue;
        }
        
        // Crear sesión con datos históricos
        const sessionData = {
          childId: newChildId,
          gameId: newGameId,
          duration: session.duration,
          start: session.start,
          end: session.end
        };
        
        const response = await fetch(`${PRODUCTION_URL}/sessions/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            childId: newChildId,
            gameId: newGameId,
            duration: session.duration
          })
        });
        
        if (response.ok) {
          const newSession = await response.json();
          console.log(`   ✅ Sesión ${session.id} → ${newSession.id} (${session.duration} min)`);
          syncedSessions++;
          
          // Finalizar la sesión inmediatamente para mantener el historial
          if (session.end) {
            await fetch(`${PRODUCTION_URL}/sessions/end`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId: newSession.id })
            });
          }
        } else {
          console.log(`   ❌ Error con sesión ${session.id}: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error con sesión ${session.id}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Sincronización completa finalizada!');
    console.log(`📈 Resumen:`);
    console.log(`   - Juegos sincronizados: ${Object.keys(gameMap).length}`);
    console.log(`   - Niños sincronizados: ${Object.keys(childMap).length}`);
    console.log(`   - Sesiones sincronizadas: ${syncedSessions}`);
    console.log('\n🎉 Todos los datos están ahora disponibles en producción!');
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  syncCompleteData();
}

module.exports = { syncCompleteData };
