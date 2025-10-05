#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FrontendErrorAnalyzer {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.htmlContent = '';
  }

  logTest(testName, passed, details = '', severity = 'info') {
    const result = { testName, passed, details, severity, timestamp: new Date().toISOString() };
    
    if (passed) {
      this.passed.push(result);
      console.log(`✅ ${testName}${details ? ': ' + details : ''}`);
    } else {
      if (severity === 'error') {
        this.errors.push(result);
        console.log(`❌ ${testName}${details ? ': ' + details : ''}`);
      } else {
        this.warnings.push(result);
        console.log(`⚠️ ${testName}${details ? ': ' + details : ''}`);
      }
    }
  }

  loadHTMLContent() {
    try {
      this.htmlContent = fs.readFileSync('public/index.html', 'utf8');
      this.logTest('Cargar archivo HTML', true, `${this.htmlContent.length} caracteres`);
      return true;
    } catch (error) {
      this.logTest('Cargar archivo HTML', false, error.message, 'error');
      return false;
    }
  }

  analyzeJavaScriptSyntax() {
    console.log('\n🔍 ANÁLISIS DE SINTAXIS JAVASCRIPT');
    console.log('='.repeat(50));
    
    // Buscar errores de sintaxis comunes
    const syntaxErrors = [
      { pattern: /function\s+\w+\s*\(\s*\)\s*\{[^}]*$/, message: 'Función sin cerrar' },
      { pattern: /if\s*\([^)]*\)\s*\{[^}]*$/, message: 'Bloque if sin cerrar' },
      { pattern: /for\s*\([^)]*\)\s*\{[^}]*$/, message: 'Bucle for sin cerrar' },
      { pattern: /while\s*\([^)]*\)\s*\{[^}]*$/, message: 'Bucle while sin cerrar' },
      { pattern: /\{[^}]*$/, message: 'Llave abierta sin cerrar' },
      { pattern: /\([^)]*$/, message: 'Paréntesis abierto sin cerrar' },
      { pattern: /"[^"]*$/, message: 'Comilla doble sin cerrar' },
      { pattern: /'[^']*$/, message: 'Comilla simple sin cerrar' }
    ];

    syntaxErrors.forEach(error => {
      if (error.pattern.test(this.htmlContent)) {
        this.logTest('Sintaxis JavaScript', false, error.message, 'error');
      } else {
        this.logTest(`Sintaxis - ${error.message}`, true, 'OK');
      }
    });
  }

  analyzeFunctionDefinitions() {
    console.log('\n🔍 ANÁLISIS DE DEFINICIONES DE FUNCIONES');
    console.log('='.repeat(50));
    
    // Funciones críticas que deben existir
    const criticalFunctions = [
      'fetchWithRetry',
      'renderChildrenList',
      'renderGamesList', 
      'renderActiveSessions',
      'renderSessionHistory',
      'startSession',
      'endSession',
      'addChild',
      'addGame',
      'updateTimer',
      'startTimers',
      'showSection',
      'toggleMobileMenu',
      'closeMobileMenu',
      'showStatusMessage',
      'showCustomModal',
      'createAlertContainer',
      'updateAlertIndicator',
      'showElegantAlert',
      'closeAlert',
      'confirmEditChild',
      'editChild',
      'closeEditChildModal',
      'initializeApp',
      'initializeChildSearch',
      'searchChildren',
      'selectChild',
      'hideSearchResults',
      'showExtendModal',
      'closeExtendModal',
      'extendTime',
      'validateName',
      'validateSession'
    ];

    criticalFunctions.forEach(funcName => {
      const functionPattern = new RegExp(`(function\\s+${funcName}|const\\s+${funcName}\\s*=|async\\s+function\\s+${funcName})`, 'g');
      const matches = this.htmlContent.match(functionPattern);
      
      if (matches && matches.length > 0) {
        this.logTest(`Función ${funcName}`, true, `Definida (${matches.length} veces)`);
      } else {
        this.logTest(`Función ${funcName}`, false, 'No encontrada', 'error');
      }
    });
  }

  analyzeFunctionCalls() {
    console.log('\n🔍 ANÁLISIS DE LLAMADAS A FUNCIONES');
    console.log('='.repeat(50));
    
    // Buscar llamadas a funciones que podrían no existir
    const functionCallPattern = /(\w+)\s*\(/g;
    const functionCalls = [];
    let match;
    
    while ((match = functionCallPattern.exec(this.htmlContent)) !== null) {
      functionCalls.push(match[1]);
    }
    
    // Filtrar llamadas únicas
    const uniqueCalls = [...new Set(functionCalls)];
    
    // Verificar que las funciones llamadas estén definidas
    uniqueCalls.forEach(funcCall => {
      if (['console', 'document', 'window', 'localStorage', 'sessionStorage', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'fetch', 'Promise', 'Date', 'Math', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'Array', 'Object', 'String', 'Number', 'Boolean'].includes(funcCall)) {
        return; // Funciones nativas del navegador
      }
      
      const functionDefPattern = new RegExp(`(function\\s+${funcCall}|const\\s+${funcCall}\\s*=|async\\s+function\\s+${funcCall})`, 'g');
      const matches = this.htmlContent.match(functionDefPattern);
      
      if (matches && matches.length > 0) {
        this.logTest(`Llamada ${funcCall}`, true, 'Función definida');
      } else {
        this.logTest(`Llamada ${funcCall}`, false, 'Función no definida', 'error');
      }
    });
  }

  analyzeDOMReferences() {
    console.log('\n🔍 ANÁLISIS DE REFERENCIAS DOM');
    console.log('='.repeat(50));
    
    // Buscar getElementById que podrían fallar
    const getElementByIdPattern = /getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const domReferences = [];
    let match;
    
    while ((match = getElementByIdPattern.exec(this.htmlContent)) !== null) {
      domReferences.push(match[1]);
    }
    
    // Verificar que los elementos existan en el HTML
    domReferences.forEach(elementId => {
      const elementPattern = new RegExp(`id\\s*=\\s*['"]${elementId}['"]`, 'g');
      const matches = this.htmlContent.match(elementPattern);
      
      if (matches && matches.length > 0) {
        this.logTest(`Elemento DOM ${elementId}`, true, 'Encontrado en HTML');
      } else {
        this.logTest(`Elemento DOM ${elementId}`, false, 'No encontrado en HTML', 'error');
      }
    });
  }

  analyzeAsyncAwait() {
    console.log('\n🔍 ANÁLISIS DE ASYNC/AWAIT');
    console.log('='.repeat(50));
    
    // Buscar funciones async
    const asyncFunctionPattern = /async\s+function\s+(\w+)/g;
    const asyncFunctions = [];
    let match;
    
    while ((match = asyncFunctionPattern.exec(this.htmlContent)) !== null) {
      asyncFunctions.push(match[1]);
    }
    
    asyncFunctions.forEach(asyncFunc => {
      // Verificar que la función async use await correctamente
      const functionContentPattern = new RegExp(`async\\s+function\\s+${asyncFunc}[\\s\\S]*?\\}`, 'g');
      const functionMatch = this.htmlContent.match(functionContentPattern);
      
      if (functionMatch) {
        const hasAwait = functionMatch[0].includes('await ');
        if (hasAwait) {
          this.logTest(`Función async ${asyncFunc}`, true, 'Usa await correctamente');
        } else {
          this.logTest(`Función async ${asyncFunc}`, false, 'No usa await', 'warning');
        }
      }
    });
  }

  analyzeErrorHandling() {
    console.log('\n🔍 ANÁLISIS DE MANEJO DE ERRORES');
    console.log('='.repeat(50));
    
    // Buscar try-catch blocks
    const tryCatchPattern = /try\s*\{[\s\S]*?\}\s*catch/g;
    const tryCatchBlocks = this.htmlContent.match(tryCatchPattern);
    
    if (tryCatchBlocks) {
      this.logTest('Bloques try-catch', true, `${tryCatchBlocks.length} bloques encontrados`);
    } else {
      this.logTest('Bloques try-catch', false, 'No se encontraron bloques try-catch', 'warning');
    }
    
    // Buscar funciones que podrían lanzar errores sin manejo
    const fetchCalls = this.htmlContent.match(/fetch\s*\(/g);
    if (fetchCalls) {
      const fetchWithoutTryCatch = this.htmlContent.match(/fetch\s*\([^}]*\)/g);
      this.logTest('Llamadas fetch', true, `${fetchCalls.length} llamadas encontradas`);
    }
  }

  analyzePotentialIssues() {
    console.log('\n🔍 ANÁLISIS DE PROBLEMAS POTENCIALES');
    console.log('='.repeat(50));
    
    // Buscar problemas comunes
    const issues = [
      { pattern: /undefined\s*\+\s*\w+/, message: 'Posible concatenación con undefined' },
      { pattern: /null\s*\+\s*\w+/, message: 'Posible concatenación con null' },
      { pattern: /\.length\s*[><=]\s*undefined/, message: 'Comparación de length con undefined' },
      { pattern: /JSON\.parse\s*\(\s*[^)]*\)\s*(?!.*try)/, message: 'JSON.parse sin try-catch' },
      { pattern: /eval\s*\(/, message: 'Uso de eval (peligroso)' },
      { pattern: /innerHTML\s*=.*[^;]$/, message: 'innerHTML sin punto y coma' },
      { pattern: /onclick\s*=\s*['"][^'"]*['"]\s*[^>]*>/, message: 'onclick con posible error de sintaxis' }
    ];

    issues.forEach(issue => {
      const matches = this.htmlContent.match(issue.pattern);
      if (matches) {
        this.logTest(`Problema: ${issue.message}`, false, `${matches.length} ocurrencias`, 'warning');
      } else {
        this.logTest(`Problema: ${issue.message}`, true, 'No encontrado');
      }
    });
  }

  generateReport() {
    console.log('\n📊 REPORTE FINAL DEL ANÁLISIS FRONTEND');
    console.log('='.repeat(60));
    
    const totalTests = this.passed.length + this.errors.length + this.warnings.length;
    const totalPassed = this.passed.length;
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    
    console.log(`\n📈 ESTADÍSTICAS:`);
    console.log(`✅ Pruebas pasadas: ${totalPassed}/${totalTests} (${totalTests > 0 ? ((totalPassed/totalTests)*100).toFixed(1) : 0}%)`);
    console.log(`❌ Errores: ${totalErrors}`);
    console.log(`⚠️ Advertencias: ${totalWarnings}`);
    
    if (totalErrors > 0) {
      console.log(`\n🚨 ERRORES CRÍTICOS ENCONTRADOS:`);
      this.errors.forEach(error => {
        console.log(`   ❌ ${error.testName}: ${error.details}`);
      });
    }
    
    if (totalWarnings > 0) {
      console.log(`\n⚠️ ADVERTENCIAS ENCONTRADAS:`);
      this.warnings.forEach(warning => {
        console.log(`   ⚠️ ${warning.testName}: ${warning.details}`);
      });
    }
    
    if (totalErrors === 0 && totalWarnings === 0) {
      console.log(`\n🎉 ¡ANÁLISIS COMPLETO - NO SE ENCONTRARON PROBLEMAS!`);
    } else if (totalErrors === 0) {
      console.log(`\n✅ ANÁLISIS COMPLETO - Solo advertencias menores`);
    } else {
      console.log(`\n🚨 ANÁLISIS COMPLETO - Se encontraron errores críticos`);
    }
    
    // Generar reporte detallado
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: totalTests,
        passed: totalPassed,
        errors: totalErrors,
        warnings: totalWarnings,
        successRate: totalTests > 0 ? ((totalPassed/totalTests)*100).toFixed(1) + '%' : '0%'
      },
      errors: this.errors,
      warnings: this.warnings,
      passed: this.passed.slice(0, 20) // Solo primeros 20 para no saturar
    };
    
    console.log(`\n📄 Reporte detallado guardado en: frontend-analysis-report.json`);
    fs.writeFileSync('frontend-analysis-report.json', JSON.stringify(report, null, 2));
  }

  async runFullAnalysis() {
    console.log('🔍 ANÁLISIS EXHAUSTIVO DEL FRONTEND');
    console.log('='.repeat(60));
    console.log(`⏰ Inicio: ${new Date().toISOString()}`);
    
    if (!this.loadHTMLContent()) {
      console.log('❌ No se pudo cargar el archivo HTML');
      return;
    }
    
    this.analyzeJavaScriptSyntax();
    this.analyzeFunctionDefinitions();
    this.analyzeFunctionCalls();
    this.analyzeDOMReferences();
    this.analyzeAsyncAwait();
    this.analyzeErrorHandling();
    this.analyzePotentialIssues();
    
    this.generateReport();
  }
}

// Ejecutar análisis
const analyzer = new FrontendErrorAnalyzer();
analyzer.runFullAnalysis();
