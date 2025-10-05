const axios = require('axios');

const API_URL = 'https://temporizador-jade.vercel.app';

// Función para generar nombres únicos
function generateUniqueNames(count) {
  const firstNames = [
    'Alejandro', 'Andrés', 'Antonio', 'Carlos', 'David', 'Diego', 'Eduardo', 'Fernando',
    'Gabriel', 'Gonzalo', 'Héctor', 'Iván', 'Javier', 'Jorge', 'José', 'Juan',
    'Luis', 'Manuel', 'Miguel', 'Pablo', 'Pedro', 'Rafael', 'Ricardo', 'Roberto',
    'Sergio', 'Víctor', 'Adrián', 'Alberto', 'Álvaro', 'Andrés', 'Bruno', 'César',
    'Daniel', 'Emilio', 'Enrique', 'Felipe', 'Francisco', 'Guillermo', 'Hugo', 'Ignacio',
    'Joaquín', 'Leonardo', 'Marcos', 'Martín', 'Nicolás', 'Óscar', 'Patricio', 'Ramón',
    'Rodrigo', 'Samuel', 'Sebastián', 'Tomás', 'Valentín', 'Vicente', 'Agustín', 'Benjamín',
    'Cristian', 'Damián', 'Emanuel', 'Fabián', 'Gerardo', 'Hernán', 'Ismael', 'Julio',
    'Lorenzo', 'Mauricio', 'Nelson', 'Oliver', 'Pascual', 'Ramiro', 'Salvador', 'Tadeo',
    'Ulises', 'Vladimir', 'Walter', 'Xavier', 'Yago', 'Zacarías', 'Abraham', 'Adriel',
    'Ariel', 'Bautista', 'Ciro', 'Dante', 'Elías', 'Facundo', 'Gael', 'Hugo',
    'Iker', 'Jaziel', 'Kai', 'León', 'Mateo', 'Noah', 'Orion', 'Pablo',
    'Quinn', 'Rafael', 'Santiago', 'Tobías', 'Uriel', 'Víctor', 'William', 'Xavier',
    'Yahir', 'Zion', 'Aarón', 'Brayan', 'Caleb', 'Dante', 'Elías', 'Felix',
    'Gonzalo', 'Hugo', 'Isaac', 'Joaquín', 'Kevin', 'Liam', 'Maximiliano', 'Noah',
    'Oliver', 'Pablo', 'Rafael', 'Santiago', 'Tomás', 'Valentín', 'William', 'Xavier',
    'Yahir', 'Zion', 'Abraham', 'Adriel', 'Ariel', 'Bautista', 'Ciro', 'Dante'
  ];
  
  const lastNames = [
    'García', 'Rodríguez', 'Martínez', 'Hernández', 'López', 'González', 'Pérez', 'Sánchez',
    'Ramírez', 'Cruz', 'Flores', 'Reyes', 'Morales', 'Jiménez', 'Álvarez', 'Ruiz',
    'Torres', 'Díaz', 'Vargas', 'Romero', 'Sosa', 'Mendoza', 'Guerrero', 'Ramos',
    'Herrera', 'Medina', 'Castillo', 'Ortiz', 'Moreno', 'Gutiérrez', 'Vega', 'Rojas',
    'Silva', 'Muñoz', 'Delgado', 'Castro', 'Ortega', 'Ríos', 'Núñez', 'Contreras',
    'Espinoza', 'Sandoval', 'Campos', 'Valencia', 'Peña', 'Vásquez', 'León', 'Molina',
    'Herrera', 'Aguilar', 'Reyes', 'Jiménez', 'González', 'Martínez', 'Rodríguez', 'López',
    'Pérez', 'García', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Morales', 'Álvarez',
    'Ruiz', 'Torres', 'Díaz', 'Vargas', 'Romero', 'Sosa', 'Mendoza', 'Guerrero',
    'Ramos', 'Medina', 'Castillo', 'Ortiz', 'Moreno', 'Gutiérrez', 'Vega', 'Rojas',
    'Silva', 'Muñoz', 'Delgado', 'Castro', 'Ortega', 'Ríos', 'Núñez', 'Contreras',
    'Espinoza', 'Sandoval', 'Campos', 'Valencia', 'Peña', 'Vásquez', 'León', 'Molina',
    'Aguilar', 'Reyes', 'Jiménez', 'González', 'Martínez', 'Rodríguez', 'López', 'Pérez',
    'García', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Morales', 'Álvarez', 'Ruiz',
    'Torres', 'Díaz', 'Vargas', 'Romero', 'Sosa', 'Mendoza', 'Guerrero', 'Ramos'
  ];

  const names = [];
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const number = Math.floor(i / (firstNames.length * lastNames.length)) + 1;
    names.push({
      name: `${firstName} ${lastName}${number > 1 ? ` ${number}` : ''}`,
      fatherName: `Padre_${firstName}`,
      motherName: `Madre_${lastName}`
    });
  }
  return names;
}

