#!/bin/bash

echo "🚀 Preparando despliegue de Temporizador de Juegos..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

echo "✅ Verificando dependencias..."
npm install

echo "✅ Compilando proyecto..."
npm run build

echo "✅ Verificando archivos compilados..."
if [ ! -f "dist/app.js" ]; then
    echo "❌ Error: No se generó dist/app.js"
    exit 1
fi

echo "✅ Verificando configuración de Vercel..."
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: No se encontró vercel.json"
    exit 1
fi

echo ""
echo "🎉 ¡Todo está listo para el despliegue!"
echo ""
echo "📋 PASOS PARA DESPLEGAR:"
echo "1. Ve a: https://vercel.com"
echo "2. Haz clic en 'Sign Up' o 'Login'"
echo "3. Selecciona 'Continue with GitHub'"
echo "4. Haz clic en 'New Project'"
echo "5. Busca: D97Towers/temporizador"
echo "6. Haz clic en 'Import'"
echo "7. Verifica configuración:"
echo "   - Framework: Other"
echo "   - Build Command: npm run build"
echo "   - Output Directory: dist"
echo "8. Haz clic en 'Deploy'"
echo "9. Espera 2-3 minutos"
echo ""
echo "🌐 Tu app estará disponible en: https://temporizador-juegos-xxxx.vercel.app"
echo ""
echo "📱 Características de tu app:"
echo "✅ Control de tiempo de juegos para niños"
echo "✅ Timers en tiempo real sin parpadeos"
echo "✅ Historial de sesiones mejorado"
echo "✅ Interfaz moderna y responsive"
echo ""
echo "🔧 Si hay problemas, revisa DEPLOYMENT_GUIDE.md"
