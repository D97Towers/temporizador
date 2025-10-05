#!/usr/bin/env node

const axios = require('axios');

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

class FrontendGamesDebugger {
  constructor() {
    this.errors = [];
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    
    this.results.push({
      timestamp,
      type,
      message
    });
  }

  async testBackendGamesEndpoint() {
    console.log('\n🔍 PRUEBA: Endpoint Backend /games');
    console.log('='.repeat(50));
    
    try {
      const response = await axios.get(`${PRODUCTION_URL}/games`);
      
      this.log(`Status: ${response.status}`, 'success');
      this.log(`Headers: ${JSON.stringify(response.headers)}`, 'info');
      this.log(`Data length: ${response.data ? response.data.length : 0}`, 'info');
      
      if (response.data && Array.isArray(response.data)) {
        this.log(`Games found: ${response.data.length}`, 'success');
        response.data.forEach((game, index) => {
          this.log(`Game ${index + 1}: ID=${game.id}, Name="${game.name}"`, 'success');
        });
        
        return response.data;
      } else {
        this.log('Invalid response format', 'error');
        return null;
      }
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      this.log(`Status: ${error.response?.status}`, 'error');
      this.log(`Response: ${JSON.stringify(error.response?.data)}`, 'error');
      return null;
    }
  }

  async testFrontendGamesLoading() {
    console.log('\n🔍 PRUEBA: Simulación de Carga Frontend');
    console.log('='.repeat(50));
    
    try {
      // Simular lo que hace el frontend
      const response = await fetch(`${PRODUCTION_URL}/games`);
      this.log(`Fetch status: ${response.status}`, response.ok ? 'success' : 'error');
      
      if (!response.ok) {
        this.log(`HTTP Error: ${response.status} ${response.statusText}`, 'error');
        return null;
      }
      
      const games = await response.json();
      this.log(`JSON parsed successfully`, 'success');
      this.log(`Games array length: ${games ? games.length : 0}`, 'info');
      
      if (Array.isArray(games)) {
        this.log('Array validation: PASSED', 'success');
        
        // Simular updateGameSelect
        const mockSelect = {
          innerHTML: '',
          options: []
        };
        
        const defaultOption = '<option value="">Seleccione un juego</option>';
        const gameOptions = games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
        
        mockSelect.innerHTML = defaultOption + gameOptions;
        
        this.log(`Mock select innerHTML length: ${mockSelect.innerHTML.length}`, 'info');
        this.log(`Default option present: ${mockSelect.innerHTML.includes('Seleccione un juego')}`, 'success');
        this.log(`Game options present: ${gameOptions.length > 0}`, 'success');
        
        if (games.length > 0) {
          this.log(`First game option: ${gameOptions.split('</option>')[0]}`, 'info');
        }
        
        return games;
      } else {
        this.log('Array validation: FAILED - Not an array', 'error');
        return null;
      }
      
    } catch (error) {
      this.log(`Fetch error: ${error.message}`, 'error');
      return null;
    }
  }

  async testConcurrentRequests() {
    console.log('\n🔍 PRUEBA: Requests Concurrentes');
    console.log('='.repeat(50));
    
    try {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          fetch(`${PRODUCTION_URL}/games`)
            .then(res => res.json())
            .then(games => ({ request: i, count: games ? games.length : 0, success: true }))
            .catch(err => ({ request: i, count: 0, success: false, error: err.message }))
        );
      }
      
      const results = await Promise.all(promises);
      
      this.log(`Concurrent requests completed: ${results.length}`, 'success');
      
      results.forEach(result => {
        if (result.success) {
          this.log(`Request ${result.request}: ${result.count} games`, 'success');
        } else {
          this.log(`Request ${result.request}: FAILED - ${result.error}`, 'error');
        }
      });
      
      const successCount = results.filter(r => r.success).length;
      const gameCounts = results.filter(r => r.success).map(r => r.count);
      const uniqueCounts = [...new Set(gameCounts)];
      
      this.log(`Successful requests: ${successCount}/5`, successCount === 5 ? 'success' : 'warning');
      this.log(`Game counts: [${gameCounts.join(', ')}]`, 'info');
      this.log(`Unique counts: [${uniqueCounts.join(', ')}]`, uniqueCounts.length === 1 ? 'success' : 'warning');
      
      if (uniqueCounts.length > 1) {
        this.log('INCONSISTENCY DETECTED: Different game counts returned', 'error');
      }
      
    } catch (error) {
      this.log(`Concurrent test error: ${error.message}`, 'error');
    }
  }

  async testCORSAndHeaders() {
    console.log('\n🔍 PRUEBA: CORS y Headers');
    console.log('='.repeat(50));
    
    try {
      const response = await fetch(`${PRODUCTION_URL}/games`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      this.log(`Response status: ${response.status}`, response.ok ? 'success' : 'error');
      this.log(`Response headers:`, 'info');
      
      for (const [key, value] of response.headers.entries()) {
        this.log(`  ${key}: ${value}`, 'info');
      }
      
      // Verificar CORS
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };
      
      this.log('CORS Headers:', 'info');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        this.log(`  ${key}: ${value || 'NOT SET'}`, value ? 'success' : 'warning');
      });
      
    } catch (error) {
      this.log(`CORS test error: ${error.message}`, 'error');
    }
  }

  generateReport() {
    console.log('\n📊 REPORTE DE DIAGNÓSTICO DE JUEGOS');
    console.log('='.repeat(60));
    
    const totalTests = this.results.length;
    const successCount = this.results.filter(r => r.type === 'success').length;
    const errorCount = this.results.filter(r => r.type === 'error').length;
    const warningCount = this.results.filter(r => r.type === 'warning').length;
    
    console.log(`\n📈 ESTADÍSTICAS:`);
    console.log(`✅ Éxitos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`⚠️ Advertencias: ${warningCount}`);
    
    if (errorCount > 0) {
      console.log(`\n🚨 ERRORES ENCONTRADOS:`);
      this.results.filter(r => r.type === 'error').forEach(error => {
        console.log(`   ❌ ${error.message}`);
      });
    }
    
    if (warningCount > 0) {
      console.log(`\n⚠️ ADVERTENCIAS:`);
      this.results.filter(r => r.type === 'warning').forEach(warning => {
        console.log(`   ⚠️ ${warning.message}`);
      });
    }
    
    // Generar reporte detallado
    const report = {
      timestamp: new Date().toISOString(),
      url: PRODUCTION_URL,
      summary: {
        totalTests,
        success: successCount,
        errors: errorCount,
        warnings: warningCount
      },
      results: this.results
    };
    
    console.log(`\n📄 Reporte detallado guardado en: frontend-games-debug.json`);
    require('fs').writeFileSync('frontend-games-debug.json', JSON.stringify(report, null, 2));
  }

  async runAllTests() {
    console.log('🔍 DIAGNÓSTICO DE PROBLEMA DE JUEGOS EN FRONTEND');
    console.log('='.repeat(60));
    console.log(`🎯 URL: ${PRODUCTION_URL}`);
    console.log(`⏰ Inicio: ${new Date().toISOString()}`);
    
    await this.testBackendGamesEndpoint();
    await this.testFrontendGamesLoading();
    await this.testConcurrentRequests();
    await this.testCORSAndHeaders();
    
    this.generateReport();
  }
}

// Ejecutar diagnóstico
const gamesDebugger = new FrontendGamesDebugger();
gamesDebugger.runAllTests();
