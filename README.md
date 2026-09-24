# SothForge API

Backend REST para una plataforma de gestión de proyectos y trabajo colaborativo, desarrollado con NestJS, TypeScript y PostgreSQL.

SothForge permite organizar el trabajo mediante organizaciones, proyectos, boards y tareas, incorporando autenticación, autorización basada en roles, control de acceso a nivel de recurso, gestión de sesiones, comentarios, etiquetas, auditoría y rate limiting.

El proyecto fue desarrollado como un backend completo, poniendo especial atención en arquitectura modular, seguridad, validación, testing, documentación y deployment.

---

## Características principales

- Autenticación mediante JWT
- Access tokens y refresh tokens
- Gestión y revocación de sesiones
- Detección de reutilización de refresh tokens
- Organizaciones y membresías
- Roles por organización:
  - `OWNER`
  - `ADMIN`
  - `MEMBER`
  - `VIEWER`
- Autorización a nivel de recurso
- Gestión de proyectos
- Gestión de boards
- Gestión de tareas
- Estados y prioridades de tareas
- Asignación de tareas a usuarios
- Comentarios
- Etiquetas reutilizables
- Auditoría de operaciones relevantes
- Validación mediante DTOs
- Rate limiting
- Helmet
- CORS
- Manejo centralizado de errores
- Swagger / OpenAPI
- Tests unitarios
- Tests de integración
- Tests end-to-end
- PostgreSQL aislado para testing mediante Docker
- Docker Compose
- CI mediante GitHub Actions
- Deployment en Render

---

## Stack tecnológico

### Backend

- NestJS 11
- TypeScript
- Node.js
- Passport
- JWT
- bcrypt

### Base de datos

- PostgreSQL
- Prisma ORM
- Neon PostgreSQL

### Cache

- Redis
- Upstash Redis

### Testing

- Jest
- Supertest

### DevOps

- Docker
- Docker Compose
- GitHub Actions
- Render

### Documentación

- Swagger / OpenAPI
- Markdown
- Prisma Schema

---

# Arquitectura

El proyecto utiliza una arquitectura modular basada en NestJS.

```text
src/
├── auth/
├── users/
├── organizations/
├── projects/
├── boards/
├── tasks/
├── comments/
├── labels/
├── audit/
├── common/
├── prisma/
└── generated/
```

Cada módulo encapsula las responsabilidades relacionadas y utiliza los mecanismos de inyección de dependencias proporcionados por NestJS.

Prisma se utiliza como ORM para interactuar con PostgreSQL.

## Modelo de dominio

La estructura principal del dominio es:

```text
Organization
    │
    ├── OrganizationMember
    │
    ├── Project
    │      │
    │      └── Board
    │             │
    │             └── Task
    │                    ├── Comment
    │                    └── TaskLabel ── Label
    │
    └── Label
```

Los usuarios pueden pertenecer a múltiples organizaciones y tener diferentes roles en cada una.

## Seguridad y autorización

La API utiliza JWT para autenticación y guards de NestJS para proteger los endpoints.

La autorización combina:

- autenticación del usuario
- membresía dentro de la organización
- rol del usuario
- contexto real del recurso

Los recursos anidados se resuelven hasta su organización antes de validar los permisos.

Por ejemplo:

```text
Task
 ↓
Board
 ↓
Project
 ↓
Organization
 ↓
OrganizationMember
 ↓
Role
```

Esto evita que un usuario pueda acceder a recursos de otra organización simplemente proporcionando un identificador válido.

### Roles

| Rol | Descripción |
| --- | --- |
| `OWNER` | Control completo sobre la organización |
| `ADMIN` | Administración de recursos y miembros dentro de sus límites |
| `MEMBER` | Participación y modificación de recursos según permisos |
| `VIEWER` | Acceso de solo lectura |

## Auditoría

Las operaciones relevantes generan registros en AuditLog.

Los registros incluyen:

- usuario que realizó la acción
- organización relacionada
- acción realizada
- entidad afectada
- identificador de la entidad
- metadata adicional
- fecha de la acción

La auditoría se utiliza para mantener un historial de cambios relevantes sobre organizaciones, miembros, proyectos y tareas.

Los registros de auditoría no están expuestos como un recurso público de la API.

## Rate limiting

La API implementa rate limiting para reducir abuso y proteger operaciones sensibles.

Existe un límite general de:

- 20 requests / minuto

Además, determinados endpoints utilizan límites específicos más restrictivos.

Algunos ejemplos:

- Login / Register: 5 requests / minuto
- Refresh: 10 requests / minuto
- Crear organización: 5 requests / minuto
- Transferir ownership: 3 requests / minuto
- Crear proyecto: 10 requests / minuto
- Crear tarea: 10 requests / minuto
- Eliminar tarea: 5 requests / minuto

Los límites específicos tienen prioridad sobre el límite general.

