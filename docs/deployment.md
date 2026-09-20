# Deployment

## Descripción

SothForge API está desplegada en un entorno de producción utilizando servicios externos para la aplicación, base de datos y almacenamiento en caché.

La arquitectura de producción es:

```text
GitHub
   │
   │ Deploy automático
   ▼
Render
NestJS API
   │
   ├──────────────► Neon
   │                PostgreSQL
   │
   └──────────────► Upstash
                    Redis
```

### Servicios utilizados

| Servicio    | Responsabilidad               |
| ----------- | ----------------------------- |
| **Render**  | Hosting y ejecución de la API |
| **Neon**    | PostgreSQL                    |
| **Upstash** | Redis                         |
| **GitHub**  | Repositorio y código fuente   |

---

## Variables de entorno

La aplicación utiliza variables de entorno para separar la configuración del código fuente y evitar almacenar credenciales sensibles en el repositorio.

Variables requeridas:

```env
NODE_ENV=production

DATABASE_URL=

JWT_SECRET=
JWT_EXPIRES_IN=

REFRESH_TOKEN_EXPIRES_IN=

REDIS_URL=
```

### `NODE_ENV`

Define el entorno en el que se ejecuta la aplicación:

```env
NODE_ENV=production
```

### `DATABASE_URL`

Contiene la cadena de conexión a la instancia PostgreSQL utilizada por la aplicación.

En producción se utiliza **Neon**.

```env
DATABASE_URL=postgresql://...
```

### `JWT_SECRET`

Clave utilizada para firmar los access tokens JWT.

Debe ser una clave independiente y segura para producción.

```env
JWT_SECRET=
```

### `JWT_EXPIRES_IN`

Define el tiempo de expiración de los access tokens.

```env
JWT_EXPIRES_IN=
```

### `REFRESH_TOKEN_EXPIRES_IN`

Define el tiempo de expiración de los refresh tokens.

```env
REFRESH_TOKEN_EXPIRES_IN=
```

### `REDIS_URL`

Contiene la URL de conexión al servicio Redis utilizado por la aplicación.

En producción se utiliza **Upstash**.

Puede utilizar el protocolo `redis://` o `rediss://` dependiendo de la URL proporcionada por el proveedor.

```env
REDIS_URL=redis://...
```

> Las credenciales reales nunca deben almacenarse en el repositorio. Las variables de producción se configuran directamente en Render.

---

## Render

La API se ejecuta como un **Web Service** en Render utilizando el entorno Node.

### Configuración

El servicio se conecta directamente al repositorio de GitHub.

Render realiza el build de la aplicación y posteriormente inicia el servidor de producción.

### Build

El proyecto se compila utilizando:

```bash
npm run build
```

### Start

La aplicación se inicia mediante:

```bash
npm run start:prod
```

El proceso utiliza la variable `PORT` proporcionada automáticamente por Render.

La aplicación no necesita definir manualmente `PORT` en las variables de entorno del servicio.

---

## Base de datos

La aplicación utiliza PostgreSQL mediante Prisma ORM.

En producción la base de datos está alojada en **Neon**.

Las migraciones de Prisma se encuentran en:

```text
prisma/migrations/
```

Para aplicar las migraciones pendientes se utiliza:

```bash
npx prisma migrate deploy
```

Este comando aplica únicamente las migraciones que todavía no fueron ejecutadas en la base de datos.

### Entorno de testing

El entorno de testing utiliza una base de datos PostgreSQL independiente ejecutada mediante Docker.

Esto evita que los tests modifiquen los datos utilizados por el entorno de producción.

```text
Producción
    │
    └── Neon PostgreSQL

Testing
    │
    └── PostgreSQL en Docker
```

---

## Redis

Redis se utiliza para funcionalidades como:

* Cache de datos.
* Rate limiting distribuido.
* Gestión de datos temporales.

En producción Redis está alojado en **Upstash**.

La aplicación obtiene la conexión mediante:

```env
REDIS_URL=
```

El cliente Redis se inicializa durante el arranque de NestJS.

---

## Deploy

Los cambios realizados en el repositorio pueden ser desplegados mediante el flujo de integración entre GitHub y Render.

Flujo general:

```text
Desarrollo
    │
    ▼
Git commit
    │
    ▼
Git push
    │
    ▼
GitHub
    │
    ▼
Render
    │
    ├── Instala dependencias
    ├── Ejecuta build
    └── Inicia la aplicación
```

Una vez finalizado el deploy, la API queda disponible mediante la URL pública proporcionada por Render.

---

## Verificación del deployment

Después de un deployment se debe comprobar:

### 1. Aplicación

Verificar que el servicio aparezca como activo en Render.

### 2. API

Comprobar que la API responda mediante su URL pública.

### 3. Swagger

Verificar que la documentación Swagger esté disponible.

### 4. Base de datos

Realizar una operación que requiera acceso a PostgreSQL, por ejemplo:

* Registro de usuario.
* Login.
* Creación de una organización.
* Consulta de recursos.

### 5. Redis

Comprobar funcionalidades que dependan de Redis, como:

* Cache.
* Rate limiting.
* Gestión de sesiones o datos temporales cuando corresponda.

### 6. Autenticación

Verificar el flujo:

```text
Register
   ↓
Login
   ↓
Access Token
   ↓
Authenticated Request
   ↓
Refresh Token
   ↓
New Access Token
```

---

## Consideraciones de producción

### Secrets

Las credenciales y secretos de producción no deben incluirse en:

* Git.
* Código fuente.
* Documentación pública.
* Archivos `.env` versionados.

Deben configurarse mediante las variables de entorno del proveedor de hosting.

### Base de datos

El entorno de producción utiliza una base de datos PostgreSQL externa administrada por Neon.

El entorno de testing permanece aislado mediante una instancia PostgreSQL independiente.

### Redis

El Redis utilizado en producción es independiente del Redis utilizado durante el desarrollo local.

### Docker

Docker se utiliza actualmente para infraestructura local de testing.

El deployment de la API no requiere ejecutar el contenedor de la aplicación, ya que Render ejecuta directamente el proyecto Node.js.

---

## URL de producción

La API está disponible públicamente en:

```text
https://sothforge-api.onrender.com/
```

La URL puede utilizarse para realizar requests directamente contra la API, por ejemplo desde Postman.

---

## Resumen de infraestructura

```text
┌─────────────────────┐
│       GitHub        │
│   Source Control    │
└──────────┬──────────┘
           │
           │ Deploy
           ▼
┌─────────────────────┐
│       Render        │
│    NestJS / Node    │
└─────────┬───────────┘
          │
          ├──────────────────┐
          │                  │
          ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│      Neon       │  │     Upstash     │
│   PostgreSQL    │  │      Redis      │
└─────────────────┘  └─────────────────┘
```

Esta infraestructura permite ejecutar SothForge como una API pública utilizando servicios administrados para la aplicación, persistencia y cache, manteniendo separada la infraestructura de testing del entorno de producción.
