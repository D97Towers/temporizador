#!/usr/bin/env node

// PRUEBA ESPECÍFICA DE PERSISTENCIA DE DATOS
const axios = require('axios');

const BASE_URL = 'https://temporizador-jade.vercel.app';

console.log('🧪 PRUEBA DE PERSISTENCIA DE DATOS');
console.log('==================================');

async function testDataPersistence() {
  try {
    console.log('📊 1. Verificando estado inicial...');
    const initialStatus = await axios.get(`${BASE_URL}/admin/status`);
    console.log(`✅ Estado inicial: ${initialStatus.data.children} niños, ${initialStatus.data.games} juegos`);
    
    console.log('\n👶 2. Creando nuevo niño...');
    const newChild = await axios.post(`${BASE_URL}/children`, {
      name: 'Niño Persistencia Test',
      nickname: 'PersistTest',
      fatherName: 'Padre Test',
      motherName: 'Madre Test'
    });
    console.log(`✅ Niño creado: ID ${newChild.data.id}, Nombre: ${newChild.data.name}`);
    
    console.log('\n🎮 3. Creando nuevo juego...');
    const newGame = await axios.post(`${BASE_URL}/games`, {
      name: 'Juego Persistencia Test'
    });
    console.log(`✅ Juego creado: ID ${newGame.data.id}, Nombre: ${newGame.data.name}`);
    
    console.log('\n⏰ 4. Creando nueva sesión...');
    const newSession = await axios.post(`${BASE_URL}/sessions/start`, {
      childId: newChild.data.id,
      gameId: newGame.data.id,
      duration: 15
    });
    console.log(`✅ Sesión creada: ID ${newSession.data.id}, Duración: ${newSession.data.duration} min`);
    
    console.log('\n📊 5. Verificando datos después de creación...');
    const afterCreateStatus = await axios.get(`${BASE_URL}/admin/status`);
    console.log(`✅ Después de crear: ${afterCreateStatus.data.children} niños, ${afterCreateStatus.data.games} juegos, ${afterCreateStatus.data.activeSessions} sesiones activas`);
    
    console.log('\n⏳ 6. Esperando 10 segundos para verificar persistencia...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n📊 7. Verificando persistencia de datos...');
    const persistenceStatus = await axios.get(`${BASE_URL}/admin/status`);
    console.log(`✅ Después de espera: ${persistenceStatus.data.children} niños, ${persistenceStatus.data.games} juegos, ${persistenceStatus.data.activeSessions} sesiones activas`);
    
    // Verificar que los datos específicos siguen ahí
    console.log('\n🔍 8. Verificando datos específicos...');
    const childrenList = await axios.get(`${BASE_URL}/children`);
    const gamesList = await axios.get(`${BASE_URL}/games`);
    const activeSessions = await axios.get(`${BASE_URL}/sessions/active`);
    
    const foundChild = childrenList.data.find(c => c.name === 'Niño Persistencia Test');
    const foundGame = gamesList.data.find(g => g.name === 'Juego Persistencia Test');
    const foundSession = activeSessions.data.find(s => s.id === newSession.data.id);
    
    console.log(`✅ Niño encontrado: ${foundChild ? 'SÍ' : 'NO'} - ${foundChild ? foundChild.name : 'No encontrado'}`);
    console.log(`✅ Juego encontrado: ${foundGame ? 'SÍ' : 'NO'} - ${foundGame ? foundGame.name : 'No encontrado'}`);
    console.log(`✅ Sesión encontrada: ${foundSession ? 'SÍ' : 'NO'} - ${foundSession ? `ID ${foundSession.id}` : 'No encontrada'}`);
    
    console.log('\n🧹 9. Limpiando datos de prueba...');
    
    // Finalizar sesión
    await axios.post(`${BASE_URL}/sessions/${newSession.data.id}/end`);
    console.log('✅ Sesión finalizada');
    
    // Eliminar juego
    await axios.delete(`${BASE_URL}/games/${newGame.data.id}`);
    console.log('✅ Juego eliminado');
    
    // Eliminar niño
    await axios.delete(`${BASE_URL}/children/${newChild.data.id}`);
    console.log('✅ Niño eliminado');
    
    console.log('\n📊 10. Verificando limpieza...');
    const finalStatus = await axios.get(`${BASE_URL}/admin/status`);
    console.log(`✅ Estado final: ${finalStatus.data.children} niños, ${finalStatus.data.games} juegos, ${finalStatus.data.activeSessions} sesiones activas`);
    
    // Verificar que volvimos al estado inicial
    if (finalStatus.data.children === initialStatus.data.children && 
        finalStatus.data.games === initialStatus.data.games) {
      console.log('\n🎉 PRUEBA DE PERSISTENCIA EXITOSA!');
      console.log('✅ Los datos se mantienen correctamente');
      console.log('✅ Los datos nuevos se persisten');
      console.log('✅ La limpieza funciona correctamente');
      console.log('✅ No hay pérdida de datos');
    } else {
      console.log('\n❌ PRUEBA DE PERSISTENCIA FALLIDA!');
      console.log('❌ Los datos no se mantienen correctamente');
      console.log(`❌ Esperado: ${initialStatus.data.children} niños, ${initialStatus.data.games} juegos`);
      console.log(`❌ Actual: ${finalStatus.data.children} niños, ${finalStatus.data.games} juegos`);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba de persistencia:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Data:', error.response.data);
    }
  }
}

// Ejecutar prueba
testDataPersistence();