## Validación y manejo de errores

La aplicación utiliza ValidationPipe global con:

- whitelist
- forbidNonWhitelisted
- transform

Esto permite validar los DTOs y rechazar propiedades no permitidas.

La aplicación también utiliza un filtro global para el manejo de excepciones.

Se manejan errores específicos de Prisma, como:

- conflictos por datos únicos
- recursos inexistentes

Las respuestas de error no exponen información interna de la aplicación o de la base de datos.

---

## Requisitos

Para ejecutar el proyecto localmente se necesita:

- Node.js
- npm
- Docker
- Docker Compose
- Una instancia PostgreSQL para desarrollo
- Una instancia Redis para desarrollo

El entorno de desarrollo utiliza:

- Neon PostgreSQL
- Upstash Redis

El entorno de testing utiliza una PostgreSQL independiente mediante Docker.

---

## Instalación

### Clonar el repositorio

```bash
git clone <repository-url>
cd sothforge-api
```

### Instalar dependencias

```bash
npm install
```

### Variables de entorno

Crear un archivo `.env` con las variables necesarias para el entorno de desarrollo.

La configuración incluye los datos de conexión de:

- PostgreSQL
- Redis
- JWT
- configuración general de la aplicación

Los secretos reales no deben almacenarse en el repositorio.

Para testing se utiliza una configuración independiente de la utilizada por desarrollo y producción.

### Base de datos de desarrollo

El entorno de desarrollo utiliza PostgreSQL mediante Neon.

Después de configurar las variables de entorno:

```bash
npx prisma generate
```

Para ejecutar las migraciones:

```bash
npx prisma migrate dev
```

Para cargar los datos iniciales:

```bash
npm run db:seed
```

Para abrir Prisma Studio:

```bash
npx prisma studio
```

---

## Desarrollo

Iniciar la aplicación en modo desarrollo:

```bash
npm run start:dev
```

También están disponibles:

```bash
npm run start
npm run start:debug
```

La API se ejecutará utilizando el puerto configurado en el entorno.

---

## Docker

Docker se utiliza principalmente para proporcionar infraestructura reproducible para testing.

El proyecto dispone de un `docker-compose-test.yml` específicamente destinado al entorno de pruebas.

Este entorno proporciona una instancia de PostgreSQL aislada de la base de datos utilizada durante el desarrollo.

La separación permite ejecutar integration tests y e2e tests sin utilizar ni modificar la base de datos de desarrollo.

---

## Testing

El proyecto divide los tests en tres niveles:

```text
test/
├── unit/
├── integration/
└── e2e/
```

Cada tipo de test tiene un objetivo diferente.

### Unit tests

Los unit tests verifican componentes y lógica de forma aislada, sin depender de una base de datos PostgreSQL real.

Se ejecutan mediante:

```bash
npm run test
```

Este comando ejecuta específicamente los tests ubicados en:

```text
test/unit/
```

También es posible ejecutarlos en modo watch:

```bash
npm run test:watch
```

### Integration tests

Los integration tests verifican la interacción entre diferentes componentes de la aplicación y la persistencia real en PostgreSQL.

Para estos tests se utiliza una base de datos PostgreSQL exclusiva para testing.

La infraestructura se levanta mediante:

```bash
docker compose -f docker-compose-test.yml up -d
```

Los integration tests utilizan una configuración de Prisma independiente:

```text
prisma.config.test.ts
```

Esto permite mantener separada la configuración de Prisma utilizada para testing de la configuración de desarrollo.

Una vez iniciada la base de datos, ejecutar:

```bash
npm run test:integration
```

Al finalizar los tests, los contenedores pueden detenerse mediante:

```bash
docker compose -f docker-compose-test.yml down
```

### End-to-end tests

Los e2e tests verifican el comportamiento de la aplicación desde el punto de vista de la API, incluyendo routing, guards, validación, base de datos y otros componentes involucrados en una petición real.

Al igual que los integration tests, utilizan una instancia PostgreSQL exclusiva para testing mediante Docker.

Levantar la base de datos:

```bash
docker compose -f docker-compose-test.yml up -d
```

Ejecutar los e2e tests:

```bash
npm run test:e2e
```

Al finalizar:

```bash
docker compose -f docker-compose-test.yml down
```

### Configuración de Prisma para testing

El entorno de testing utiliza una configuración de Prisma independiente:

```text
prisma.config.test.ts
```

Esta configuración permite que los integration tests y e2e tests trabajen con la PostgreSQL levantada mediante:

```text
docker-compose-test.yml
```

La separación evita que los tests interactúen accidentalmente con la base de datos utilizada durante el desarrollo.

### Cobertura de tests

Para ejecutar los tests con cobertura:

```bash
npm run test:cov
```

### Debugging de tests

Para ejecutar Jest en modo debug:

