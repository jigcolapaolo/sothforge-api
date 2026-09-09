# SothForge API - API Contract Baseline

## 1. Formato de respuesta estándar

### Respuesta exitosa

```json
{
  "success": true,
  "data": {},
  "message": "Task created"
}
```

### Respuesta con error

Las respuestas de error utilizan el código HTTP correspondiente y contienen información suficiente para identificar el tipo de error sin exponer detalles internos de la aplicación.

Ejemplo:

```json
{
  "statusCode": 404,
  "message": "Task not found",
  "error": "Not Found",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

El campo `requestId` permite identificar y rastrear la petición asociada al error.

---

## 2. Códigos HTTP

### 400 - Bad Request

La petición contiene datos inválidos o no cumple con las reglas de validación.

Ejemplo:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request",
  "requestId": "..."
}
```

Se utiliza principalmente para errores de validación de DTOs.

### 401 - Unauthorized

La petición requiere autenticación o las credenciales proporcionadas no son válidas.

Ejemplos:

* JWT ausente.
* JWT inválido.
* Access token expirado.
* Refresh token inválido o expirado.

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "requestId": "..."
}
```

### 403 - Forbidden

El usuario está autenticado, pero no tiene permisos suficientes para realizar la operación.

Ejemplo:

```json
{
  "statusCode": 403,
  "message": "Label access denied",
  "error": "Forbidden",
  "requestId": "..."
}
```

### 404 - Not Found

El recurso solicitado no existe.

Ejemplo:

```json
{
  "statusCode": 404,
  "message": "Task not found",
  "error": "Not Found",
  "requestId": "..."
}
```

### 409 - Conflict

La operación entra en conflicto con una restricción existente.

Se utiliza, entre otros casos, para violaciones de restricciones únicas de la base de datos.

Ejemplo:

```json
{
  "statusCode": 409,
  "message": "A unique constraint violation occurred",
  "error": "Conflict",
  "requestId": "..."
}
```

### 429 - Too Many Requests

El cliente ha superado el límite de peticiones configurado para el endpoint.

Se utiliza mediante el sistema de rate limiting de NestJS.

### 500 - Internal Server Error

Se produjo un error inesperado en el servidor.

Los detalles internos del error no se exponen al cliente.

Ejemplo:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "requestId": "..."
}
```

---

## 3. Request ID

Cada petición recibe un identificador único mediante el header:

```text
X-Request-Id
```

El mismo identificador se incluye en las respuestas de error mediante el campo:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Esto permite correlacionar una respuesta de error con los logs correspondientes de la aplicación.

---

## 4. Convenciones generales

* Todas las respuestas deben seguir un formato consistente.
* Los errores deben devolver el código HTTP adecuado.
* Las operaciones CRUD deben responder con payloads claros.
* Las rutas deben estar agrupadas por recurso.
* Los errores internos no deben exponer detalles de implementación al cliente.
* Las respuestas de error incluyen un `requestId` para facilitar la trazabilidad.

## 5. Recursos principales

* Auth
* Users
* Organizations
* Projects
* Boards
* Tasks
* Comments
* Labels
