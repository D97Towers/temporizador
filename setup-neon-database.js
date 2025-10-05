// SETUP NEON DATABASE - Configuración de base de datos PostgreSQL gratuita
// Este script te guía para configurar Neon (PostgreSQL gratuito)

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🚀 CONFIGURACIÓN DE BASE DE DATOS POSTGRESQL GRATUITA

Neon es una base de datos PostgreSQL gratuita perfecta para tu aplicación.

PASOS PARA CONFIGURAR NEON:

1. 🌐 Ve a: https://neon.tech
2. 📝 Crea una cuenta gratuita
3. 🆕 Crea un nuevo proyecto
4. 📋 Copia la connection string
5. 🔧 Configura la variable de entorno DATABASE_URL en Vercel

CONFIGURACIÓN EN VERCEL:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega: DATABASE_URL = [tu connection string de Neon]

CONNECTION STRING FORMATO:
postgresql://username:password@hostname:port/database?sslmode=require

¿Ya tienes configurado Neon? (y/n)
`);

rl.question('Respuesta: ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log(`
✅ PERFECTO! Ahora vamos a probar la conexión.

Ejecuta este comando para probar la conexión:
node test-database-connection.js
    `);
  } else {
    console.log(`
📋 INSTRUCCIONES DETALLADAS:

1. 🌐 Ve a https://neon.tech
2. 📝 Haz clic en "Sign Up" y crea tu cuenta
3. 🆕 Haz clic en "Create Project"
4. 📝 Dale un nombre a tu proyecto (ej: "temporizador-juegos")
5. 🌍 Selecciona una región cercana a ti
6. 💾 Selecciona el plan "Free" (gratuito)
7. ⏳ Espera a que se cree el proyecto
8. 📋 Haz clic en "Connection Details"
9. 📋 Copia la "Connection String"
10. 🔧 Ve a Vercel → Settings → Environment Variables
11. ➕ Agrega: DATABASE_URL = [tu connection string]
12. 🚀 Redeploya tu aplicación

Después de configurar, ejecuta:
node test-database-connection.js
    `);
  }
  
  rl.close();
});
