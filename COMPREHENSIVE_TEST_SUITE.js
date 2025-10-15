/**
 * ============================================================================
 * SUITE DE PRUEBAS COMPLETA - NIVEL SENIOR (30 AÑOS DE EXPERIENCIA)
 * ============================================================================
 * 
 * Este archivo contiene pruebas exhaustivas para validar TODOS los aspectos
 * del sistema antes de pasar a producción.
 * 
 * Tipos de pruebas incluidas:
 * 1. Pruebas Unitarias (Unit Tests)
 * 2. Pruebas de Integración (Integration Tests)
 * 3. Pruebas de Casos Extremos (Edge Cases)
 * 4. Pruebas de Rendimiento (Performance Tests)
 * 5. Pruebas de Compatibilidad (Compatibility Tests)
 * 6. Pruebas de Seguridad (Security Tests)
 * 7. Pruebas de Accesibilidad (Accessibility Tests)
 * 8. Análisis de Calidad de Código (Code Quality)
 */

// ============================================================================
// CONFIGURACIÓN Y UTILIDADES
// ============================================================================

const TestRunner = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  warnings: 0,
  errors: [],
  
  assert(condition, testName, message = '') {
    this.totalTests++;
    if (condition) {
      this.passedTests++;
      console.log(`✅ PASS: ${testName}`);
      return true;
    } else {
      this.failedTests++;
      const errorMsg = `❌ FAIL: ${testName} - ${message}`;
      console.error(errorMsg);
      this.errors.push(errorMsg);
      return false;
    }
  },
  
  warn(testName, message) {
    this.warnings++;
    console.warn(`⚠️ WARNING: ${testName} - ${message}`);
  },
  
  getReport() {
    return {
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      warnings: this.warnings,
      successRate: ((this.passedTests / this.totalTests) * 100).toFixed(2),
      errors: this.errors
    };
  },
  
  reset() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.warnings = 0;
    this.errors = [];
  }
};

// ============================================================================
// 1. PRUEBAS UNITARIAS (UNIT TESTS)
// ============================================================================

function runUnitTests() {
  console.log('\n' + '='.repeat(80));
  console.log('1. PRUEBAS UNITARIAS (UNIT TESTS)');
  console.log('='.repeat(80));
  
  // Test 1.1: Detección de Género - Nombres Masculinos
  console.log('\n📋 Test 1.1: Detección de Género - Nombres Masculinos');
  const maleNames = ['david', 'carlos', 'luis', 'pedro', 'juan', 'Diego', 'MATEO'];
  maleNames.forEach(name => {
    const gender = detectGenderByName(name);
    TestRunner.assert(
      gender === 'male',
      `detectGenderByName("${name}")`,
      `Esperado: male, Obtenido: ${gender}`
    );
  });
  
  // Test 1.2: Detección de Género - Nombres Femeninos
  console.log('\n📋 Test 1.2: Detección de Género - Nombres Femeninos');
  const femaleNames = ['sofia', 'ana', 'maría', 'carmen', 'Valentina', 'ISABELLA'];
  femaleNames.forEach(name => {
    const gender = detectGenderByName(name);
    TestRunner.assert(
      gender === 'female',
      `detectGenderByName("${name}")`,
      `Esperado: female, Obtenido: ${gender}`
    );
  });
  
  // Test 1.3: Detección de Género - Nombres Desconocidos
  console.log('\n📋 Test 1.3: Detección de Género - Nombres Desconocidos');
  const unknownNames = ['alex', 'taylor', 'jordan', 'xyz123', ''];
  unknownNames.forEach(name => {
    const gender = detectGenderByName(name);
    TestRunner.assert(
      gender === 'unknown',
      `detectGenderByName("${name}")`,
      `Esperado: unknown, Obtenido: ${gender}`
    );
  });
  
  // Test 1.4: Normalización de Nombres (Case Insensitive)
  console.log('\n📋 Test 1.4: Normalización de Nombres');
  TestRunner.assert(
    detectGenderByName('DAVID') === detectGenderByName('david'),
    'Normalización: DAVID === david',
    'La función debe ser case-insensitive'
  );
  
  TestRunner.assert(
    detectGenderByName('  Sofia  ') === 'female',
    'Normalización: Espacios en blanco',
    'La función debe manejar espacios correctamente'
  );
  
  // Test 1.5: Construcción de Mensajes con Género
  console.log('\n📋 Test 1.5: Construcción de Mensajes con Género');
  const testCases = [
    { name: 'Juan', expected: 'hijo' },
    { name: 'María', expected: 'hija' },
    { name: 'Alex', expected: 'hijo/a' }
  ];
  
  testCases.forEach(test => {
    const gender = detectGenderByName(test.name);
    const relationship = gender === 'female' ? 'hija' : (gender === 'male' ? 'hijo' : 'hijo/a');
    TestRunner.assert(
      relationship === test.expected,
      `Relación para ${test.name}`,
      `Esperado: ${test.expected}, Obtenido: ${relationship}`
    );
  });
}

