// Script para probar la conexión a Supabase
const { Pool } = require('pg');

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL no está configurada');
    return;
  }
  
  console.log('🔍 Probando conexión a Supabase...');
  console.log('📡 URL:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')); // Ocultar contraseña
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL!');
    
    // Probar una consulta simple
    const result = await client.query('SELECT version()');
    console.log('📊 Versión de PostgreSQL:', result.rows[0].version);
    
    // Probar crear una tabla
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla de prueba creada');
    
    // Insertar un registro de prueba
    const insertResult = await client.query(
      'INSERT INTO test_table (message) VALUES ($1) RETURNING *',
      ['Prueba de conexión exitosa']
    );
    console.log('✅ Registro de prueba insertado:', insertResult.rows[0]);
    
    // Limpiar
    await client.query('DROP TABLE test_table');
    console.log('✅ Tabla de prueba eliminada');
    
    await client.release();
    await pool.end();
    
    console.log('🎉 ¡TODAS LAS PRUEBAS EXITOSAS!');
    console.log('✅ Supabase está funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('');
    console.log('🔧 Posibles soluciones:');
    console.log('1️⃣ Verifica que la contraseña en DATABASE_URL sea correcta');
    console.log('2️⃣ Verifica que el proyecto de Supabase esté activo');
    console.log('3️⃣ Verifica que la URL esté completa y bien formateada');
    console.log('4️⃣ Espera unos minutos si acabas de crear el proyecto');
  }
}

// Ejecutar prueba
testConnection();
