#!/usr/bin/env node

const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('🔍 PROBANDO CONEXIÓN DIRECTA A SUPABASE\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurada');
    return;
  }
  
  let pool;
  try {
    console.log('🔗 Creando conexión a Supabase...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
    
    console.log('✅ Pool creado, probando conexión...');
    
    // Probar conexión básica
    const client = await pool.connect();
    console.log('✅ Conexión exitosa');
    
    // Listar tablas
    console.log('\n📋 LISTANDO TABLAS:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tablas encontradas:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Verificar estructura de tabla sessions
    if (tablesResult.rows.some(row => row.table_name === 'sessions')) {
      console.log('\n🔍 ESTRUCTURA DE TABLA SESSIONS:');
      const structureResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
      `);
      
      structureResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('\n❌ Tabla "sessions" no encontrada');
    }
    
    // Verificar RLS en sessions
    console.log('\n🔒 VERIFICANDO RLS EN TABLA SESSIONS:');
    const rlsResult = await client.query(`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE relname = 'sessions'
    `);
    
    if (rlsResult.rows.length > 0) {
      console.log(`  RLS habilitado: ${rlsResult.rows[0].relrowsecurity ? 'SÍ' : 'NO'}`);
    } else {
      console.log('  Tabla sessions no encontrada');
    }
    
    // Probar insertar en sessions
    console.log('\n🧪 PROBANDO INSERT EN SESSIONS:');
    try {
      const insertResult = await client.query(`
        INSERT INTO sessions (child_id, game_id, duration_minutes, start_time)
        VALUES (1, 1, 5, NOW())
        RETURNING id
      `);
      console.log(`✅ Insert exitoso, ID: ${insertResult.rows[0].id}`);
      
      // Limpiar el registro de prueba
      await client.query('DELETE FROM sessions WHERE id = $1', [insertResult.rows[0].id]);
      console.log('✅ Registro de prueba eliminado');
      
    } catch (insertError) {
      console.log(`❌ Error en insert: ${insertError.message}`);
      console.log(`   Código: ${insertError.code}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.error('   Código:', error.code);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔚 Conexión cerrada');
    }
  }
}

testDatabaseConnection().catch(console.error);