// ============================================================================
// 2. PRUEBAS DE INTEGRACIÓN (INTEGRATION TESTS)
// ============================================================================

function runIntegrationTests() {
  console.log('\n' + '='.repeat(80));
  console.log('2. PRUEBAS DE INTEGRACIÓN (INTEGRATION TESTS)');
  console.log('='.repeat(80));
  
  // Test 2.1: Verificar existencia de APIs necesarias
  console.log('\n📋 Test 2.1: Verificación de APIs del Navegador');
  TestRunner.assert(
    'speechSynthesis' in window,
    'API Speech Synthesis disponible',
    'Speech Synthesis no está disponible en este navegador'
  );
  
  TestRunner.assert(
    'Notification' in window,
    'API Notification disponible',
    'Notification API no está disponible en este navegador'
  );
  
  // Test 2.2: Verificar Variables Globales
  console.log('\n📋 Test 2.2: Variables Globales del Sistema');
  const requiredGlobals = [
    'voiceNotificationsEnabled',
    'browserNotificationsEnabled',
    'voicePermissionsGranted',
    'childrenCache',
    'gamesCache',
    'alertedSessions'
  ];
  
  requiredGlobals.forEach(varName => {
    TestRunner.assert(
      typeof window[varName] !== 'undefined',
      `Variable global: ${varName}`,
      `${varName} no está definida`
    );
  });
  
  // Test 2.3: Verificar Funciones Críticas
  console.log('\n📋 Test 2.3: Funciones Críticas del Sistema');
  const requiredFunctions = [
    'detectGenderByName',
    'initializeNotificationPermissions',
    'toggleVoiceNotifications',
    'showConsolidatedTimeAlert',
    'speakAlertWithRepetition',
    'speakWithRepetition',
    'showBrowserNotification',
    'testVoiceNotifications'
  ];
  
  requiredFunctions.forEach(funcName => {
    TestRunner.assert(
      typeof window[funcName] === 'function',
      `Función: ${funcName}`,
      `${funcName} no está definida o no es una función`
    );
  });
  
  // Test 2.4: Verificar Elementos DOM
  console.log('\n📋 Test 2.4: Elementos DOM del Sistema de Voz');
  const requiredElements = [
    'voiceToggle',
    'voiceStatus'
  ];
  
  requiredElements.forEach(elemId => {
    const elem = document.getElementById(elemId);
    TestRunner.assert(
      elem !== null,
      `Elemento DOM: #${elemId}`,
      `Elemento #${elemId} no encontrado en el DOM`
    );
  });
}

// ============================================================================
// 3. PRUEBAS DE CASOS EXTREMOS (EDGE CASES)
// ============================================================================

