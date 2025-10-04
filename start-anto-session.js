#!/usr/bin/env node

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

async function startAntoSession() {
  try {
    console.log('🎮 Iniciando sesión para "anto"...');
    
    // Primero obtener el ID del niño anto desde el endpoint de status
    const statusResponse = await fetch(`${PRODUCTION_URL}/admin/status`);
    const status = await statusResponse.json();
    const anto = status.childrenList.find(c => c.name === 'anto');
    
    if (!anto) {
      throw new Error('No se encontró el niño "anto"');
    }
    
    console.log('👶 Niño "anto" encontrado con ID:', anto.id);
    
    // Obtener juegos disponibles desde el endpoint de status
    const videojuegos = status.gamesList.find(g => g.name === 'videojuegos');
    
    if (!videojuegos) {
      throw new Error('No se encontró el juego "videojuegos"');
    }
    
    console.log('🎮 Juego "videojuegos" encontrado con ID:', videojuegos.id);
    
    // Iniciar sesión
    const sessionData = {
      childId: anto.id,
      gameId: videojuegos.id,
      duration: 1 // 1 minuto para prueba
    };
    
    const response = await fetch(`${PRODUCTION_URL}/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Sesión iniciada exitosamente para "anto"!');
    console.log('📋 Datos de la sesión:', JSON.stringify(result, null, 2));
    
    // Verificar sesiones activas
    const activeResponse = await fetch(`${PRODUCTION_URL}/sessions/active`);
    const activeSessions = await activeResponse.json();
    console.log(`🎯 Sesiones activas: ${activeSessions.length}`);
    
  } catch (error) {
    console.error('❌ Error iniciando sesión para "anto":', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  startAntoSession();
}

module.exports = { startAntoSession };
