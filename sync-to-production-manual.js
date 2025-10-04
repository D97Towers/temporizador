#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuración
const LOCAL_DATA_FILE = path.join(__dirname, 'data.json');
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://temporizador-jade.vercel.app';

async function syncToProduction() {
  try {
    console.log('🔄 Iniciando sincronización manual de datos locales a producción...');
    
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
    
    // Sincronizar niños
    console.log('\n👶 Sincronizando niños...');
    for (const child of localData.children) {
      try {
        const response = await fetch(`${PRODUCTION_URL}/children`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: child.name })
        });
        
        if (response.ok) {
          console.log(`   ✅ ${child.name} sincronizado`);
        } else {
          console.log(`   ⚠️  ${child.name} ya existe o error`);
        }
      } catch (error) {
        console.log(`   ❌ Error con ${child.name}: ${error.message}`);
      }
    }
    
    // Sincronizar juegos
    console.log('\n🎮 Sincronizando juegos...');
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
          console.log(`   ✅ ${game.name} sincronizado`);
        } else {
          console.log(`   ⚠️  ${game.name} ya existe o error`);
        }
      } catch (error) {
        console.log(`   ❌ Error con ${game.name}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Sincronización manual completada!');
    console.log('📝 Nota: Las sesiones históricas no se pueden sincronizar automáticamente.');
    console.log('   Los nuevos datos se guardarán normalmente desde ahora.');
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  syncToProduction();
}

module.exports = { syncToProduction };
