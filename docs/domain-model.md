# SothForge API - Domain Model

## 1\. Visión general

El dominio del proyecto está centrado en organizaciones, proyectos, boards y tareas que colaboran entre usuarios.

## 2\. Entidades del dominio

### User

Representa un usuario registrado en la plataforma.

Responsabilidades:

* autenticarse
* pertenecer a organizaciones
* crear y modificar recursos
* asignarse tareas

### Organization

Representa un espacio colaborativo donde trabajan usuarios.

Responsabilidades:

* agrupar usuarios
* contener proyectos
* asignar roles

### OrganizationMember

Representa la pertenencia de un usuario a una organizacion.

Responsabilidades:

* definir rol y permisos
* controlar acceso a recursos

### Project

Representa una iniciativa dentro de una organizacion.

Responsabilidades:

* agrupar boards
* organizar trabajo colaborativo

### Board

Representa una vista o categoria de trabajo dentro de un proyecto.

Responsabilidades:

* organizar tareas por contexto
* facilitar visualizacion del trabajo

### Task

Es la entidad principal del sistema.

Responsabilidades:

* representar trabajo pendiente o en progreso
* soportar estado, prioridad y asignacion
* permitir comentarios y etiquetas

### Comment

Representa un comentario asociado a una tarea.

Responsabilidades:

* registrar observaciones
* facilitar comunicacion del equipo

### Label

Representa una etiqueta reutilizable para clasificar tareas.

Responsabilidades:

* categorizar trabajo
* soportar filtros y consultas

