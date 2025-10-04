# Configuración de Base de Datos para Vercel

## Variables de Entorno Requeridas

Para usar una base de datos real en Vercel, configura estas variables de entorno:

```
DB_HOST=your-planetscale-host.mysql.planetscale.com
DB_USER=your-planetscale-username
DB_PASSWORD=your-planetscale-password
DB_NAME=your-database-name
DB_SSL=true
```

## Pasos para Configurar PlanetScale (Gratuito)

1. Ve a https://planetscale.com
2. Crea una cuenta gratuita
3. Crea una nueva base de datos
4. Obtén las credenciales de conexión
5. Configura las variables de entorno en Vercel

## Configuración en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las variables DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL
4. Redespliega la aplicación

## Fallback Automático

Si no hay variables de entorno configuradas:
- Vercel: Usa memoria global (datos temporales)
- Local: Usa SQLite (persistente)

## Beneficios de la Base de Datos Real

- ✅ Persistencia real y permanente
- ✅ Datos no se pierden al reiniciar
- ✅ Escalabilidad para miles de registros
- ✅ Transacciones SQL garantizadas
- ✅ Backup automático en la nube
