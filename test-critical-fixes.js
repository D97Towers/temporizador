#!/usr/bin/env node

const axios = require('axios');

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

class CriticalFixesTester {
  constructor() {
    this.tests = [];
    this.errors = [];
  }

  logTest(testName, passed, details = '') {
    this.tests.push({ testName, passed, details, timestamp: new Date().toISOString() });
    
    if (passed) {
      console.log(`✅ ${testName}${details ? ': ' + details : ''}`);
    } else {
      this.errors.push({ testName, details });
      console.log(`❌ ${testName}${details ? ': ' + details : ''}`);
    }
  }

  async testChildSelectionFix() {
    console.log('\n🔍 PRUEBA: Corrección de childSelect');
    console.log('='.repeat(50));
    
    try {
      // Obtener niños disponibles
      const childrenResponse = await axios.get(`${PRODUCTION_URL}/children`);
      const children = childrenResponse.data;
      
      this.logTest('Obtener niños', children.length > 0, `${children.length} niños encontrados`);
      
      if (children.length > 0) {
        const child = children[0];
        
        // Simular la funcionalidad que antes fallaba
        this.logTest('Child ID válido', !!child.id, `ID: ${child.id}`);
        this.logTest('Child name válido', !!child.name, `Name: ${child.name}`);
        this.logTest('Child displayName válido', !!child.displayName, `DisplayName: ${child.displayName}`);
        
        // Verificar que los datos están en el formato correcto
        this.logTest('Estructura de niño correcta', 
          typeof child.id === 'number' && 
          typeof child.name === 'string' && 
          typeof child.displayName === 'string', 
          'Todos los campos tienen el tipo correcto');
      }
      
    } catch (error) {
      this.logTest('Obtener niños', false, error.message);
    }
  }

  async testSessionCreationFix() {
    console.log('\n🔍 PRUEBA: Corrección de creación de sesiones');
    console.log('='.repeat(50));
    
    try {
      // Obtener datos necesarios
      const childrenResponse = await axios.get(`${PRODUCTION_URL}/children`);
      const gamesResponse = await axios.get(`${PRODUCTION_URL}/games`);
      
      const children = childrenResponse.data;
      const games = gamesResponse.data;
      
      this.logTest('Datos para sesión disponibles', children.length > 0 && games.length > 0, 
        `${children.length} niños, ${games.length} juegos`);
      
      if (children.length > 0 && games.length > 0) {
        const child = children[0];
        const game = games[0];
        
        // Crear sesión de prueba
        const sessionResponse = await axios.post(`${PRODUCTION_URL}/sessions/start`, {
          childId: child.id,
          gameId: game.id,
          duration: 1
        });
        
        this.logTest('Crear sesión', sessionResponse.status === 201, `Status: ${sessionResponse.status}`);
        
        if (sessionResponse.status === 201) {
          const session = sessionResponse.data;
          
          this.logTest('Sesión creada correctamente', !!session.id, `ID: ${session.id}`);
          this.logTest('ChildId correcto', session.childId === child.id, `Esperado: ${child.id}, Actual: ${session.childId}`);
          this.logTest('GameId correcto', session.gameId === game.id, `Esperado: ${game.id}, Actual: ${session.gameId}`);
          this.logTest('Duration correcto', session.duration === 1, `Esperado: 1, Actual: ${session.duration}`);
          
          // Verificar que la sesión aparece en activas
          const activeResponse = await axios.get(`${PRODUCTION_URL}/sessions/active`);
          const activeSessions = activeResponse.data;
          const foundSession = activeSessions.find(s => s.id === session.id);
          
          this.logTest('Sesión en activas', !!foundSession, foundSession ? 'Encontrada' : 'No encontrada');
          
          // Terminar la sesión de prueba
          const endResponse = await axios.post(`${PRODUCTION_URL}/sessions/${session.id}/end`);
          this.logTest('Terminar sesión de prueba', endResponse.status === 200, `Status: ${endResponse.status}`);
        }
      }
      
    } catch (error) {
      this.logTest('Crear sesión', false, error.message);
    }
  }

  async testEditChildFix() {
    console.log('\n🔍 PRUEBA: Corrección de edición de niños');
    console.log('='.repeat(50));
    
    try {
      // Crear un niño de prueba para editar
      const testChildName = `TestEdit${Date.now()}`;
      const createResponse = await axios.post(`${PRODUCTION_URL}/children`, {
        name: testChildName,
        nickname: 'TestNick',
        fatherName: 'TestFather',
        motherName: 'TestMother'
      });
      
      this.logTest('Crear niño para editar', createResponse.status === 201, `Status: ${createResponse.status}`);
      
      if (createResponse.status === 201) {
        const newChild = createResponse.data;
        
        // Editar el niño (esto antes fallaba con 404)
        const editResponse = await axios.put(`${PRODUCTION_URL}/children/${newChild.id}`, {
          name: `${testChildName}Edited`,
          nickname: 'EditedNick',
          fatherName: 'EditedFather',
          motherName: 'EditedMother'
        });
        
        this.logTest('Editar niño (PUT endpoint)', editResponse.status === 200, `Status: ${editResponse.status}`);
        
        if (editResponse.status === 200) {
          const editedChild = editResponse.data;
          
          this.logTest('Nombre editado', editedChild.name.includes('Edited'), `Name: ${editedChild.name}`);
          this.logTest('Nickname editado', editedChild.nickname === 'EditedNick', `Nickname: ${editedChild.nickname}`);
          this.logTest('Father name editado', editedChild.fatherName === 'EditedFather', `Father: ${editedChild.fatherName}`);
          this.logTest('Mother name editado', editedChild.motherName === 'EditedMother', `Mother: ${editedChild.motherName}`);
          this.logTest('DisplayName regenerado', editedChild.displayName.includes('Edited'), `DisplayName: ${editedChild.displayName}`);
        }
      }
      
    } catch (error) {
      this.logTest('Editar niño', false, error.message);
    }
  }

