#!/usr/bin/env node

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

async function testSession() {
  try {
    console.log('🧪 Probando persistencia de sesiones...');
    
    // 1. Verificar estado inicial
    console.log('1. Estado inicial:');
    const initialStatus = await fetch(`${PRODUCTION_URL}/admin/status`);
    const initial = await initialStatus.json();
    console.log(`   - Niños: ${initial.children}`);
    console.log(`   - Sesiones: ${initial.sessions}`);
    
    // 2. Iniciar sesión
    console.log('2. Iniciando sesión...');
    const sessionResponse = await fetch(`${PRODUCTION_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: 1759613283526, // ID de anto
        gameId: 2,
        duration: 1
      })
    });
    
    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      throw new Error(`Error iniciando sesión: ${error}`);
    }
    
    const session = await sessionResponse.json();
    console.log(`   - Sesión creada: ID ${session.id}`);
    
    // 3. Verificar sesiones activas inmediatamente
    console.log('3. Verificando sesiones activas...');
    const activeResponse = await fetch(`${PRODUCTION_URL}/sessions/active`);
    const activeSessions = await activeResponse.json();
    console.log(`   - Sesiones activas: ${activeSessions.length}`);
    
    // 4. Verificar estado del backend
    console.log('4. Estado del backend:');
    const finalStatus = await fetch(`${PRODUCTION_URL}/admin/status`);
    const final = await finalStatus.json();
    console.log(`   - Niños: ${final.children}`);
    console.log(`   - Sesiones: ${final.sessions}`);
    
    // 5. Verificar sesiones en debug
    console.log('5. Debug completo:');
    const debugResponse = await fetch(`${PRODUCTION_URL}/admin/debug-full`);
    const debug = await debugResponse.json();
    console.log(`   - Sesiones en memoria: ${debug.currentData.sessions.length}`);
    
    if (debug.currentData.sessions.length > 0) {
      const lastSession = debug.currentData.sessions[debug.currentData.sessions.length - 1];
      console.log(`   - Última sesión: ID ${lastSession.id}, end: ${lastSession.end}`);
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSession();
}

module.exports = { testSession };
