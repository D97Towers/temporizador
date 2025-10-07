// Vercel Entrypoint - Versión SIMPLE para debugging
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Endpoint de prueba simple
app.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor funcionando',
    environment: process.env.VERCEL ? 'Vercel' : 'Local',
    databaseUrl: process.env.DATABASE_URL ? 'Configurada' : 'No configurada',
    timestamp: new Date().toISOString()
  });
});

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`🚀 Servidor SIMPLE corriendo en puerto ${PORT}`);
  console.log(`📊 Entorno: ${process.env.VERCEL ? 'Vercel' : 'Local'}`);
});

module.exports = app;

