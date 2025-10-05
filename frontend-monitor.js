// Script para monitorear el rendimiento del frontend
const axios = require('axios');

const API_URL = 'https://temporizador-jade.vercel.app';

async function monitorFrontendPerformance() {
  console.log('📊 MONITOR DE RENDIMIENTO DEL FRONTEND');
  console.log('=' * 50);
  
  let iteration = 0;
  
  const monitor = async () => {
    iteration++;
    console.log(`\n🔍 Iteración ${iteration} - ${new Date().toLocaleTimeString()}`);
    
    try {
      // Medir tiempo de respuesta de endpoints críticos
      const startTime = Date.now();
      
      const [statusResponse, activeResponse, historyResponse] = await Promise.all([
        axios.get(`${API_URL}/admin/status`),
        axios.get(`${API_URL}/sessions/active`),
        axios.get(`${API_URL}/sessions`)
      ]);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const status = statusResponse.data;
      const activeSessions = activeResponse.data;
      const allSessions = historyResponse.data;
      
      // Análisis de rendimiento
      console.log(`⏱️ Tiempo de respuesta: ${responseTime}ms`);
      console.log(`📊 Datos cargados:`);
      console.log(`  - Niños: ${status.children}`);
      console.log(`  - Sesiones activas: ${activeSessions.length}`);
      console.log(`  - Total sesiones: ${allSessions.length}`);
      
      // Identificar sesiones que expirarán pronto
      const shortSessions = activeSessions.filter(s => s.duration === 1);
      const expiringSoon = activeSessions.filter(s => s.duration <= 5);
      
      console.log(`⚠️ Alertas potenciales:`);
      console.log(`  - Sesiones de 1 min: ${shortSessions.length}`);
      console.log(`  - Sesiones ≤5 min: ${expiringSoon.length}`);
      
      // Análisis de carga del frontend
      if (activeSessions.length > 100) {
        console.log(`🚨 ALTA CARGA: ${activeSessions.length} sesiones activas`);
        console.log(`   Recomendación: Verificar rendimiento del frontend`);
      } else if (activeSessions.length > 50) {
        console.log(`⚠️ CARGA MEDIA: ${activeSessions.length} sesiones activas`);
        console.log(`   Estado: Monitorear rendimiento`);
      } else {
        console.log(`✅ CARGA NORMAL: ${activeSessions.length} sesiones activas`);
      }
      
      // Análisis de alertas
      if (shortSessions.length > 10) {
        console.log(`🚨 ALERTAS MASIVAS: ${shortSessions.length} sesiones expirando`);
        console.log(`   Impacto: Alto en rendimiento del frontend`);
      } else if (shortSessions.length > 5) {
        console.log(`⚠️ ALERTAS MÚLTIPLES: ${shortSessions.length} sesiones expirando`);
        console.log(`   Impacto: Medio en rendimiento del frontend`);
      } else if (shortSessions.length > 0) {
        console.log(`✅ ALERTAS CONTROLADAS: ${shortSessions.length} sesiones expirando`);
      }
      
      // Recomendaciones
      if (responseTime > 5000) {
        console.log(`🐌 RENDIMIENTO LENTO: ${responseTime}ms`);
        console.log(`   Recomendación: Optimizar backend o reducir carga`);
      } else if (responseTime > 2000) {
        console.log(`⚠️ RENDIMIENTO MEDIO: ${responseTime}ms`);
        console.log(`   Recomendación: Monitorear tendencia`);
      } else {
        console.log(`🚀 RENDIMIENTO ÓPTIMO: ${responseTime}ms`);
      }
      
      // Mostrar algunas sesiones activas
      if (activeSessions.length > 0) {
        console.log(`\n📋 Muestra de sesiones activas:`);
        activeSessions.slice(0, 3).forEach((session, index) => {
          console.log(`  ${index + 1}. ${session.childName} - ${session.gameName} - ${session.duration} min`);
        });
        if (activeSessions.length > 3) {
          console.log(`  ... y ${activeSessions.length - 3} más`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error en monitoreo:`, error.message);
    }
  };
  
  // Monitorear cada 30 segundos
  console.log('🔄 Iniciando monitoreo cada 30 segundos...');
  console.log('Presiona Ctrl+C para detener');
  
  monitor(); // Ejecutar inmediatamente
  
  const interval = setInterval(monitor, 30000);
  
  // Limpiar al salir
  process.on('SIGINT', () => {
    console.log('\n🛑 Monitoreo detenido');
    clearInterval(interval);
    process.exit(0);
  });
}

// Ejecutar
monitorFrontendPerformance();
