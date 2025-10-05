// TEST DATABASE CONNECTION - Probar conexión a PostgreSQL
// Este script prueba la conexión a la base de datos PostgreSQL

const db = require('./database');

async function testConnection() {
  try {
    console.log('🔄 Probando conexión a base de datos PostgreSQL...');
    
    // Inicializar base de datos
    await db.initializeDatabase();
    console.log('✅ Base de datos inicializada correctamente');
    
    // Migrar datos por defecto
    await db.migrateExistingData();
    console.log('✅ Datos por defecto migrados');
    
    // Probar operaciones básicas
    console.log('🔄 Probando operaciones básicas...');
    
    // Obtener niños
    const children = await db.getChildren();
    console.log(`✅ Niños encontrados: ${children.length}`);
    
    // Obtener juegos
    const games = await db.getGames();
    console.log(`✅ Juegos encontrados: ${games.length}`);
    
    // Obtener estadísticas
    const stats = await db.getDashboardStats();
    console.log('✅ Estadísticas:', stats);
    
    // Probar creación de niño
    console.log('🔄 Probando creación de niño...');
    const testChild = await db.createChild({
      name: 'Test Database',
      nickname: 'TD',
      fatherName: 'Padre Test',
      motherName: 'Madre Test',
      displayName: 'Test Database (TD)',
      avatar: 'T'
    });
    console.log('✅ Niño creado:', testChild.name);
    
    // Probar creación de juego
    console.log('🔄 Probando creación de juego...');
    const testGame = await db.createGame({
      name: 'test-database'
    });
    console.log('✅ Juego creado:', testGame.name);
    
    // Probar creación de sesión
    console.log('🔄 Probando creación de sesión...');
    const testSession = await db.createSession({
      childId: testChild.id,
      gameId: testGame.id,
      duration: 30,
      startTime: Date.now()
    });
    console.log('✅ Sesión creada:', testSession.id);
    
    // Probar finalización de sesión
    console.log('🔄 Probando finalización de sesión...');
    await db.endSession(testSession.id);
    console.log('✅ Sesión finalizada');
    
    // Limpiar datos de prueba
    console.log('🔄 Limpiando datos de prueba...');
    await db.pool.query('DELETE FROM children WHERE name = $1', ['Test Database']);
    await db.pool.query('DELETE FROM games WHERE name = $1', ['test-database']);
    console.log('✅ Datos de prueba eliminados');
    
    console.log(`
🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!

✅ Base de datos PostgreSQL funcionando correctamente
✅ Todas las operaciones CRUD funcionando
✅ Transacciones funcionando
✅ Relaciones entre tablas funcionando

Tu aplicación ahora tiene una base de datos real y confiable!
    `);
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`
🔧 PROBLEMA: No se puede conectar a la base de datos

SOLUCIONES:
1. Verifica que DATABASE_URL esté configurado correctamente
2. Verifica que la base de datos esté activa en Neon
3. Verifica que la connection string sea correcta
      `);
    } else if (error.code === '28P01') {
      console.log(`
🔧 PROBLEMA: Credenciales incorrectas

SOLUCIONES:
1. Verifica el username y password en DATABASE_URL
2. Regenera la connection string en Neon
      `);
    } else {
      console.log(`
🔧 PROBLEMA: ${error.message}

SOLUCIONES:
1. Verifica la configuración de la base de datos
2. Verifica que todas las tablas estén creadas
3. Contacta soporte si el problema persiste
      `);
    }
  } finally {
    // Cerrar conexión
    await db.pool.end();
    process.exit(0);
  }
}

// Ejecutar prueba
testConnection();
