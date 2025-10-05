const axios = require('axios');

const API_URL = 'https://temporizador-jade.vercel.app';

async function massCreateSessions() {
  try {
    console.log('🚀 Creando sesiones masivamente...');
    
    // Obtener datos existentes
    const [childrenResponse, gamesResponse] = await Promise.all([
      axios.get(`${API_URL}/children`),
      axios.get(`${API_URL}/games`)
    ]);
    
    const children = childrenResponse.data;
    const games = gamesResponse.data;
    
    console.log(`📊 Datos disponibles:`);
    console.log(`- Niños: ${children.length}`);
    console.log(`- Juegos: ${games.length}`);
    
    const targetSessions = 500; // Crear 500 sesiones activas
    const sessions = [];
    
    // Crear sesiones de manera más agresiva
    const batchSize = 100;
    
    for (let batch = 0; batch < Math.ceil(targetSessions / batchSize); batch++) {
      console.log(`\n📦 Procesando lote ${batch + 1}...`);
      
      const batchPromises = [];
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, targetSessions);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const child = children[i % children.length];
        const game = games[i % games.length];
        
        // 30% tendrán 1 minuto (para expirar rápido), 70% tendrán duración normal
        const duration = i % 3 === 0 ? 1 : Math.floor(Math.random() * 20) + 5;
        
        batchPromises.push(
          axios.post(`${API_URL}/sessions/start`, {
            childId: child.id,
            gameId: game.id,
            duration: duration
          }).then(response => response.data)
          .catch(error => {
            console.error(`❌ Error en sesión ${i + 1}:`, error.response?.data?.error || error.message);
            return null;
          })
        );
      }
      
      const batchResults = await Promise.all(batchPromises);
      const successfulSessions = batchResults.filter(session => session !== null);
      sessions.push(...successfulSessions);
      
      console.log(`✅ Lote ${batch + 1} completado: ${successfulSessions.length}/${batchSize} sesiones`);
      
      // Pausa entre lotes
      if (batch < Math.ceil(targetSessions / batchSize) - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Total sesiones creadas: ${sessions.length}`);
    
    // Verificar estado final
    const statusResponse = await axios.get(`${API_URL}/admin/status`);
    const status = statusResponse.data;
    
    console.log('\n📊 ESTADO FINAL:');
    console.log(`- Niños: ${status.children}`);
    console.log(`- Juegos: ${status.games}`);
    console.log(`- Sesiones totales: ${status.sessions}`);
    console.log(`- Sesiones activas: ${status.activeSessions}`);
    
    // Obtener algunas sesiones activas para verificar
    const activeResponse = await axios.get(`${API_URL}/sessions/active`);
    const activeSessions = activeResponse.data;
    
    console.log(`\n🔍 MUESTRA DE SESIONES ACTIVAS:`);
    activeSessions.slice(0, 5).forEach((session, index) => {
      console.log(`${index + 1}. ${session.childName} - ${session.gameName} - ${session.duration} min`);
    });
    
    if (activeSessions.length > 5) {
      console.log(`... y ${activeSessions.length - 5} sesiones más`);
    }
    
    return sessions;
    
  } catch (error) {
    console.error('❌ Error en creación masiva:', error.message);
  }
}

// Ejecutar
massCreateSessions();