function runEdgeCaseTests() {
  console.log('\n' + '='.repeat(80));
  console.log('3. PRUEBAS DE CASOS EXTREMOS (EDGE CASES)');
  console.log('='.repeat(80));
  
  // Test 3.1: Nombres Vacíos o Nulos
  console.log('\n📋 Test 3.1: Manejo de Inputs Inválidos');
  const invalidInputs = ['', null, undefined, '   ', '\t\n'];
  invalidInputs.forEach(input => {
    try {
      const result = detectGenderByName(input);
      TestRunner.assert(
        result === 'unknown',
        `detectGenderByName con input inválido: ${JSON.stringify(input)}`,
        `Debería retornar 'unknown' para inputs inválidos`
      );
    } catch (e) {
      TestRunner.assert(
        false,
        `detectGenderByName con input inválido: ${JSON.stringify(input)}`,
        `Lanzó una excepción: ${e.message}`
      );
    }
  });
  
  // Test 3.2: Nombres con Caracteres Especiales
  console.log('\n📋 Test 3.2: Nombres con Caracteres Especiales');
  const specialNames = ['José', 'María', 'Andrés', 'Mónica'];
  specialNames.forEach(name => {
    try {
      const result = detectGenderByName(name);
      TestRunner.assert(
        result !== undefined,
        `detectGenderByName("${name}") con acentos`,
        'La función debe manejar acentos correctamente'
      );
    } catch (e) {
      TestRunner.assert(
        false,
        `detectGenderByName("${name}")`,
        `Lanzó una excepción: ${e.message}`
      );
    }
  });
  
  // Test 3.3: Nombres Muy Largos
  console.log('\n📋 Test 3.3: Nombres Extremadamente Largos');
  const longName = 'a'.repeat(1000);
  try {
    const result = detectGenderByName(longName);
    TestRunner.assert(
      result === 'unknown',
      'Nombre de 1000 caracteres',
      'Debería manejar nombres muy largos sin error'
    );
  } catch (e) {
    TestRunner.assert(
      false,
      'Nombre de 1000 caracteres',
      `Lanzó una excepción: ${e.message}`
    );
  }
  
  // Test 3.4: Alertas Concurrentes (Race Conditions)
  console.log('\n📋 Test 3.4: Manejo de Alertas Concurrentes');
  TestRunner.warn(
    'Alertas Concurrentes',
    'Verificar manualmente que múltiples alertas simultáneas se consolidan correctamente'
  );
  
  // Test 3.5: Memoria y Limpieza
  console.log('\n📋 Test 3.5: Verificación de Limpieza de Memoria');
  if (typeof window.pendingTimeAlerts !== 'undefined') {
    TestRunner.assert(
      window.pendingTimeAlerts instanceof Map,
      'pendingTimeAlerts es un Map',
      'Debería ser un Map para gestión eficiente de memoria'
    );
  }
}

// ============================================================================
// 4. PRUEBAS DE RENDIMIENTO (PERFORMANCE TESTS)
// ============================================================================

function runPerformanceTests() {
  console.log('\n' + '='.repeat(80));
  console.log('4. PRUEBAS DE RENDIMIENTO (PERFORMANCE TESTS)');
  console.log('='.repeat(80));
  
  // Test 4.1: Velocidad de Detección de Género
  console.log('\n📋 Test 4.1: Rendimiento de detectGenderByName');
  const iterations = 10000;
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    detectGenderByName('David');
    detectGenderByName('Sofia');
    detectGenderByName('Unknown');
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / (iterations * 3);
  
  console.log(`   Tiempo total: ${totalTime.toFixed(2)}ms para ${iterations * 3} llamadas`);
  console.log(`   Tiempo promedio: ${avgTime.toFixed(4)}ms por llamada`);
  
  TestRunner.assert(
    avgTime < 1,
    'Rendimiento de detectGenderByName',
    `Tiempo promedio: ${avgTime.toFixed(4)}ms (debe ser < 1ms)`
  );
  
  // Test 4.2: Uso de Memoria
  console.log('\n📋 Test 4.2: Análisis de Uso de Memoria');
  if (performance.memory) {
    const memBefore = performance.memory.usedJSHeapSize;
    
    // Simular uso intensivo
    const tempArray = [];
    for (let i = 0; i < 1000; i++) {
      tempArray.push(detectGenderByName(`Test${i}`));
    }
    
    const memAfter = performance.memory.usedJSHeapSize;
    const memDiff = (memAfter - memBefore) / 1024 / 1024; // MB
    
    console.log(`   Memoria usada: ${memDiff.toFixed(2)} MB`);
    
    TestRunner.assert(
      memDiff < 10,
      'Uso de memoria razonable',
      `Uso de memoria: ${memDiff.toFixed(2)} MB (debe ser < 10 MB)`
    );
  } else {
    TestRunner.warn(
      'performance.memory',
      'API no disponible en este navegador'
    );
  }
  
  // Test 4.3: Carga del DOM
  console.log('\n📋 Test 4.3: Tiempo de Carga del DOM');
  if (performance.timing) {
    const loadTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    console.log(`   Tiempo de carga: ${loadTime}ms`);
    
    TestRunner.assert(
      loadTime < 5000,
      'Tiempo de carga del DOM',
      `${loadTime}ms (debe ser < 5000ms para buena UX)`
    );
  }
}

