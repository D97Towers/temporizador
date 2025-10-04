// Script para migrar datos de SQLite a PostgreSQL (Neon/Supabase)
const postgresDb = require('./postgres-database');
const sqliteDb = require('./database');

async function migrateData() {
  try {
    console.log('🔄 Iniciando migración de datos a PostgreSQL...');
    
    // Inicializar PostgreSQL
    const postgresInitialized = await postgresDb.initializeDatabase();
    if (!postgresInitialized) {
      console.log('❌ No se pudo inicializar PostgreSQL. Verifica la variable DATABASE_URL.');
      return;
    }
    
    // Migrar niños
    console.log('👶 Migrando niños...');
    const sqliteChildren = sqliteDb.children.getAll.all();
    for (const child of sqliteChildren) {
      try {
        await postgresDb.children.create(
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
        await postgresDb.games.create(game.name);
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
        await postgresDb.sessions.create(
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
    const postgresChildren = await postgresDb.children.getAll();
    const postgresGames = await postgresDb.games.getAll();
    const postgresSessions = await postgresDb.sessions.getAll();
    
    console.log('📊 Resumen de migración:');
    console.log(`   - Niños: ${postgresChildren.length}`);
    console.log(`   - Juegos: ${postgresGames.length}`);
    console.log(`   - Sesiones: ${postgresSessions.length}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    // Cerrar conexión PostgreSQL
    if (postgresDb.pool) {
      await postgresDb.pool.end();
    }
  }
}

// Ejecutar migración
migrateData();
