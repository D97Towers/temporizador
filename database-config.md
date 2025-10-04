# Configuración de Base de Datos GRATUITA para Vercel

## Variables de Entorno Requeridas

Para usar una base de datos real en Vercel, configura esta variable de entorno:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

## Pasos para Configurar Neon (PostgreSQL GRATUITO)

1. Ve a https://neon.tech
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Copia la connection string
5. Configura la variable DATABASE_URL en Vercel

## Alternativa: Supabase (También GRATUITO)

1. Ve a https://supabase.com
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Ve a Settings → Database
5. Copia la connection string
6. Configura la variable DATABASE_URL en Vercel

## Configuración en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega la variable DATABASE_URL con la connection string
4. Redespliega la aplicación

## Fallback Automático

Si no hay variables de entorno configuradas:
- Vercel: Usa memoria global (datos temporales)
- Local: Usa SQLite (persistente)

## Beneficios de la Base de Datos GRATUITA

- ✅ **100% GRATUITO** - Sin límites de tiempo
- ✅ Persistencia real y permanente
- ✅ Datos no se pierden al reiniciar
- ✅ Escalabilidad para miles de registros
- ✅ Transacciones SQL garantizadas
- ✅ Backup automático en la nube
- ✅ **Neon**: 3GB de almacenamiento gratuito
- ✅ **Supabase**: 500MB de almacenamiento gratuito

## Ventajas de PostgreSQL

- ✅ Más robusto que MySQL
- ✅ Mejor soporte para JSON
- ✅ Transacciones más eficientes
- ✅ Mejor rendimiento en Vercel
