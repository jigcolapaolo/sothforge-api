# API Testing

## Swagger

SothForge API incluye documentación interactiva mediante Swagger.

Una vez iniciada la API, Swagger está disponible en:

```text
http://localhost:3000/docs
```

Desde Swagger se pueden consultar los endpoints, schemas de request, respuestas esperadas y errores documentados.

Los endpoints protegidos utilizan autenticación mediante JWT Bearer.

### Autenticación en Swagger

1. Ejecutar el endpoint de login.
2. Copiar el `accessToken` de la respuesta.
3. Seleccionar **Authorize** en Swagger.
4. Introducir el token.
5. Ejecutar los endpoints protegidos.

---

## Postman

La API también cuenta con una colección de Postman con los endpoints organizados por módulo:

```text
Auth
Users
Organizations
Projects
Boards
Tasks
Comments
Labels
```

La colección incluye distintos usuarios de prueba para verificar el comportamiento de la autorización según el rol dentro de una organización.

---

## Configuración

La colección utiliza una variable de entorno para la URL base de la API:

```text
baseUrl = http://localhost:3000
```

Las requests utilizan esta variable:

```text
{{baseUrl}}/auth/login
```

Esto permite cambiar la URL de la API sin modificar individualmente cada request.

---

## Autenticación en Postman

Los requests de login almacenan automáticamente los tokens obtenidos en variables de colección.

```javascript
const response = pm.response.json();

pm.collectionVariables.set("accessToken", response.accessToken);
pm.collectionVariables.set("refreshToken", response.refreshToken);
```

Los endpoints protegidos utilizan automáticamente:

```text
Bearer {{accessToken}}
```

Por lo tanto, no es necesario copiar manualmente el access token entre requests.

### Usuarios de prueba

La colección contiene diferentes requests de login para usuarios con distintos roles:

* Owner
* Admin
* Member
* Viewer

Esto permite comprobar las reglas de autorización utilizando diferentes niveles de permisos.

---

## Refresh Token

El endpoint de refresh utiliza el refresh token almacenado por la colección:

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

Después de un refresh exitoso, los nuevos tokens reemplazan automáticamente los valores anteriores.

Esto permite probar la rotación de refresh tokens sin actualizar manualmente las variables.

---

## Logout

Después de un logout exitoso, la colección elimina los tokens almacenados:

```javascript
pm.collectionVariables.unset("accessToken");
pm.collectionVariables.unset("refreshToken");
```

El mismo comportamiento se utiliza para el logout de todas las sesiones.

---

## Pruebas de autorización

La colección permite comprobar el acceso a recursos según el rol del usuario.

Por ejemplo:

```text
Login como Owner
        ↓
Endpoint protegido
        ↓
Operación permitida
```

Mientras que una operación que requiere permisos superiores puede producir:

```text
Login como Viewer
        ↓
Endpoint protegido
        ↓
403 Forbidden
```

También se pueden probar recursos pertenecientes a diferentes organizaciones para verificar el aislamiento entre organizaciones.

---

## Pruebas de validación y errores

La API puede probarse utilizando requests válidas e inválidas para verificar las respuestas HTTP esperadas.

Casos principales:

| Caso                           |               Respuesta |
| ------------------------------ | ----------------------: |
| Datos de request inválidos     |       `400 Bad Request` |
| JWT ausente o inválido         |      `401 Unauthorized` |
| Permisos insuficientes         |         `403 Forbidden` |
| Recurso inexistente            |         `404 Not Found` |
| Violación de restricción única |          `409 Conflict` |
| Límite de requests excedido    | `429 Too Many Requests` |

Las convenciones detalladas de errores se encuentran en [`api-contract.md`](./api-contract.md).

---

## Pruebas de Redis

Redis puede inspeccionarse durante las pruebas locales para verificar sus dos principales responsabilidades dentro de la API:

* Rate limiting distribuido.
* Cache de proyectos.

### Rate limiting

Los endpoints sujetos a rate limiting pueden probarse realizando múltiples requests dentro del período configurado.

Cuando se supera el límite, la API responde:

```text
429 Too Many Requests
```

### Cache de proyectos

El listado de proyectos utiliza Redis como cache.

La clave utilizada tiene el formato:

```text
projects:{organizationId}
```

El cache tiene un TTL de 60 segundos.

Las operaciones de creación, actualización y eliminación de proyectos invalidan el cache correspondiente para mantener los datos actualizados.

La implementación y las decisiones relacionadas con Redis están documentadas en [`redis.md`](./redis.md).

---

## Flujo básico de pruebas

Un flujo básico de autenticación puede probarse de la siguiente manera:

```text
Login
  ↓
Acceder a endpoint protegido
  ↓
Refresh token
  ↓
Acceder nuevamente a endpoint protegido
  ↓
Logout
  ↓
Intentar utilizar el refresh token revocado
```

Para probar las funcionalidades principales de la API:

```text
Login
  ↓
Crear organización
  ↓
Crear proyecto
  ↓
Crear board
  ↓
Crear task
  ↓
Agregar comentario
  ↓
Actualizar recursos
  ↓
Eliminar recursos
```

Las requests individuales de la colección pueden utilizarse independientemente cuando se necesite probar un recurso específico.
