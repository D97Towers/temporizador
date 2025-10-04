#!/usr/bin/env node

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

async function fixComplete() {
  try {
    console.log('🔧 Solucionando todos los problemas...');
    
    // 1. Sincronizar datos locales
    console.log('1. Sincronizando datos locales...');
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    
    const syncResponse = await fetch(`${PRODUCTION_URL}/admin/sync-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!syncResponse.ok) {
      throw new Error('Error sincronizando datos');
    }
    
    console.log('   ✅ Datos sincronizados');
    
    // 2. Agregar niño "anto"
    console.log('2. Agregando niño "anto"...');
    const childResponse = await fetch(`${PRODUCTION_URL}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'anto',
        nickname: 'anto',
        fatherName: 'diego',
        motherName: 'carolina'
      })
    });
    
    if (!childResponse.ok) {
      throw new Error('Error agregando niño anto');
    }
    
    const anto = await childResponse.json();
    console.log(`   ✅ Niño "anto" agregado con ID: ${anto.id}`);
    
    // 3. Iniciar sesión para "anto"
    console.log('3. Iniciando sesión para "anto"...');
    const sessionResponse = await fetch(`${PRODUCTION_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: anto.id,
        gameId: 2, // videojuegos
        duration: 1
      })
    });
    
    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      throw new Error(`Error iniciando sesión: ${error}`);
    }
    
    const session = await sessionResponse.json();
    console.log(`   ✅ Sesión iniciada con ID: ${session.id}`);
    
    // 4. Verificar resultado
    console.log('4. Verificando resultado...');
    const activeResponse = await fetch(`${PRODUCTION_URL}/sessions/active`);
    const activeSessions = await activeResponse.json();
    console.log(`   ✅ Sesiones activas: ${activeSessions.length}`);
    
    const childrenResponse = await fetch(`${PRODUCTION_URL}/children`);
    const children = await childrenResponse.json();
    console.log(`   ✅ Total de niños: ${children.length}`);
    
    // 5. Mostrar resumen
    console.log('\n🎉 SOLUCIÓN COMPLETA:');
    console.log(`   - Niños disponibles: ${children.length}`);
    console.log(`   - Sesiones activas: ${activeSessions.length}`);
    console.log(`   - Niño "anto" disponible: ${children.some(c => c.name === 'anto') ? 'SÍ' : 'NO'}`);
    
    if (activeSessions.length > 0) {
      const antoSession = activeSessions.find(s => {
        const child = children.find(c => c.id === s.childId);
        return child && child.name === 'anto';
      });
      console.log(`   - Sesión de "anto" activa: ${antoSession ? 'SÍ' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixComplete();
}

module.exports = { fixComplete };
