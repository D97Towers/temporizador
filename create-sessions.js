const axios = require('axios');

const API_URL = 'https://temporizador-jade.vercel.app';

async function createSessionsForExistingChildren() {
  try {
    console.log('🎮 Creando sesiones para niños existentes...');
    
    // Obtener niños existentes
    const childrenResponse = await axios.get(`${API_URL}/children`);
    const children = childrenResponse.data;
    console.log(`✅ Niños disponibles: ${children.length}`);
    
    // Obtener juegos
    const gamesResponse = await axios.get(`${API_URL}/games`);
    const games = gamesResponse.data;
    console.log(`✅ Juegos disponibles: ${games.length}`);
    
    const sessions = [];
    const batchSize = 50; // Procesar en lotes de 50
    
    for (let i = 0; i < children.length; i += batchSize) {
      const batch = children.slice(i, i + batchSize);
      console.log(`\n📦 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(children.length/batchSize)}`);
      
      const promises = batch.map(async (child, index) => {
        try {
          const game = games[index % games.length];
          
          // Crear sesiones con duraciones variadas
          // 20% tendrán 1 minuto (para expirar rápido), 80% tendrán 5-30 minutos
          const duration = (i + index) % 5 === 0 ? 1 : Math.floor(Math.random() * 25) + 5;
          
          const sessionData = {
            childId: child.id,
            gameId: game.id,
            duration: duration
          };
          
          const response = await axios.post(`${API_URL}/sessions/start`, sessionData);
          return response.data;
        } catch (error) {
          console.error(`❌ Error creando sesión para ${child.name}:`, error.response?.data?.error || error.message);
          return null;
        }
      });
      
      const batchResults = await Promise.all(promises);
      const successfulSessions = batchResults.filter(session => session !== null);
      sessions.push(...successfulSessions);
      
      console.log(`✅ Lote completado: ${successfulSessions.length}/${batch.length} sesiones creadas`);
      
      // Pequeña pausa entre lotes para no sobrecargar el servidor
      if (i + batchSize < children.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎉 Total sesiones creadas: ${sessions.length}`);
    
    // Verificar estado final
    const statusResponse = await axios.get(`${API_URL}/admin/status`);
    const status = statusResponse.data;
    console.log('\n📊 Estado final:');
    console.log(`- Niños: ${status.children}`);
    console.log(`- Juegos: ${status.games}`);
    console.log(`- Sesiones totales: ${status.sessions}`);
    console.log(`- Sesiones activas: ${status.activeSessions}`);
    
    return sessions;
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar
createSessionsForExistingChildren();
