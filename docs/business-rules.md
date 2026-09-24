# SothForge API - Business Rules

## 1. Reglas generales

- Todo usuario debe autenticarse para acceder a recursos protegidos.
- Un usuario debe pertenecer a una organización para acceder a sus recursos.
- Los permisos dependen del rol del usuario dentro de la organización.
- Los recursos deben validarse dentro del contexto de su organización.
- Un usuario asignado a una tarea debe pertenecer a la misma organización que la tarea.
- Los usuarios no pueden acceder a recursos pertenecientes a otras organizaciones.

## 2. Reglas de organizaciones

- Una organización debe tener un nombre válido.
- Una organización debe tener al menos un `OWNER`.
- No se puede eliminar al último `OWNER` de una organización.
- La transferencia de ownership debe asignar un nuevo `OWNER` antes de quitar el ownership actual.
- Solo usuarios con permisos suficientes pueden modificar una organización.
- Solo usuarios con permisos suficientes pueden eliminar una organización.
- Un usuario no puede pertenecer dos veces a la misma organización.

## 3. Reglas de miembros

- Un usuario puede pertenecer a múltiples organizaciones.
- Un usuario puede tener un rol diferente en cada organización.
- Los roles disponibles son `OWNER`, `ADMIN`, `MEMBER` y `VIEWER`.
- Solo usuarios con permisos suficientes pueden agregar miembros.
- Solo usuarios con permisos suficientes pueden modificar roles.
- Los permisos para modificar roles dependen del rol del usuario que realiza la operación.
- Un usuario puede abandonar una organización mediante la operación correspondiente, siempre respetando las restricciones relacionadas con ownership.

## 4. Reglas de proyectos

- Un proyecto debe pertenecer a una organización existente.
- Un proyecto no puede existir fuera del contexto de una organización.
- Solo miembros con permisos suficientes pueden crear proyectos.
- Solo miembros con permisos suficientes pueden modificar proyectos.
- Solo miembros con permisos suficientes pueden eliminar proyectos.
- El estado de un proyecto debe corresponder a uno de los valores definidos en `ProjectStatus`.

## 5. Reglas de boards

- Un board debe pertenecer a un proyecto existente.
- Un board no puede existir fuera del contexto de un proyecto.
- El acceso a un board depende de la organización a la que pertenece su proyecto.
- Solo usuarios con permisos suficientes pueden crear, modificar o eliminar boards.

## 6. Reglas de tareas

- Una tarea debe pertenecer a un board existente.
- Una tarea pertenece indirectamente a una organización mediante su board y proyecto.
- Una tarea puede tener un usuario asignado.
- El usuario asignado debe pertenecer a la misma organización que la tarea.
- Una tarea puede no tener usuario asignado.
- El estado de una tarea debe corresponder a `TaskStatus`.
- La prioridad de una tarea debe corresponder a `TaskPriority`.
- Una tarea puede tener múltiples comentarios.
- Una tarea puede tener múltiples etiquetas.
- Una etiqueta no puede asociarse dos veces a la misma tarea.

## 7. Reglas de comentarios

- Un comentario debe pertenecer a una tarea existente.
- Un comentario debe tener un usuario autor.
- Solo usuarios con acceso a la tarea pueden acceder a sus comentarios.
- La modificación y eliminación de comentarios requieren permisos adecuados.

## 8. Reglas de etiquetas

- Una etiqueta pertenece a una organización.
- El nombre de una etiqueta debe ser único dentro de su organización.
- Una etiqueta puede utilizarse en múltiples tareas de la organización.
- Una tarea puede tener múltiples etiquetas.
- Una etiqueta solo puede asociarse a tareas pertenecientes a su misma organización.
- Las operaciones sobre etiquetas requieren permisos adecuados.

## 9. Reglas de autenticación y sesiones

- Los usuarios se autentican mediante credenciales y tokens.
- Los refresh tokens se almacenan como hashes.
- Cada refresh token almacenado debe ser único.
- Una sesión puede ser revocada.
- Un usuario puede tener múltiples sesiones activas.
- El cierre de sesión puede revocar la sesión correspondiente.
- El cierre de todas las sesiones revoca las sesiones activas del usuario.

## 10. Reglas de auditoría

- Las operaciones relevantes generan registros de auditoría.
- Los registros identifican al usuario que realizó la acción.
- Los registros pueden estar asociados a una organización.
- Los registros pueden incluir metadata adicional.
- Los registros de auditoría no forman parte de los recursos públicos de la API.
- La información de auditoría debe conservarse incluso si la organización asociada es eliminada.

## 11. Reglas de permisos

- `OWNER`: administra la organización y tiene control completo sobre sus recursos.
- `ADMIN`: administra recursos y miembros dentro de los límites definidos por el sistema.
- `MEMBER`: participa y modifica recursos según los permisos establecidos.
- `VIEWER`: tiene acceso de solo lectura.
- Las operaciones sensibles requieren autorización específica.
- La autorización se realiza considerando tanto el rol como el contexto real del recurso.