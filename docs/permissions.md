# SothForge API - Permissions Model

## 1. Roles por organizacion

- Owner
- Admin
- Member
- Viewer

## 2. Permisos por rol

### Owner
- Puede gestionar la organizacion.
- Puede eliminar proyectos.
- Puede administrar miembros.
- Puede gestionar tareas y boards.

### Admin
- Puede crear y editar recursos dentro de la organizacion.
- Puede gestionar tareas.
- Puede administrar miembros en un rango limitado.

### Member
- Puede participar en proyectos y tareas.
- Puede modificar tareas asignadas.
- Puede crear comentarios.

### Viewer
- Solo puede leer recursos.
- No puede crear, editar ni eliminar.

## 3. Reglas adicionales

- Un usuario debe ser miembro de la organizacion para acceder a sus recursos.
- Solo los usuarios de la organizacion pueden asignarse a tareas.
- Las operaciones sensibles deben estar protegidas por guards y roles.