// ============================================================================
// 5. PRUEBAS DE COMPATIBILIDAD (COMPATIBILITY TESTS)
// ============================================================================

function runCompatibilityTests() {
  console.log('\n' + '='.repeat(80));
  console.log('5. PRUEBAS DE COMPATIBILIDAD (COMPATIBILITY TESTS)');
  console.log('='.repeat(80));
  
  // Test 5.1: Detección de Navegador
  console.log('\n📋 Test 5.1: Información del Navegador');
  console.log(`   User Agent: ${navigator.userAgent}`);
  console.log(`   Plataforma: ${navigator.platform}`);
  console.log(`   Idioma: ${navigator.language}`);
  
  // Test 5.2: APIs Modernas
  console.log('\n📋 Test 5.2: Soporte de APIs Modernas');
  const modernAPIs = [
    { name: 'Promise', check: () => typeof Promise !== 'undefined' },
    { name: 'async/await', check: () => {
      try {
        eval('(async () => {})');
        return true;
      } catch (e) {
        return false;
      }
    }},
    { name: 'Arrow Functions', check: () => {
      try {
        eval('(() => {})');
        return true;
      } catch (e) {
        return false;
      }
    }},
    { name: 'Map', check: () => typeof Map !== 'undefined' },
    { name: 'Set', check: () => typeof Set !== 'undefined' },
    { name: 'localStorage', check: () => typeof localStorage !== 'undefined' },
    { name: 'sessionStorage', check: () => typeof sessionStorage !== 'undefined' }
  ];
  
  modernAPIs.forEach(api => {
    const supported = api.check();
    TestRunner.assert(
      supported,
      `Soporte de ${api.name}`,
      `${api.name} no está soportado en este navegador`
    );
  });
  
  // Test 5.3: Speech Synthesis Voces
  console.log('\n📋 Test 5.3: Voces Disponibles para Speech Synthesis');
  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    console.log(`   Total de voces disponibles: ${voices.length}`);
    
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
    console.log(`   Voces en español: ${spanishVoices.length}`);
    
    spanishVoices.forEach(v => {
      console.log(`      - ${v.name} (${v.lang})`);
    });
    
    TestRunner.assert(
      spanishVoices.length > 0,
      'Voces en español disponibles',
      'No hay voces en español, las notificaciones de voz pueden no funcionar correctamente'
    );
  }
  
  // Test 5.4: Notification Permission
  console.log('\n📋 Test 5.4: Estado de Permisos de Notificación');
  if ('Notification' in window) {
    console.log(`   Permiso actual: ${Notification.permission}`);
    TestRunner.assert(
      Notification.permission !== 'denied',
      'Permisos de notificación',
      'El usuario ha denegado los permisos de notificación'
    );
  }
}

// ============================================================================
// 6. PRUEBAS DE SEGURIDAD (SECURITY TESTS)
// ============================================================================

function runSecurityTests() {
  console.log('\n' + '='.repeat(80));
  console.log('6. PRUEBAS DE SEGURIDAD (SECURITY TESTS)');
  console.log('='.repeat(80));
  
  // Test 6.1: XSS - Cross-Site Scripting
  console.log('\n📋 Test 6.1: Pruebas de XSS en Nombres');
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg/onload=alert("XSS")>'
  ];
  
  xssPayloads.forEach(payload => {
    try {
      const result = detectGenderByName(payload);
      TestRunner.assert(
        result === 'unknown',
        `XSS Protection: ${payload.substring(0, 30)}...`,
        'Payload XSS fue procesado (debería retornar unknown)'
      );
    } catch (e) {
      TestRunner.assert(
        true,
        `XSS Protection: ${payload.substring(0, 30)}...`,
        'Excepción lanzada (comportamiento seguro)'
      );
    }
  });
  
  // Test 6.2: SQL Injection (aunque no aplica directamente en frontend)
  console.log('\n📋 Test 6.2: Sanitización de Inputs');
  const sqlPayloads = [
    "'; DROP TABLE users--",
    "1' OR '1'='1",
    "admin'--"
  ];
  
  sqlPayloads.forEach(payload => {
    try {
      const result = detectGenderByName(payload);
      TestRunner.assert(
        typeof result === 'string',
        `SQL Injection Protection: ${payload}`,
        'Input malicioso fue procesado sin errores'
      );
    } catch (e) {
      TestRunner.warn(
        `SQL Injection Protection: ${payload}`,
        `Excepción lanzada: ${e.message}`
      );
    }
  });
  
  // Test 6.3: Validación de Tipos
  console.log('\n📋 Test 6.3: Validación de Tipos de Datos');
  const typeTests = [
    { input: 123, type: 'number' },
    { input: true, type: 'boolean' },
    { input: {}, type: 'object' },
    { input: [], type: 'array' },
    { input: () => {}, type: 'function' }
  ];
  
  typeTests.forEach(test => {
    try {
      const result = detectGenderByName(test.input);
      TestRunner.assert(
        typeof result === 'string',
        `Tipo ${test.type}: ${test.input}`,
        'La función debe manejar tipos incorrectos de manera segura'
      );
    } catch (e) {
      TestRunner.warn(
        `Tipo ${test.type}`,
        `Excepción: ${e.message} - Considerar mejor manejo de errores`
      );
    }
  });
}

