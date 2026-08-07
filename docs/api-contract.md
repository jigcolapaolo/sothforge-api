# SothForge API - API Contract Baseline

## 1. Formato de respuesta estandar

### Respuesta exitosa

```json
{
  "success": true,
  "data": {},
  "message": "Task created"
}
```

### Respuesta con error

```json
{
  "statusCode": 404,
  "message": "Task not found",
  "error": "Not Found"
}
```

## 2. Convenciones generales

- Todas las respuestas deben seguir un formato consistente.
- Los errores deben devolver codigo HTTP adecuado.
- Las operaciones CRUD deben responder con payloads claros.
- Las rutas deben estar agrupadas por recurso.

## 3. Recursos principales

- Auth
- Users
- Organizations
- Projects
- Boards
- Tasks
- Comments
- Labels

