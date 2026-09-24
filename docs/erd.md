# SothForge API - Entity Relationship Diagram (ERD)

## 1. Objetivo

Este documento describe el modelo de datos principal de SothForge y las relaciones entre sus entidades.

El modelo utiliza PostgreSQL mediante Prisma ORM.

## 2. Enums

### ProjectStatus

- `PLANNING`
- `ACTIVE`
- `COMPLETED`
- `ARCHIVED`

### TaskStatus

- `TODO`
- `IN_PROGRESS`
- `IN_REVIEW`
- `DONE`
- `ARCHIVED`

### TaskPriority

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

### OrganizationRole

- `OWNER`
- `ADMIN`
- `MEMBER`
- `VIEWER`

## 3. Entidades principales

### User

Atributos principales:

- `id`
- `username`
- `email`
- `passwordHash`
- `avatar`
- `createdAt`
- `updatedAt`
- `lastLogin`

Relaciones:

- Puede pertenecer a muchas organizaciones mediante `OrganizationMember`.
- Puede crear muchas tareas.
- Puede ser asignado a muchas tareas.
- Puede escribir muchos comentarios.
- Puede tener múltiples sesiones.
- Puede generar múltiples registros de auditoría.

### Session

Representa una sesión autenticada de un usuario y permite gestionar los refresh tokens.

Atributos principales:

- `id`
- `userId`
- `refreshTokenHash`
- `expiresAt`
- `createdAt`
- `revokedAt`

Relaciones:

- Pertenece a un usuario.
- Un usuario puede tener múltiples sesiones.

Reglas:

- `refreshTokenHash` es único.
- Una sesión puede ser revocada mediante `revokedAt`.
- Las sesiones se eliminan cuando se elimina el usuario.

### Organization

Representa el espacio de trabajo principal del sistema.

Atributos principales:

- `id`
- `name`
- `description`
- `createdAt`
- `updatedAt`

Relaciones:

- Tiene muchos miembros mediante `OrganizationMember`.
- Tiene muchos proyectos.
- Tiene muchas etiquetas.
- Puede tener múltiples registros de auditoría.

### OrganizationMember

Representa la pertenencia de un usuario a una organización y su rol dentro de ella.

Atributos principales:

- `id`
- `userId`
- `organizationId`
- `role`
- `joinedAt`

Roles:

- `OWNER`
- `ADMIN`
- `MEMBER`
- `VIEWER`

Relaciones:

- Une `User` y `Organization`.
- Representa el rol del usuario dentro de la organización.

Reglas:

- Un usuario no puede pertenecer dos veces a la misma organización.
- La combinación `userId + organizationId` es única.

### AuditLog

Registra acciones relevantes realizadas dentro del sistema para mantener un historial de cambios.

Atributos principales:

- `id`
- `userId`
- `organizationId`
- `action`
- `entity`
- `entityId`
- `metadata`
- `createdAt`

Relaciones:

- Pertenece al usuario que realizó la acción.
- Puede estar asociado a una organización.
- Una organización puede tener múltiples registros de auditoría.
- El registro puede conservarse aunque la organización asociada sea eliminada.

Índices principales:

- `organizationId + createdAt`
- `entity + entityId`
- `userId`

### Project

Representa un proyecto dentro de una organización.

Atributos principales:

- `id`
- `organizationId`
- `name`
- `description`
- `status`
- `startDate`
- `endDate`
- `createdAt`
- `updatedAt`

Relaciones:

- Pertenece a una organización.
- Tiene muchos boards.

### Board

Representa un tablero dentro de un proyecto.

Atributos principales:

- `id`
- `projectId`
- `name`
- `description`
- `createdAt`
- `updatedAt`

Relaciones:

- Pertenece a un proyecto.
- Tiene muchas tareas.

### Task

Representa una tarea dentro de un board.

Atributos principales:

- `id`
- `boardId`
- `title`
- `description`
- `status`
- `priority`
- `dueDate`
- `estimatedHours`
- `createdById`
- `assignedToId`
- `createdAt`
- `updatedAt`

Status:

- `TODO`
- `IN_PROGRESS`
- `IN_REVIEW`
- `DONE`
- `ARCHIVED`

Priority:

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

Relaciones:

- Pertenece a un board.
- Tiene un usuario creador.
- Puede tener un usuario asignado.
- Tiene muchos comentarios.
- Puede tener muchas etiquetas mediante `TaskLabel`.

### Comment

Representa un comentario asociado a una tarea.

Atributos principales:

- `id`
- `taskId`
- `authorId`
- `content`
- `createdAt`
- `updatedAt`

Relaciones:

- Pertenece a una tarea.
- Tiene un usuario autor.

### Label

Representa una etiqueta perteneciente a una organización.

Atributos principales:

- `id`
- `organizationId`
- `name`
- `color`
- `createdAt`

Relaciones:

- Pertenece a una organización.
- Puede asociarse a muchas tareas mediante `TaskLabel`.

Reglas:

- El nombre de una etiqueta es único dentro de una organización mediante la combinación `organizationId + name`.

### TaskLabel

Representa la relación entre una tarea y una etiqueta.

Atributos principales:

- `taskId`
- `labelId`

Relaciones:

- Pertenece a una tarea.
- Pertenece a una etiqueta.

Reglas:

- La combinación `taskId + labelId` es la clave primaria.
- Una etiqueta no puede asociarse dos veces a la misma tarea.

Esta entidad implementa la relación muchos-a-muchos entre `Task` y `Label`.

## 4. Relaciones principales

User
├──< Session
├──< OrganizationMember >── Organization
├──< Task (creator)
├──< Task (assignee)
├──< Comment
└──< AuditLog

Organization
├──< OrganizationMember
├──< Project
├──< Label
└──< AuditLog

Project
└──< Board

Board
└──< Task

Task
├──< Comment
└──< TaskLabel >── Label

## 5. Reglas de integridad

- Un usuario no puede pertenecer dos veces a la misma organización.
- Una tarea debe pertenecer a un board existente.
- Un board debe pertenecer a un proyecto existente.
- Un proyecto debe pertenecer a una organización existente.
- Un comentario debe pertenecer a una tarea existente.
- Una etiqueta debe pertenecer a una organización existente.
- Una relación `TaskLabel` debe referenciar una tarea y una etiqueta existentes.
- Una etiqueta no puede asociarse dos veces a la misma tarea.
- El nombre de una etiqueta es único dentro de una organización.
- Un usuario puede tener múltiples sesiones.
- Cada `refreshTokenHash` almacenado en una sesión es único.
- Un registro de auditoría pertenece a un usuario y puede estar asociado a una organización.

## 6. Reglas de negocio

Además de las restricciones definidas directamente en el schema, existen reglas de negocio implementadas en la aplicación.

Entre ellas:

- Un usuario asignado a una tarea debe pertenecer a la misma organización que la tarea.
- El acceso a proyectos, boards, tareas, comentarios y etiquetas está determinado por la pertenencia del usuario a la organización correspondiente y su rol.
- Los cambios relevantes sobre organizaciones, miembros, proyectos y tareas generan registros de auditoría.