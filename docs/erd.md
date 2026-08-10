# SothForge API - Entity Relationship Diagram (ERD)

## 1\. Objetivo

Este documento describe el modelo de datos principal del sistema y las relaciones entre entidades.

## 2\. Entidades principales

### User

Atributos principales:

* id
* username
* email
* passwordHash
* avatar
* createdAt
* updatedAt
* lastLogin

Relaciones:

* Puede pertenecer a muchas organizaciones.
* Puede crear o ser asignado a muchas tareas.
* Puede escribir muchos comentarios.

### Organization

Atributos principales:

* id
* name
* description
* createdAt
* updatedAt

Relaciones:

* Tiene muchos miembros.
* Tiene muchos proyectos.
* Tiene muchas labels propias

### OrganizationMember

Atributos principales:

* id
* userId
* organizationId
* role
* joinedAt



Role:



\- OWNER

\- ADMIN

\- MEMBER

\- VIEWER



Relaciones:

* Une User y Organization.
* Representa el rol del usuario dentro de la organizacion.

### Project

Atributos principales:

* id
* organizationId
* name
* description
* status
* startDate
* endDate
* createdAt
* updatedAt

Relaciones:

* Pertenece a una organizacion.
* Tiene muchos boards.

### Board

Atributos principales:

* id
* projectId
* name
* description
* createdAt
* updatedAt

Relaciones:

* Pertenece a un proyecto.
* Tiene muchas tareas.

### Task

Atributos principales:

* id
* boardId
* title
* description
* status
* priority
* dueDate
* estimatedHours
* createdById
* assignedToId
* createdAt
* updatedAt



Status:



\- TODO

\- IN\_PROGRESS

\- IN\_REVIEW

\- DONE

\- ARCHIVED



Priority:



\- LOW

\- MEDIUM

\- HIGH

\- URGENT



Relaciones:

* Pertenece a un board.
* Tiene un usuario creador.
* Puede tener un usuario asignado.
* Puede tener muchos comentarios.
* Puede tener muchas etiquetas.

### Comment

Atributos principales:

* id
* taskId
* authorId
* content
* createdAt
* updatedAt

Relaciones:

* Pertenece a una tarea.
* Tiene un usuario autor.

### Label

Atributos principales:

* id
* organizationId
* name
* color
* createdAt

Relaciones:

* Puede asociarse a muchas tareas.

## 3\. Reglas de integridad

* Una tarea debe pertenecer a un board existente.
* Un comentario debe pertenecer a una tarea existente.
* Una etiqueta debe pertenecer a una organizacion o contexto valido.
* Un usuario asignado a una tarea debe pertenecer a la misma organizacion.

