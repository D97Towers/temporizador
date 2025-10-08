# 🎮 Temporizador de Juegos

Sistema de gestión de sesiones de juego para niños con temporizador y alertas.

## 🚀 Características

- ✅ Gestión de niños con información de padres
- ✅ Gestión de juegos disponibles
- ✅ Sesiones de juego con temporizador en tiempo real
- ✅ Extensión de tiempo durante sesiones activas
- ✅ Dashboard con estadísticas
- ✅ Historial completo de sesiones
- ✅ Alertas visuales y sonoras
- ✅ Seguridad enterprise (XSS protection, validación de datos, rate limiting)
- ✅ Base de datos PostgreSQL (Supabase)

## 📋 Requisitos Previos

- Node.js 18+ 
- Cuenta de Supabase (gratuita)
- Git

## 🔧 Configuración Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/D97Towers/temporizador.git
cd temporizador
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Base de Datos

#### Opción A: Usar Supabase (Recomendado para producción)

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear un nuevo proyecto
3. Obtener la URL de conexión de PostgreSQL
4. Crear archivo `.env`:

```bash
DATABASE_URL=postgresql://postgres.[REFERENCE_ID]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require
PORT=3010
NODE_ENV=development
```

5. Crear tablas en Supabase:

```sql
-- Tabla de niños
CREATE TABLE children (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nickname VARCHAR(255),
  father_name VARCHAR(255),
  mother_name VARCHAR(255),
  total_time_played INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de juegos
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sesiones
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas (para desarrollo)
CREATE POLICY "Allow all operations on children" ON children FOR ALL USING (true);
CREATE POLICY "Allow all operations on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_sessions" ON game_sessions FOR ALL USING (true);

-- Crear índices
CREATE INDEX idx_game_sessions_child_id ON game_sessions(child_id);
CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_active ON game_sessions(end_time) WHERE end_time IS NULL;
```

### 4. Iniciar servidor

```bash
npm start
```

La aplicación estará disponible en `http://localhost:3010`

## 🌐 Despliegue en Vercel

### Configuración Automática

1. Fork este repositorio
2. Conectar con Vercel
3. Configurar variable de entorno:
   - `DATABASE_URL`: URL de conexión de Supabase

### Variables de Entorno en Vercel

```
DATABASE_URL=postgresql://postgres.[REFERENCE_ID]:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require
```

## 📚 Estructura del Proyecto

```
temporizadorJuegos/
├── index.js                  # Servidor Express principal
├── supabase-database.js      # Capa de base de datos
├── public/
│   └── index.html           # Frontend con todas las funcionalidades
├── package.json             # Dependencias
├── vercel.json              # Configuración de Vercel
├── README.md                # Este archivo
└── env.example              # Plantilla de variables de entorno
```

## 🔒 Seguridad

- ✅ Sanitización HTML para prevenir XSS
- ✅ Validación robusta de todas las entradas
- ✅ Rate limiting (15 requests/minuto)
- ✅ Circuit breaker para APIs
- ✅ Manejo seguro de errores
- ✅ Conexión SSL a base de datos

## 🧪 Testing

```bash
# Probar que el servidor funciona
curl http://localhost:3010/test

# Probar endpoints principales
curl http://localhost:3010/children
curl http://localhost:3010/games
curl http://localhost:3010/sessions
```

## 📊 API Endpoints

### Niños
- `GET /children` - Obtener todos los niños
- `POST /children` - Crear nuevo niño
- `PUT /children/:id` - Actualizar niño
- `DELETE /children/:id` - Eliminar niño

### Juegos
- `GET /games` - Obtener todos los juegos
- `POST /games` - Crear nuevo juego
- `DELETE /games/:id` - Eliminar juego

### Sesiones
- `GET /sessions` - Obtener todas las sesiones
- `GET /sessions/active` - Obtener sesiones activas
- `POST /sessions/start` - Iniciar sesión
- `POST /sessions/end` - Finalizar sesión
- `POST /sessions/extend` - Extender tiempo de sesión

### Admin
- `GET /admin/status` - Estado del servidor
- `GET /admin/stats` - Estadísticas del dashboard
- `GET /test` - Health check

## 🐛 Solución de Problemas

### Error: "DATABASE_URL no configurada"

**Problema:** El servidor no puede conectarse a la base de datos.

**Solución:**
1. Verificar que existe el archivo `.env`
2. Verificar que la URL de Supabase es correcta
3. Verificar que el password está URL-encoded si contiene caracteres especiales

### Error: "HTTP 500" en endpoints

**Problema:** La base de datos no está inicializada o las tablas no existen.

**Solución:**
1. Ejecutar los scripts SQL en Supabase
2. Verificar que las políticas RLS están habilitadas
3. Revisar los logs del servidor

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto es privado.

## 👥 Autores

- David Torres - [@D97Towers](https://github.com/D97Towers)

## 🙏 Agradecimientos

- Supabase por la base de datos PostgreSQL gratuita
- Vercel por el hosting serverless
- Express.js por el framework web
