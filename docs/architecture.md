# SothForge API - Architecture

## 1. Objetivo de la arquitectura

Esta arquitectura busca documentar la estructura propuesta para la API REST de SothForge de forma clara, escalable y alineada con el MVP definido en el README del proyecto.

## 2. Principios de diseño

- Arquitectura por features.
- Separacion clara entre controladores, servicios, DTOs y modelos.
- Prisma como unica capa de acceso a datos.
- Autenticacion basada en JWT y Refresh Tokens.
- Roles y permisos por organizacion.
- Seguridad por defecto con validacion, guards y manejo centralizado de errores.

## 3. Arquitectura general del sistema

El sistema se compone de los siguientes niveles:

1. Client / Consumer

2. API Layer
   - NestJS controllers.
   - ValidationPipe.
   - Guards e Interceptors.
   - Swagger para documentacion.

3. Application Layer
   - Services que contienen la logica de negocio.
   - Reglas de dominio y control de acceso.

4. Data Layer
   - Prisma Client.
   - PostgreSQL como base de datos principal.
   - Redis para cache, rate limiting o control de sesiones.

5. Infrastructure Layer
   - Docker Compose para levantar API, PostgreSQL y Redis.
   - Variables de entorno para configuracion.

## 4. Componentes principales

### API
- Maneja peticiones HTTP.
- Valida entradas con DTOs.
- Delega la logica en services.

### Auth
- Registro.
- Login.
- Refresh token.
- Logout o invalidacion de refresh token.

### Core modules
- Users
- Organizations
- Projects
- Boards
- Tasks
- Comments
- Labels

### Shared modules
- Common
- Config
- Database
- Prisma

## 5. Estructura de carpetas propuesta

```text
src/
  app.module.ts
  main.ts
  auth/
  users/
  organizations/
  projects/
  boards/
  tasks/
  comments/
  labels/
  common/
  config/
  prisma/
  database/
```

Cada feature deberia seguir esta estructura basica:

```text
feature/
  dto/
  entities/
  interfaces/
  controllers/
  services/
  guards/
  decorators/
  strategies/
  module.ts
```

Si solo hay un archivo, no se crea su carpeta especifica

## 6. Flujo de una solicitud

1. El cliente envía una petición HTTP.
2. El controller recibe la solicitud.
3. Se ejecuta la validacion por DTOs y guards.
4. El service aplica la logica de negocio.
5. Prisma accede a PostgreSQL.
6. Se devuelve una respuesta estandarizada.

## 7. Integraciones externas

- PostgreSQL como base de datos principal.
- Redis para cache y control de sesiones.
- Docker para entornos reproducibles.
- Swagger para documentacion.
- Postman para pruebas manuales.

## 8. Resumen

La arquitectura propuesta busca demostrar un backend profesional con separacion de responsabilidades, buenas practicas de seguridad, control de acceso y una base de datos relacional bien modelada.