// Función para crear niños
async function createChildren(count) {
  console.log(`\n🚀 Creando ${count} niños...`);
  const names = generateUniqueNames(count);
  const children = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const childData = {
        name: names[i].name,
        nickname: `nick_${i}`,
        fatherName: names[i].fatherName,
        motherName: names[i].motherName
      };
      
      const response = await axios.post(`${API_URL}/children`, childData);
      children.push(response.data);
      
      if ((i + 1) % 100 === 0) {
        console.log(`✅ Creados ${i + 1} niños...`);
      }
    } catch (error) {
      console.error(`❌ Error creando niño ${i + 1}:`, error.response?.data || error.message);
    }
  }
  
  console.log(`✅ Total niños creados: ${children.length}`);
  return children;
}

// Función para crear sesiones
async function createSessions(children, games) {
  console.log(`\n🎮 Creando sesiones para ${children.length} niños...`);
  const sessions = [];
  
  for (let i = 0; i < children.length; i++) {
    try {
      const child = children[i];
      const game = games[i % games.length];
      
      // Crear sesiones con duraciones variadas (algunas muy cortas para que expiren rápido)
      const duration = i % 10 === 0 ? 1 : Math.floor(Math.random() * 30) + 5; // 1 min para 10%, 5-35 min para el resto
      
      const sessionData = {
        childId: child.id,
        gameId: game.id,
        duration: duration
      };
      
      const response = await axios.post(`${API_URL}/sessions/start`, sessionData);
      sessions.push(response.data);
      
      if ((i + 1) % 100 === 0) {
        console.log(`✅ Creadas ${i + 1} sesiones...`);
      }
    } catch (error) {
      console.error(`❌ Error creando sesión ${i + 1}:`, error.response?.data || error.message);
    }
  }
  
  console.log(`✅ Total sesiones creadas: ${sessions.length}`);
  return sessions;
}

// Función principal
async function runStressTest() {
  try {
    console.log('🧪 INICIANDO PRUEBA DE ESTRÉS - 1000+ NIÑOS Y SESIONES');
    console.log('=' * 60);
    
    // Obtener juegos existentes
    console.log('\n📋 Obteniendo juegos existentes...');
    const gamesResponse = await axios.get(`${API_URL}/games`);
    const games = gamesResponse.data;
    console.log(`✅ Juegos disponibles: ${games.map(g => g.name).join(', ')}`);
    
    // Crear 1000+ niños
    const children = await createChildren(1000);
    
    // Crear sesiones para todos los niños
    const sessions = await createSessions(children, games);
    
    // Obtener estadísticas finales
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    const statusResponse = await axios.get(`${API_URL}/admin/status`);
    const status = statusResponse.data;
    console.log(JSON.stringify(status, null, 2));
    
    console.log('\n🎉 PRUEBA DE ESTRÉS COMPLETADA');
    console.log('Ahora puedes probar el frontend con 1000+ sesiones activas');
    
  } catch (error) {
    console.error('❌ Error en la prueba de estrés:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runStressTest();
}

module.exports = { runStressTest, createChildren, createSessions };