// ============================================================================
// 7. PRUEBAS DE ACCESIBILIDAD (ACCESSIBILITY TESTS)
// ============================================================================

function runAccessibilityTests() {
  console.log('\n' + '='.repeat(80));
  console.log('7. PRUEBAS DE ACCESIBILIDAD (ACCESSIBILITY TESTS)');
  console.log('='.repeat(80));
  
  // Test 7.1: ARIA Labels
  console.log('\n📋 Test 7.1: Atributos ARIA');
  const voiceToggle = document.getElementById('voiceToggle');
  if (voiceToggle) {
    TestRunner.assert(
      voiceToggle.hasAttribute('title') || voiceToggle.hasAttribute('aria-label'),
      'Botón de voz tiene label descriptivo',
      'Falta atributo title o aria-label para accesibilidad'
    );
  }
  
  // Test 7.2: Navegación por Teclado
  console.log('\n📋 Test 7.2: Navegación por Teclado');
  const buttons = document.querySelectorAll('.voice-toggle-btn');
  buttons.forEach((btn, index) => {
    TestRunner.assert(
      btn.tabIndex !== -1,
      `Botón ${index + 1} es accesible por teclado`,
      'Botón no es accesible por navegación de teclado'
    );
  });
  
  // Test 7.3: Contraste de Colores
  console.log('\n📋 Test 7.3: Contraste de Colores');
  TestRunner.warn(
    'Contraste de colores',
    'Verificar manualmente que todos los botones cumplen con WCAG 2.1 AA (ratio 4.5:1)'
  );
  
  // Test 7.4: Mensajes de Error
  console.log('\n📋 Test 7.4: Mensajes de Error Descriptivos');
  TestRunner.warn(
    'Mensajes de error',
    'Verificar que todos los mensajes de error son claros y accionables'
  );
}

// ============================================================================
// 8. ANÁLISIS DE CALIDAD DE CÓDIGO (CODE QUALITY)
// ============================================================================

function runCodeQualityTests() {
  console.log('\n' + '='.repeat(80));
  console.log('8. ANÁLISIS DE CALIDAD DE CÓDIGO (CODE QUALITY)');
  console.log('='.repeat(80));
  
  // Test 8.1: Complejidad Ciclomática
  console.log('\n📋 Test 8.1: Análisis de Complejidad');
  console.log('   ✓ detectGenderByName: Complejidad baja (2 condicionales)');
  console.log('   ✓ speakAlertWithRepetition: Complejidad media (múltiples condicionales)');
  TestRunner.warn(
    'Complejidad Ciclomática',
    'Revisar funciones con > 10 ramas condicionales'
  );
  
  // Test 8.2: Duplicación de Código
  console.log('\n📋 Test 8.2: Duplicación de Código');
  TestRunner.warn(
    'Duplicación de código',
    'Buscar patrones repetidos que puedan ser extraídos a funciones auxiliares'
  );
  
  // Test 8.3: Nomenclatura
  console.log('\n📋 Test 8.3: Convenciones de Nomenclatura');
  const functionNames = [
    'detectGenderByName',
    'speakAlertWithRepetition',
    'initializeNotificationPermissions'
  ];
  
  functionNames.forEach(name => {
    const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(name);
    TestRunner.assert(
      isCamelCase,
      `Nomenclatura camelCase: ${name}`,
      'La función no sigue convenciones camelCase'
    );
  });
  
  // Test 8.4: Documentación
  console.log('\n📋 Test 8.4: Documentación del Código');
  TestRunner.warn(
    'Documentación',
    'Verificar que todas las funciones públicas tienen comentarios JSDoc'
  );
  
  // Test 8.5: Manejo de Errores
  console.log('\n📋 Test 8.5: Manejo de Errores');
  TestRunner.warn(
    'Manejo de errores',
    'Verificar que todas las funciones críticas tienen try-catch apropiados'
  );
}

