const axios = require('axios');

const API_URL = 'https://temporizador-jade.vercel.app';

async function controlledStressTest() {
  try {
    console.log('🧪 PRUEBA DE ESTRÉS CONTROLADA - 100+ SESIONES');
    console.log('=' * 50);
    
    // Paso 1: Verificar estado inicial
    console.log('\n📋 Verificando estado inicial...');
    const statusResponse = await axios.get(`${API_URL}/admin/status`);
    const initialStatus = statusResponse.data;
    console.log('Estado inicial:', initialStatus);
    
    // Paso 2: Crear niños si no hay suficientes
    let children = [];
    if (initialStatus.children < 50) {
      console.log('\n👶 Creando niños...');
      const childrenData = [
        { name: 'Alejandro García', fatherName: 'Carlos García', motherName: 'María García' },
        { name: 'Andrés Rodríguez', fatherName: 'José Rodríguez', motherName: 'Ana Rodríguez' },
        { name: 'Antonio Martínez', fatherName: 'Miguel Martínez', motherName: 'Carmen Martínez' },
        { name: 'Carlos Hernández', fatherName: 'Luis Hernández', motherName: 'Isabel Hernández' },
        { name: 'David López', fatherName: 'Pedro López', motherName: 'Rosa López' },
        { name: 'Diego González', fatherName: 'Juan González', motherName: 'Elena González' },
        { name: 'Eduardo Pérez', fatherName: 'Francisco Pérez', motherName: 'Pilar Pérez' },
        { name: 'Fernando Sánchez', fatherName: 'Manuel Sánchez', motherName: 'Concepción Sánchez' },
        { name: 'Gabriel Ramírez', fatherName: 'Antonio Ramírez', motherName: 'Dolores Ramírez' },
        { name: 'Gonzalo Cruz', fatherName: 'José Cruz', motherName: 'Teresa Cruz' }
      ];
      
      for (const childData of childrenData) {
        try {
          const response = await axios.post(`${API_URL}/children`, childData);
          children.push(response.data);
          console.log(`✅ Creado: ${childData.name}`);
        } catch (error) {
          console.error(`❌ Error creando ${childData.name}:`, error.response?.data?.error || error.message);
        }
      }
    } else {
      // Obtener niños existentes
      const childrenResponse = await axios.get(`${API_URL}/children`);
      children = childrenResponse.data;
      console.log(`✅ Usando ${children.length} niños existentes`);
    }
    
    // Paso 3: Obtener juegos
    const gamesResponse = await axios.get(`${API_URL}/games`);
    const games = gamesResponse.data;
    console.log(`✅ Juegos disponibles: ${games.map(g => g.name).join(', ')}`);
    
    // Paso 4: Crear sesiones activas
    console.log('\n🎮 Creando sesiones activas...');
    const sessions = [];
    const targetSessions = 50; // Empezar con 50 sesiones
    
    for (let i = 0; i < targetSessions; i++) {
      try {
        const child = children[i % children.length];
        const game = games[i % games.length];
        
        // Crear sesiones con duraciones variadas
        // 40% tendrán 1 minuto (para expirar rápido y generar alertas)
        // 60% tendrán 5-30 minutos
        const duration = i % 5 < 2 ? 1 : Math.floor(Math.random() * 25) + 5;
        
        const sessionData = {
          childId: child.id,
          gameId: game.id,
          duration: duration
        };
        
        const response = await axios.post(`${API_URL}/sessions/start`, sessionData);
        sessions.push(response.data);
        
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Creadas ${i + 1} sesiones...`);
        }
        
        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error creando sesión ${i + 1}:`, error.response?.data?.error || error.message);
      }
    }
    
    // Paso 5: Verificar estado final
    console.log('\n📊 Estado final:');
    const finalStatusResponse = await axios.get(`${API_URL}/admin/status`);
    const finalStatus = finalStatusResponse.data;
    console.log(JSON.stringify(finalStatus, null, 2));
    
    // Paso 6: Obtener sesiones activas
    const activeResponse = await axios.get(`${API_URL}/sessions/active`);
    const activeSessions = activeResponse.data;
    
    console.log(`\n🔍 SESIONES ACTIVAS (${activeSessions.length}):`);
    activeSessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.childName} - ${session.gameName} - ${session.duration} min`);
    });
    
    // Paso 7: Análisis de sesiones que expirarán pronto
    const shortSessions = activeSessions.filter(s => s.duration === 1);
    console.log(`\n⚠️ Sesiones que expirarán en 1 minuto: ${shortSessions.length}`);
    
    if (shortSessions.length > 0) {
      console.log('Estas sesiones generarán alertas masivas:');
      shortSessions.slice(0, 5).forEach((session, index) => {
        console.log(`- ${session.childName} (${session.gameName})`);
      });
      if (shortSessions.length > 5) {
        console.log(`... y ${shortSessions.length - 5} más`);
      }
    }
    
    console.log('\n🎉 PRUEBA DE ESTRÉS PREPARADA');
    console.log('Ahora puedes probar el frontend con:');
    console.log(`- ${finalStatus.children} niños`);
    console.log(`- ${finalStatus.activeSessions} sesiones activas`);
    console.log(`- ${shortSessions.length} sesiones que expirarán pronto`);
    
    return {
      children: finalStatus.children,
      activeSessions: finalStatus.activeSessions,
      shortSessions: shortSessions.length,
      sessions: sessions
    };
    
  } catch (error) {
    console.error('❌ Error en prueba de estrés controlada:', error.message);
  }
}

// Ejecutar
controlledStressTest();
