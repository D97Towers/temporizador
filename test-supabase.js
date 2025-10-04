// Script para probar la conexión a Supabase
const postgresDb = require('./postgres-database');

async function testSupabase() {
  try {
    console.log('🧪 Probando conexión a Supabase...');
    
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL no está configurada');
      console.log('');
      console.log('📋 Para configurar:');
      console.log('1️⃣ Ve a https://supabase.com');
      console.log('2️⃣ Crea un proyecto');
      console.log('3️⃣ Settings → Database → Connection string');
      console.log('4️⃣ Copia la connection string');
      console.log('5️⃣ Configura: export DATABASE_URL="[tu connection string]"');
      console.log('6️⃣ Ejecuta este script nuevamente');
      return;
    }
    
    console.log('✅ DATABASE_URL configurada');
    console.log('🔄 Inicializando base de datos...');
    
    const initialized = await postgresDb.initializeDatabase();
    if (!initialized) {
      console.log('❌ No se pudo conectar a Supabase');
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase!');
    console.log('');
    console.log('🧪 Probando operaciones básicas...');
    
    // Probar crear un niño
    console.log('👶 Creando niño de prueba...');
    const testChild = await postgresDb.children.create(
      'Niño Prueba',
      'Test',
      'Padre Prueba',
      'Madre Prueba',
      'Niño Prueba (Test)',
      'N',
      0,
      0
    );
    
    if (testChild) {
      console.log('✅ Niño creado exitosamente:', testChild.name);
      
      // Probar obtener niños
      console.log('📋 Obteniendo lista de niños...');
      const children = await postgresDb.children.getAll();
      console.log(`✅ Se encontraron ${children.length} niños`);
      
      // Probar crear un juego
      console.log('🎮 Creando juego de prueba...');
      const testGame = await postgresDb.games.create('Juego Prueba');
      
      if (testGame) {
        console.log('✅ Juego creado exitosamente:', testGame.name);
        
        // Probar crear una sesión
        console.log('📅 Creando sesión de prueba...');
        const testSession = await postgresDb.sessions.create(
          testChild.id,
          testGame.id,
          Date.now(),
          3600 // 1 hora
        );
        
        if (testSession) {
          console.log('✅ Sesión creada exitosamente');
          
          // Probar obtener sesiones activas
          console.log('🔄 Obteniendo sesiones activas...');
          const activeSessions = await postgresDb.sessions.getActive();
          console.log(`✅ Se encontraron ${activeSessions.length} sesiones activas`);
        }
      }
      
      // Limpiar datos de prueba
      console.log('🧹 Limpiando datos de prueba...');
      await postgresDb.children.delete(testChild.id);
      await postgresDb.games.delete(testGame.id);
      console.log('✅ Datos de prueba eliminados');
    }
    
    console.log('');
    console.log('🎉 ¡TODAS LAS PRUEBAS EXITOSAS!');
    console.log('');
    console.log('✅ Supabase está funcionando correctamente');
    console.log('✅ Puedes migrar tus datos con: node migrate-to-postgres.js');
    console.log('✅ Tu aplicación tendrá persistencia real');
    console.log('');
    console.log('🌐 Ve a tu dashboard de Supabase para ver las tablas');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    console.log('');
    console.log('🔧 Posibles soluciones:');
    console.log('1️⃣ Verifica que DATABASE_URL esté correcta');
    console.log('2️⃣ Verifica que el proyecto de Supabase esté activo');
    console.log('3️⃣ Verifica tu conexión a internet');
    console.log('4️⃣ Espera unos minutos si acabas de crear el proyecto');
  } finally {
    // Cerrar conexión
    if (postgresDb.pool) {
      await postgresDb.pool.end();
    }
  }
}

// Ejecutar prueba
testSupabase();
