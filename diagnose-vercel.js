// DIAGNÓSTICO DE VERCEL - Verificar configuración de base de datos
// Este script diagnostica problemas de configuración en Vercel

console.log('🔍 DIAGNÓSTICO DE CONFIGURACIÓN VERCEL');
console.log('=====================================');

// Verificar variables de entorno
console.log('\n📋 VARIABLES DE ENTORNO:');
console.log('- VERCEL:', process.env.VERCEL);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL configurada:', !!process.env.DATABASE_URL);
console.log('- DATABASE_URL tipo:', typeof process.env.DATABASE_URL);
console.log('- DATABASE_URL contiene "supabase":', process.env.DATABASE_URL?.includes('supabase'));
console.log('- DATABASE_URL contiene "sslmode":', process.env.DATABASE_URL?.includes('sslmode'));

if (process.env.DATABASE_URL) {
  console.log('\n🔗 CONNECTION STRING:');
  const url = process.env.DATABASE_URL;
  // Ocultar password por seguridad
  const maskedUrl = url.replace(/:\w+@/, ':****@');
  console.log('- URL:', maskedUrl);
  console.log('- SSL mode:', url.includes('sslmode=require') ? 'require' : url.includes('sslmode=disable') ? 'disable' : 'not specified');
}

// Verificar dependencias
console.log('\n📦 DEPENDENCIAS:');
try {
  const pg = require('pg');
  console.log('- pg instalado:', true);
  console.log('- pg versión:', pg.version || 'unknown');
} catch (error) {
  console.log('- pg instalado:', false);
  console.log('- Error:', error.message);
}

// Verificar configuración SSL
console.log('\n🔒 CONFIGURACIÓN SSL:');
const sslConfig = process.env.VERCEL ? {
  rejectUnauthorized: false
} : false;
console.log('- SSL configurado:', sslConfig);

// Intentar conexión básica
console.log('\n🔄 PRUEBA DE CONEXIÓN:');
try {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  });
  
  console.log('- Pool creado:', true);
  
  pool.query('SELECT 1 as test')
    .then(result => {
      console.log('- Conexión exitosa:', true);
      console.log('- Test query result:', result.rows[0]);
      pool.end();
    })
    .catch(error => {
      console.log('- Conexión falló:', true);
      console.log('- Error:', error.message);
      console.log('- Error code:', error.code);
      pool.end();
    });
    
} catch (error) {
  console.log('- Error creando pool:', error.message);
}

console.log('\n✅ DIAGNÓSTICO COMPLETADO');
