const Database = require('better-sqlite3');
const path = require('path');

// Crear conexión a la base de datos
const db = new Database(path.join(__dirname, 'data.db'));

// Crear tablas si no existen
function initializeDatabase() {
  // Tabla de niños
  db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de juegos
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de sesiones
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children (id),
      FOREIGN KEY (game_id) REFERENCES games (id)
    )
  `);

  console.log('Base de datos inicializada correctamente');
}

// Inicializar la base de datos
initializeDatabase();

module.exports = db;
