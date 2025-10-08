#!/usr/bin/env node

const { Pool } = require('pg');

async function createSessionsTable() {
  console.log('🔧 CREANDO TABLA DE SESIONES DE JUEGOS\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurada');
    return;
  }
  
  let pool;
  try {
    console.log('🔗 Conectando a Supabase...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
    
    const client = await pool.connect();
    console.log('✅ Conexión exitosa');
    
    // Verificar si ya existe una tabla de sesiones de juegos
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'game_sessions'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Tabla "game_sessions" ya existe');
      
      // Mostrar estructura
      const structureResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'game_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Estructura actual:');
      structureResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
    } else {
      console.log('📝 Creando tabla "game_sessions"...');
      
      // Crear la tabla
      await client.query(`
        CREATE TABLE game_sessions (
          id SERIAL PRIMARY KEY,
          child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
          game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
          duration_minutes INTEGER NOT NULL,
          start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_time TIMESTAMP WITH TIME ZONE NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      console.log('✅ Tabla "game_sessions" creada');
      
      // Habilitar RLS
      await client.query('ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY');
      console.log('✅ RLS habilitado');
      
      // Crear políticas permisivas
      await client.query(`
        CREATE POLICY "Allow all operations on game_sessions" 
        ON game_sessions FOR ALL 
        USING (true)
      `);
      console.log('✅ Política permisiva creada');
      
      // Crear índices para mejor rendimiento
      await client.query(`
        CREATE INDEX idx_game_sessions_child_id ON game_sessions(child_id)
      `);
      await client.query(`
        CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id)
      `);
      await client.query(`
        CREATE INDEX idx_game_sessions_active ON game_sessions(end_time) WHERE end_time IS NULL
      `);
      console.log('✅ Índices creados');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Código:', error.code);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔚 Conexión cerrada');
    }
  }
}

createSessionsTable().catch(console.error);