```bash
npm run test:debug
```

---

## Build

Generar el build de producción:

```bash
npm run build
```

El resultado se genera en:

```text
dist/
```

Para ejecutar la aplicación compilada:

```bash
npm run start:prod
```

---

## Prisma

Comandos principales de Prisma:

```bash
npx prisma generate
```

Genera el cliente de Prisma.

```bash
npx prisma migrate dev
```

Crea y aplica migraciones durante el desarrollo.

```bash
npx prisma migrate deploy
```

Aplica las migraciones existentes en un entorno de deployment.

```bash
npx prisma studio
```

Abre Prisma Studio para inspeccionar los datos.

El cliente generado por Prisma se encuentra en:

```text
src/generated/prisma
```

---

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run build` | Genera el build de producción |
| `npm run start` | Inicia la aplicación |
| `npm run start:dev` | Inicia la aplicación en modo desarrollo |
| `npm run start:debug` | Inicia la aplicación en modo debug |
| `npm run start:prod` | Ejecuta el build de producción |
| `npm run format` | Formatea el código |
| `npm run lint` | Ejecuta ESLint |
| `npm run db:seed` | Ejecuta el seed de la base de datos |
| `npm run test` | Ejecuta unit tests |
| `npm run test:integration` | Ejecuta integration tests |
| `npm run test:e2e` | Ejecuta e2e tests |
| `npm run test:watch` | Ejecuta tests en modo watch |
| `npm run test:cov` | Ejecuta tests con cobertura |
| `npm run test:debug` | Ejecuta Jest en modo debug |

---

## Documentación de la API

La API incluye documentación OpenAPI mediante Swagger.

Durante el desarrollo, la documentación puede consultarse desde la ruta de Swagger configurada por la aplicación.

El repositorio también incluye documentación detallada sobre los diferentes aspectos del sistema.

### Documentación del proyecto

```text
docs/
├── architecture.md
├── auth-flow.md
├── business-rules.md
├── domain-model.md
├── endpoints.md
├── erd.md
├── permissions.md
└── rate-limiting.md
```

La documentación cubre:

- arquitectura
- flujo de autenticación
- reglas de negocio
- modelo de dominio
- endpoints
- modelo de datos
- permisos
- rate limiting

---

## Entornos

El proyecto utiliza diferentes configuraciones para separar desarrollo, testing y producción.

### Development

Utilizado durante el desarrollo local.

- PostgreSQL mediante Neon
- Redis mediante Upstash
- variables de entorno de desarrollo
- Swagger
- ejecución mediante NestJS

### Testing

Utilizado para tests automatizados.

- PostgreSQL aislado mediante Docker
- `docker-compose-test.yml`
- configuración de Prisma mediante `prisma.config.test.ts`
- unit tests sin dependencia de PostgreSQL
- integration tests con PostgreSQL real
- e2e tests con PostgreSQL real

### Production

El entorno de producción utiliza:

- PostgreSQL mediante Neon
- Redis mediante Upstash
- variables de entorno gestionadas externamente
- aplicación compilada mediante NestJS
- CI/CD

El proyecto utiliza GitHub Actions para automatizar validaciones sobre el código.

El pipeline permite comprobar automáticamente el estado del proyecto antes de integrar cambios, incluyendo las validaciones necesarias para detectar errores de compilación y regresiones.

---

## Deployment

La API está preparada para deployment mediante Render.

La infraestructura utilizada en producción incluye:

- Render para el hosting de la API
- Neon para PostgreSQL
- Upstash para Redis

Las credenciales y secretos de producción se gestionan mediante variables de entorno y no forman parte del repositorio.

---

## Estructura general del proyecto

```text
sothforge-api/
│
├── src/
│   ├── auth/
│   ├── users/
│   ├── organizations/
│   ├── projects/
│   ├── boards/
│   ├── tasks/
│   ├── comments/
│   ├── labels/
│   ├── audit/
│   ├── common/
│   ├── prisma/
│   └── generated/
│
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker-compose-test.yml
├── prisma.config.test.ts
├── jest.integration.config.ts
├── jest.e2e.config.ts
├── package.json
└── README.md
```

---

## Estado del proyecto

SothForge se encuentra en una versión funcional y desplegada.

El proyecto incluye:

- API REST funcional
- autenticación y sesiones
- refresh token rotation y detección de reutilización
- autorización basada en roles
- autorización a nivel de recurso
- organizaciones y membresías
- proyectos y boards
- tareas
- comentarios
- etiquetas
- auditoría
- rate limiting
- validación
- manejo centralizado de errores
- unit tests
- integration tests
- e2e tests
- PostgreSQL aislado para testing
- Docker
- CI
- documentación
- deployment

El objetivo principal del proyecto fue construir un backend completo, prestando especial atención a arquitectura, seguridad, autorización, persistencia, testing y calidad del código.