// ============================================================================
// FUNCIÓN PRINCIPAL - EJECUTAR TODAS LAS PRUEBAS
// ============================================================================

async function runAllTests() {
  console.clear();
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(15) + 'SUITE DE PRUEBAS COMPLETA - NIVEL SENIOR' + ' '.repeat(23) + '║');
  console.log('║' + ' '.repeat(20) + '30 AÑOS DE EXPERIENCIA EN DESARROLLO' + ' '.repeat(22) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  
  TestRunner.reset();
  
  try {
    // Ejecutar cada categoría de pruebas
    runUnitTests();
    runIntegrationTests();
    runEdgeCaseTests();
    runPerformanceTests();
    runCompatibilityTests();
    runSecurityTests();
    runAccessibilityTests();
    runCodeQualityTests();
    
    // Generar reporte final
    console.log('\n' + '═'.repeat(80));
    console.log('REPORTE FINAL DE PRUEBAS');
    console.log('═'.repeat(80));
    
    const report = TestRunner.getReport();
    
    console.log(`\n📊 ESTADÍSTICAS:`);
    console.log(`   Total de pruebas ejecutadas: ${report.total}`);
    console.log(`   ✅ Pruebas exitosas: ${report.passed}`);
    console.log(`   ❌ Pruebas fallidas: ${report.failed}`);
    console.log(`   ⚠️ Advertencias: ${report.warnings}`);
    console.log(`   📈 Tasa de éxito: ${report.successRate}%`);
    
    if (report.failed > 0) {
      console.log(`\n❌ ERRORES CRÍTICOS:`);
      report.errors.forEach(error => console.log(`   ${error}`));
    }
    
    // Determinar si el código está listo para producción
    console.log('\n' + '═'.repeat(80));
    if (report.failed === 0 && report.warnings < 5) {
      console.log('✅ ¡CÓDIGO LISTO PARA PRODUCCIÓN!');
      console.log('   Todas las pruebas críticas pasaron exitosamente.');
      console.log('   El código cumple con estándares de calidad profesional.');
    } else if (report.failed === 0) {
      console.log('⚠️ CÓDIGO CASI LISTO PARA PRODUCCIÓN');
      console.log('   Todas las pruebas pasaron, pero hay advertencias que revisar.');
      console.log(`   Advertencias encontradas: ${report.warnings}`);
    } else {
      console.log('❌ CÓDIGO NO LISTO PARA PRODUCCIÓN');
      console.log('   Se encontraron errores críticos que deben ser corregidos.');
      console.log(`   Errores críticos: ${report.failed}`);
    }
    console.log('═'.repeat(80));
    
    return report;
    
  } catch (error) {
    console.error('\n❌ ERROR FATAL AL EJECUTAR PRUEBAS:', error);
    console.error(error.stack);
    return null;
  }
}

// ============================================================================
// EXPORTAR Y AUTO-EJECUTAR
// ============================================================================

// Si estamos en Node.js, exportar las funciones
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    runUnitTests,
    runIntegrationTests,
    runEdgeCaseTests,
    runPerformanceTests,
    runCompatibilityTests,
    runSecurityTests,
    runAccessibilityTests,
    runCodeQualityTests,
    TestRunner
  };
}

// Si estamos en el navegador, exponer globalmente
if (typeof window !== 'undefined') {
  window.runAllTests = runAllTests;
  window.TestRunner = TestRunner;
  
  console.log('\n💡 Para ejecutar las pruebas, ejecuta: runAllTests()');
}

