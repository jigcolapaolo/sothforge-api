# SothForge API - Business Rules

## 1\. Reglas generales

* Toda organizacion debe tener al menos un Owner.
* No se puede eliminar el ultimo Owner de una organizacion.
* Solo miembros de una organizacion pueden acceder a sus recursos.
* Solo usuarios pertenecientes a la organizacion pueden asignarse a tareas.
* Viewer solo tiene permisos de lectura.

## 2\. Reglas de organizaciones

* Una organizacion debe tener un nombre valido.
* Un usuario debe autenticarse para crear o modificar una organizacion.
* La eliminacion de una organizacion debe validar permisos adecuados.

## 3\. Reglas de proyectos

* Un proyecto debe pertenecer a una organizacion existente.
* Solo miembros autorizados pueden crear o editar proyectos.

## 4\. Reglas de boards

* Un board debe pertenecer a un proyecto existente.
* Un board no puede existir fuera del contexto de un proyecto.

## 5\. Reglas de tasks

* Una tarea debe pertenecer a un board existente.
* El usuario asignado debe ser miembro de la organizacion.
* El estado y la prioridad deben corresponder a enums definidos.

## 6\. Reglas de permisos

* Owner: gestiona la organizacion y sus recursos.
* Admin: puede gestionar recursos y tareas.
* Member: puede modificar tareas asignadas.
* Viewer: solo lectura.

