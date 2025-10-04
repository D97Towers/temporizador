#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuración
const LOCAL_DATA_FILE = path.join(__dirname, 'data.json');
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://temporizador-jade.vercel.app';

async function fixParentInfo() {
  try {
    console.log('🔧 Corrigiendo información de padres en producción...');
    
    // Leer datos locales
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      console.error('❌ No se encontró el archivo data.json local');
      process.exit(1);
    }
    
    const localData = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    
    // Obtener datos actuales de producción
    console.log('📥 Obteniendo datos actuales de producción...');
    const productionResponse = await fetch(`${PRODUCTION_URL}/children`);
    const productionChildren = await productionResponse.json();
    
    console.log(`📊 Niños en producción: ${productionChildren.length}`);
    console.log(`📊 Niños locales con padres: ${localData.children.filter(c => c.fatherName || c.motherName).length}`);
    
    // Resetear datos en producción
    console.log('\n🔄 Reseteando datos en producción...');
    await fetch(`${PRODUCTION_URL}/admin/reset`, { method: 'POST' });
    
    // Re-sincronizar con información completa
    console.log('\n🔄 Re-sincronizando con información completa...');
    
    // 1. Sincronizar juegos
    console.log('\n🎮 Sincronizando juegos...');
    const gameMap = {};
    
    for (const game of localData.games) {
      try {
        const response = await fetch(`${PRODUCTION_URL}/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: game.name })
        });
        
        if (response.ok) {
          const newGame = await response.json();
          gameMap[game.id] = newGame.id;
          console.log(`   ✅ ${game.name} (${game.id} → ${newGame.id})`);
        }
      } catch (error) {
        console.log(`   ❌ Error con ${game.name}: ${error.message}`);
      }
    }
    
    // 2. Sincronizar niños con información completa
    console.log('\n👶 Sincronizando niños con información completa...');
    const childMap = {};
    
    for (const child of localData.children) {
      try {
        // Crear datos completos del niño
        const childData = {
          name: child.name,
          nickname: child.nickname || undefined,
          fatherName: child.fatherName || undefined,
          motherName: child.motherName || undefined
        };
        
        const response = await fetch(`${PRODUCTION_URL}/children`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(childData)
        });
        
        if (response.ok) {
          const newChild = await response.json();
          childMap[child.id] = newChild.id;
          console.log(`   ✅ ${child.name} (${child.id} → ${newChild.id})`);
          
          // Verificar si se guardó la información de padres
          if (child.fatherName || child.motherName) {
            console.log(`      👨‍👩‍👧‍👦 Padres: ${child.fatherName || 'N/A'} / ${child.motherName || 'N/A'}`);
            
            // Verificar inmediatamente si se guardó
            const verifyResponse = await fetch(`${PRODUCTION_URL}/children`);
            const verifyChildren = await verifyResponse.json();
            const savedChild = verifyChildren.find(c => c.id === newChild.id);
            
            if (savedChild && (savedChild.fatherName || savedChild.motherName)) {
              console.log(`      ✅ Información de padres guardada correctamente`);
            } else {
              console.log(`      ⚠️  Información de padres NO se guardó en el backend`);
            }
          }
        } else {
          console.log(`   ❌ Error con ${child.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error con ${child.name}: ${error.message}`);
      }
    }
    
    // 3. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...');
    const finalResponse = await fetch(`${PRODUCTION_URL}/children`);
    const finalChildren = await finalResponse.json();
    
    console.log('\n📊 Resultado final:');
    let childrenWithParents = 0;
    for (const child of finalChildren) {
      if (child.fatherName || child.motherName) {
        console.log(`   ✅ ${child.name}: Padre: ${child.fatherName || 'N/A'}, Madre: ${child.motherName || 'N/A'}`);
        childrenWithParents++;
      } else {
        console.log(`   ⚠️  ${child.name}: Sin información de padres`);
      }
    }
    
    console.log(`\n🎉 Corrección completada!`);
    console.log(`   - Total niños: ${finalChildren.length}`);
    console.log(`   - Niños con padres: ${childrenWithParents}`);
    
    if (childrenWithParents === 0) {
      console.log(`\n⚠️  ADVERTENCIA: El backend en producción no está guardando la información de padres.`);
      console.log(`   Esto indica que el endpoint POST /children no está configurado correctamente.`);
    }
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixParentInfo();
}

module.exports = { fixParentInfo };
