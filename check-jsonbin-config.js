#!/usr/bin/env node

// VERIFICAR CONFIGURACIÓN DE JSONBin.io
const axios = require('axios');

const BASE_URL = 'https://temporizador-jade.vercel.app';

console.log('🔍 VERIFICANDO CONFIGURACIÓN DE JSONBin.io');
console.log('==========================================');

async function checkJsonBinConfig() {
  try {
    console.log('📡 Probando endpoint de estado...');
    const response = await axios.get(`${BASE_URL}/admin/status`);
    console.log('✅ Estado del servidor:', response.data);
    
    // Verificar si hay información sobre el storage
    if (response.data.storage) {
      console.log('📊 Storage type:', response.data.storage);
    } else {
      console.log('⚠️ No se muestra información de storage');
    }
    
    console.log('\n📊 Datos actuales:');
    console.log(`- Niños: ${response.data.children}`);
    console.log(`- Juegos: ${response.data.games}`);
    console.log(`- Sesiones: ${response.data.sessions}`);
    console.log(`- Sesiones activas: ${response.data.activeSessions}`);
    
  } catch (error) {
    console.error('❌ Error verificando configuración:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Data:', error.response.data);
    }
  }
}

// Ejecutar verificación
checkJsonBinConfig();
