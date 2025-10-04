// Script para migrar datos de SQLite a MySQL
const mysqlDb = require('./mysql-database');
const sqliteDb = require('./database');

async function migrateData() {
  try {
    console.log('🔄 Iniciando migración de datos a MySQL...');
    
    // Inicializar MySQL
    const mysqlInitialized = await mysqlDb.initializeDatabase();
    if (!mysqlInitialized) {
      console.log('❌ No se pudo inicializar MySQL. Verifica las variables de entorno.');
      return;
    }
    
    // Migrar niños
    console.log('👶 Migrando niños...');
    const sqliteChildren = sqliteDb.children.getAll.all();
    for (const child of sqliteChildren) {
      try {
        await mysqlDb.children.create(
          child.name,
          child.nickname,
          child.father_name,
          child.mother_name,
          child.display_name,
          child.avatar,
          child.total_sessions,
          child.total_time_played
        );
        console.log(`   ✅ ${child.name}`);
      } catch (error) {
        console.log(`   ❌ Error con ${child.name}:`, error.message);
      }
    }
    
    // Migrar juegos
    console.log('🎮 Migrando juegos...');
    const sqliteGames = sqliteDb.games.getAll.all();
    for (const game of sqliteGames) {
      try {
        await mysqlDb.games.create(game.name);
        console.log(`   ✅ ${game.name}`);
      } catch (error) {
        console.log(`   ❌ Error con ${game.name}:`, error.message);
      }
    }
    
    // Migrar sesiones
    console.log('📅 Migrando sesiones...');
    const sqliteSessions = sqliteDb.sessions.getAll.all();
    for (const session of sqliteSessions) {
      try {
        await mysqlDb.sessions.create(
          session.child_id,
          session.game_id,
          session.start_time,
          session.duration
        );
        console.log(`   ✅ Sesión ${session.id}`);
      } catch (error) {
        console.log(`   ❌ Error con sesión ${session.id}:`, error.message);
      }
    }
    
    console.log('✅ Migración completada exitosamente!');
    
    // Verificar datos migrados
    const mysqlChildren = await mysqlDb.children.getAll();
    const mysqlGames = await mysqlDb.games.getAll();
    const mysqlSessions = await mysqlDb.sessions.getAll();
    
    console.log('📊 Resumen de migración:');
    console.log(`   - Niños: ${mysqlChildren.length}`);
    console.log(`   - Juegos: ${mysqlGames.length}`);
    console.log(`   - Sesiones: ${mysqlSessions.length}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    // Cerrar conexión MySQL
    if (mysqlDb.pool) {
      await mysqlDb.pool.end();
    }
  }
}

// Ejecutar migración
migrateData();
