const axios = require('axios');

const API_URL = 'https://temporizador-jade.vercel.app';

async function simulateTimeExpiration() {
  try {
    console.log('⏰ Simulando expiración de tiempo para generar alertas...');
    
    // Obtener sesiones activas
    const activeResponse = await axios.get(`${API_URL}/sessions/active`);
    const activeSessions = activeResponse.data;
    
    console.log(`📊 Sesiones activas encontradas: ${activeSessions.length}`);
    
    // Identificar sesiones que expirarán pronto (1 minuto)
    const shortSessions = activeSessions.filter(s => s.duration === 1);
    console.log(`⚠️ Sesiones que expirarán en 1 minuto: ${shortSessions.length}`);
    
    if (shortSessions.length === 0) {
      console.log('❌ No hay sesiones de 1 minuto. Creando algunas...');
      
      // Crear algunas sesiones de 1 minuto
      const childrenResponse = await axios.get(`${API_URL}/children`);
      const gamesResponse = await axios.get(`${API_URL}/games`);
      const children = childrenResponse.data;
      const games = gamesResponse.data;
      
      for (let i = 0; i < 10; i++) {
        try {
          const child = children[i % children.length];
          const game = games[i % games.length];
          
          await axios.post(`${API_URL}/sessions/start`, {
            childId: child.id,
            gameId: game.id,
            duration: 1 // 1 minuto
          });
          
          console.log(`✅ Creada sesión de 1 min para ${child.name}`);
        } catch (error) {
          console.error(`❌ Error creando sesión:`, error.response?.data?.error || error.message);
        }
      }
      
      // Obtener sesiones activas actualizadas
      const updatedResponse = await axios.get(`${API_URL}/sessions/active`);
      const updatedSessions = updatedResponse.data;
      const newShortSessions = updatedSessions.filter(s => s.duration === 1);
      
      console.log(`🎯 Sesiones de 1 minuto creadas: ${newShortSessions.length}`);
    }
    
    // Mostrar sesiones que van a expirar
    const finalResponse = await axios.get(`${API_URL}/sessions/active`);
    const finalSessions = finalResponse.data;
    const finalShortSessions = finalSessions.filter(s => s.duration === 1);
    
    console.log('\n🔍 SESIONES QUE EXPIRARÁN PRONTO:');
    finalShortSessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.childName} - ${session.gameName} - ${session.duration} min`);
    });
    
    console.log('\n⏳ Esperando que expiren las sesiones...');
    console.log('Las alertas deberían aparecer en el frontend en aproximadamente 1 minuto');
    
    // Monitorear el progreso
    let expiredCount = 0;
    const monitorInterval = setInterval(async () => {
      try {
        const currentResponse = await axios.get(`${API_URL}/sessions/active`);
        const currentSessions = currentResponse.data;
        const currentShortSessions = currentSessions.filter(s => s.duration === 1);
        
        const newExpired = finalShortSessions.length - currentShortSessions.length;
        if (newExpired > expiredCount) {
          expiredCount = newExpired;
          console.log(`🔥 ${expiredCount} sesiones han expirado - Se están generando alertas`);
        }
        
        if (currentShortSessions.length === 0) {
          console.log('\n🎉 Todas las sesiones de 1 minuto han expirado');
          console.log('✅ Las alertas masivas deberían estar apareciendo en el frontend');
          clearInterval(monitorInterval);
        }
      } catch (error) {
        console.error('Error monitoreando:', error.message);
      }
    }, 10000); // Verificar cada 10 segundos
    
    // Limpiar después de 5 minutos
    setTimeout(() => {
      clearInterval(monitorInterval);
      console.log('\n⏰ Monitoreo terminado después de 5 minutos');
    }, 300000);
    
  } catch (error) {
    console.error('❌ Error simulando expiración:', error.message);
  }
}

// Ejecutar
simulateTimeExpiration();
