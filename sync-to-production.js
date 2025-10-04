#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuración
const LOCAL_DATA_FILE = path.join(__dirname, 'data.json');
// Obtener URL de producción desde variable de entorno o usar URL por defecto
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://temporizador-juegos.vercel.app';

async function syncToProduction() {
  try {
    console.log('🔄 Iniciando sincronización de datos locales a producción...');
    
    // Leer datos locales
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      console.error('❌ No se encontró el archivo data.json local');
      process.exit(1);
    }
    
    const localData = JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    console.log(`📊 Datos locales encontrados:`);
    console.log(`   - Niños: ${localData.children.length}`);
    console.log(`   - Juegos: ${localData.games.length}`);
    console.log(`   - Sesiones: ${localData.sessions.length}`);
    
    // Enviar a producción
    console.log(`🚀 Enviando datos a producción: ${PRODUCTION_URL}`);
    
    const response = await fetch(`${PRODUCTION_URL}/admin/sync-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(localData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Sincronización exitosa!');
    console.log(`📈 Datos sincronizados en producción:`);
    console.log(`   - Niños: ${result.synced.children}`);
    console.log(`   - Juegos: ${result.synced.games}`);
    console.log(`   - Sesiones: ${result.synced.sessions}`);
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  syncToProduction();
}

module.exports = { syncToProduction };
