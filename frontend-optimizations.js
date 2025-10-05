// Optimizaciones para el frontend para manejar 1000+ alertas
// Este script modificará el HTML para mejorar el rendimiento

const fs = require('fs');
const path = require('path');

function optimizeFrontendForStressTest() {
  console.log('🔧 Aplicando optimizaciones para prueba de estrés...');
  
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // 1. Optimizar renderizado de sesiones activas
  const optimizedRenderActiveSessions = `
    function renderActiveSessions() {
      const list = document.getElementById('activeSessions');
      if (!list) return;
      
      // Limitar a 50 sesiones visibles para mejor rendimiento
      const visibleSessions = activeSessionsData.slice(0, 50);
      const hiddenCount = activeSessionsData.length - 50;
      
      if (activeSessionsData.length === 0) {
        if (list.innerHTML !== '<li class="list-item">No hay sesiones activas</li>') {
          list.innerHTML = '<li class="list-item">No hay sesiones activas</li>';
        }
        return;
      }
      
      // Solo re-renderizar si la estructura cambió
      const sessionHash = visibleSessions.map(s => \`\${s.id}-\${s.childId}-\${s.gameId}-\${s.duration}\`).join('|');
      
      if (list.dataset.sessionHash !== sessionHash) {
        let html = visibleSessions.map(s => generateActiveSessionHTML(s)).join('');
        
        if (hiddenCount > 0) {
          html += \`<li class="list-item info"><i class="fas fa-info-circle"></i> ... y \${hiddenCount} sesiones más</li>\`;
        }
        
        list.innerHTML = html;
        list.dataset.sessionHash = sessionHash;
        startTimers();
        console.log('Active sessions structure updated:', visibleSessions.length, 'visible,', hiddenCount, 'hidden');
      }
    }`;
  
  // 2. Optimizar gestión de alertas
  const optimizedAlertSystem = `
    // Sistema de alertas optimizado
    let alertQueue = [];
    let alertProcessing = false;
    const MAX_ALERTS = 10; // Máximo 10 alertas simultáneas
    
    function showOptimizedAlert(msg, type = 'info', sessionId = null) {
      alertQueue.push({ msg, type, sessionId });
      processAlertQueue();
    }
    
    function processAlertQueue() {
      if (alertProcessing || alertQueue.length === 0) return;
      
      alertProcessing = true;
      
      // Mostrar hasta MAX_ALERTS alertas
      const alertsToShow = alertQueue.splice(0, MAX_ALERTS);
      
      alertsToShow.forEach((alert, index) => {
        setTimeout(() => {
          showAlert(alert.msg, alert.type, alert.sessionId);
        }, index * 100); // Espaciar alertas por 100ms
      });
      
      // Si quedan alertas en la cola, procesarlas después
      if (alertQueue.length > 0) {
        setTimeout(() => {
          alertProcessing = false;
          processAlertQueue();
        }, MAX_ALERTS * 100);
      } else {
        alertProcessing = false;
      }
    }
    
    // Función para agrupar alertas similares
    function groupSimilarAlerts() {
      const grouped = {};
      alertQueue.forEach(alert => {
        const key = alert.msg.replace(/\\d+/g, 'X'); // Reemplazar números con X
        if (!grouped[key]) {
          grouped[key] = { count: 0, alert };
        }
        grouped[key].count++;
      });
      
      alertQueue = [];
      Object.values(grouped).forEach(group => {
        if (group.count > 1) {
          alertQueue.push({
            msg: group.alert.msg.replace('para', \`para \${group.count} niños\`),
            type: group.alert.type,
            sessionId: group.alert.sessionId
          });
        } else {
          alertQueue.push(group.alert);
        }
      });
    }`;
  
  // 3. Optimizar timers
  const optimizedTimerSystem = `
    // Sistema de timers optimizado
    let timerUpdateInterval = null;
    const TIMER_UPDATE_FREQUENCY = 2000; // Actualizar cada 2 segundos en lugar de cada segundo
    
    function startOptimizedTimers() {
      // Limpiar timers de sesiones que ya no existen
      const currentSessionIds = activeSessionsData.map(s => s.id);
      timerIntervals.forEach((interval, sessionId) => {
        if (!currentSessionIds.includes(sessionId)) {
          clearInterval(interval);
          timerIntervals.delete(sessionId);
        }
      });
      
      // Crear timers solo para sesiones nuevas
      activeSessionsData.forEach(s => {
        if (!timerIntervals.has(s.id)) {
          const startTime = s.startTime || s.start || Date.now();
          updateTimer(s.id, startTime, s.duration);
          const interval = setInterval(() => updateTimer(s.id, startTime, s.duration), TIMER_UPDATE_FREQUENCY);
          timerIntervals.set(s.id, interval);
        }
      });
    }
    
    // Función para actualizar timers en lote
    function batchUpdateTimers() {
      const list = document.getElementById('activeSessions');
      if (!list) return;
      
      const timerElements = list.querySelectorAll('.timer');
      timerElements.forEach(timerElement => {
        const sessionId = parseInt(timerElement.closest('[data-session-id]')?.dataset.sessionId);
        if (sessionId && activeSessionsData.find(s => s.id === sessionId)) {
          const session = activeSessionsData.find(s => s.id === sessionId);
          if (session) {
            updateTimerElement(timerElement, session);
          }
        }
      });
    }`;
  
  // 4. Optimizar polling de datos
  const optimizedPolling = `
    // Polling optimizado - menos frecuente cuando hay muchas sesiones
    function getOptimalPollingInterval() {
      const sessionCount = activeSessionsData.length;
      if (sessionCount > 500) return 30000; // 30 segundos
      if (sessionCount > 100) return 15000; // 15 segundos
      return 10000; // 10 segundos por defecto
    }
    
    function startOptimizedPolling() {
      const interval = setInterval(async () => {
        try {
          await fetchActiveSessions();
          await fetchSessionHistory();
        } catch (error) {
          console.error('Error en polling optimizado:', error);
        }
      }, getOptimalPollingInterval());
      
      return interval;
    }`;
  
  // Reemplazar las funciones existentes
  html = html.replace(
    /function renderActiveSessions\(\)\s*\{[^}]*\}/s,
    optimizedRenderActiveSessions
  );
  
  // Agregar las nuevas funciones optimizadas antes del cierre del script
  html = html.replace(
    '</script>',
    optimizedAlertSystem + optimizedTimerSystem + optimizedPolling + '</script>'
  );
  
  // Guardar el archivo optimizado
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Optimizaciones aplicadas al frontend');
}

// Ejecutar optimizaciones
optimizeFrontendForStressTest();
