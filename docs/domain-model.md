# SothForge API - Domain Model

## 1. Visión general

El dominio de SothForge está centrado en la colaboración dentro de organizaciones.

Los usuarios pertenecen a organizaciones y trabajan en proyectos, boards y tareas. Las tareas pueden tener comentarios, etiquetas y asignaciones.

El sistema también incorpora sesiones para la autenticación y registros de auditoría para mantener un historial de acciones relevantes.

## 2. Entidades del dominio

### User

Representa un usuario registrado en la plataforma.

Responsabilidades:

- autenticarse
- pertenecer a organizaciones
- crear recursos
- modificar recursos según sus permisos
- crear y asignarse tareas
- participar en conversaciones mediante comentarios

### Session

Representa una sesión autenticada de un usuario.

Responsabilidades:

- mantener el estado de autenticación mediante refresh tokens
- permitir revocar sesiones
- controlar la expiración de sesiones

### Organization

Representa un espacio colaborativo donde trabajan usuarios.

Responsabilidades:

- agrupar usuarios
- contener proyectos
- contener etiquetas
- definir el contexto de permisos y acceso

### OrganizationMember

Representa la pertenencia de un usuario a una organización.

Responsabilidades:

- definir el rol del usuario dentro de la organización
- determinar sus permisos
- controlar el acceso a los recursos de la organización

### Project

Representa una iniciativa dentro de una organización.

Responsabilidades:

- agrupar boards
- organizar el trabajo colaborativo
- representar el estado general del proyecto

### Board

Representa un tablero dentro de un proyecto.

Responsabilidades:

- organizar tareas por contexto
- facilitar la visualización y gestión del trabajo

### Task

Es la entidad principal del sistema.

Responsabilidades:

- representar trabajo pendiente o en progreso
- soportar estados y prioridades
- permitir asignación a usuarios
- registrar fechas y estimaciones de trabajo
- permitir comentarios y etiquetas
- registrar cambios relevantes mediante auditoría

### Comment

Representa un comentario asociado a una tarea.

Responsabilidades:

- registrar observaciones
- facilitar la comunicación del equipo
- mantener un historial de participación sobre una tarea

### Label

Representa una etiqueta reutilizable perteneciente a una organización.

Responsabilidades:

- categorizar tareas
- facilitar filtros y consultas
- permitir clasificar el trabajo dentro de una organización

### TaskLabel

Representa la asociación entre una tarea y una etiqueta.

Responsabilidades:

- relacionar tareas con etiquetas
- permitir que una tarea tenga múltiples etiquetas
- permitir reutilizar una etiqueta en múltiples tareas

### AuditLog

Representa un registro de una acción relevante realizada dentro del sistema.

Responsabilidades:

- registrar quién realizó una acción
- identificar la entidad afectada
- registrar el tipo de acción realizada
- conservar información adicional mediante metadata
- mantener un historial de cambios relevantes