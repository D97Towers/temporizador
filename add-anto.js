#!/usr/bin/env node

const PRODUCTION_URL = 'https://temporizador-jade.vercel.app';

async function addAnto() {
  try {
    console.log('👶 Agregando niño "anto" a producción...');
    
    const childData = {
      name: 'anto',
      nickname: 'anto',
      fatherName: 'diego',
      motherName: 'carolina'
    };
    
    const response = await fetch(`${PRODUCTION_URL}/children`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(childData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Niño "anto" agregado exitosamente!');
    console.log('📋 Datos del niño:', JSON.stringify(result, null, 2));
    
    // Verificar que se agregó correctamente
    const statusResponse = await fetch(`${PRODUCTION_URL}/admin/status`);
    const status = await statusResponse.json();
    console.log(`📊 Total de niños en producción: ${status.children}`);
    
  } catch (error) {
    console.error('❌ Error agregando niño "anto":', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addAnto();
}

module.exports = { addAnto };