  async testModalFunctionalityFix() {
    console.log('\n🔍 PRUEBA: Corrección de modales');
    console.log('='.repeat(50));
    
    try {
      // Obtener datos para crear una sesión
      const childrenResponse = await axios.get(`${PRODUCTION_URL}/children`);
      const gamesResponse = await axios.get(`${PRODUCTION_URL}/games`);
      
      const children = childrenResponse.data;
      const games = gamesResponse.data;
      
      if (children.length > 0 && games.length > 0) {
        const child = children[0];
        const game = games[0];
        
        // Crear sesión
        const sessionResponse = await axios.post(`${PRODUCTION_URL}/sessions/start`, {
          childId: child.id,
          gameId: game.id,
          duration: 5
        });
        
        if (sessionResponse.status === 201) {
          const session = sessionResponse.data;
          
          // Probar extensión de sesión (esto antes fallaba por error de sintaxis)
          const extendResponse = await axios.post(`${PRODUCTION_URL}/sessions/extend`, {
            sessionId: session.id,
            additionalTime: 3
          });
          
          this.logTest('Extender sesión', extendResponse.status === 200, `Status: ${extendResponse.status}`);
          
          if (extendResponse.status === 200) {
            const extendedSession = extendResponse.data;
            this.logTest('Duración extendida', extendedSession.duration === 8, 
              `Esperado: 8, Actual: ${extendedSession.duration}`);
          }
          
          // Terminar sesión de prueba
          await axios.post(`${PRODUCTION_URL}/sessions/${session.id}/end`);
        }
      }
      
    } catch (error) {
      this.logTest('Funcionalidad de modales', false, error.message);
    }
  }

  async testDataConsistency() {
    console.log('\n🔍 PRUEBA: Consistencia de datos');
    console.log('='.repeat(50));
    
    try {
      // Verificar que los datos son consistentes entre requests
      const statusResponse = await axios.get(`${PRODUCTION_URL}/admin/status`);
      const childrenResponse = await axios.get(`${PRODUCTION_URL}/children`);
      const gamesResponse = await axios.get(`${PRODUCTION_URL}/games`);
      
      const status = statusResponse.data;
      const children = childrenResponse.data;
      const games = gamesResponse.data;
      
      this.logTest('Consistencia children', status.children === children.length, 
        `Status: ${status.children}, Real: ${children.length}`);
      this.logTest('Consistencia games', status.games === games.length, 
        `Status: ${status.games}, Real: ${games.length}`);
      this.logTest('Consistencia sessions', status.sessions >= 0, 
        `Sessions: ${status.sessions}`);
      this.logTest('Consistencia activeSessions', status.activeSessions >= 0, 
        `Active: ${status.activeSessions}`);
      
    } catch (error) {
      this.logTest('Consistencia de datos', false, error.message);
    }
  }

  generateReport() {
    console.log('\n📊 REPORTE FINAL DE PRUEBAS CRÍTICAS');
    console.log('='.repeat(60));
    
    const totalTests = this.tests.length;
    const passedTests = this.tests.filter(t => t.passed).length;
    const failedTests = this.tests.filter(t => !t.passed).length;
    
    console.log(`\n📈 ESTADÍSTICAS:`);
    console.log(`✅ Pruebas pasadas: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`❌ Pruebas fallidas: ${failedTests}/${totalTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (failedTests === 0) {
      console.log(`\n🎉 ¡TODAS LAS CORRECCIONES CRÍTICAS FUNCIONAN!`);
      console.log(`✅ La aplicación está lista para uso en producción`);
    } else {
      console.log(`\n🚨 ALGUNAS CORRECCIONES NO FUNCIONAN:`);
      this.errors.forEach(error => {
        console.log(`   ❌ ${error.testName}: ${error.details}`);
      });
    }
    
    // Generar reporte detallado
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: ((passedTests/totalTests)*100).toFixed(1) + '%'
      },
      tests: this.tests,
      errors: this.errors
    };
    
    console.log(`\n📄 Reporte detallado guardado en: critical-fixes-report.json`);
    require('fs').writeFileSync('critical-fixes-report.json', JSON.stringify(report, null, 2));
  }

  async runAllTests() {
    console.log('🔍 PRUEBAS DE CORRECCIONES CRÍTICAS');
    console.log('='.repeat(60));
    console.log(`🎯 URL: ${PRODUCTION_URL}`);
    console.log(`⏰ Inicio: ${new Date().toISOString()}`);
    
    await this.testChildSelectionFix();
    await this.testSessionCreationFix();
    await this.testEditChildFix();
    await this.testModalFunctionalityFix();
    await this.testDataConsistency();
    
    this.generateReport();
  }
}

// Ejecutar pruebas
const tester = new CriticalFixesTester();
tester.runAllTests();
