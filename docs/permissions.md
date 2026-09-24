# SothForge API - Permissions Model

## 1. Roles por organización

Cada usuario pertenece a una organización mediante `OrganizationMember` y tiene uno de los siguientes roles:

- `OWNER`
- `ADMIN`
- `MEMBER`
- `VIEWER`

Los permisos se determinan principalmente por el rol del usuario dentro de la organización.

## 2. Permisos por rol

### Owner

Tiene control completo sobre la organización.

Puede:

- gestionar la configuración de la organización
- administrar miembros
- cambiar roles
- transferir la propiedad de la organización
- eliminar la organización
- crear, modificar y eliminar proyectos
- crear, modificar y eliminar boards
- gestionar tareas
- gestionar comentarios
- gestionar etiquetas

### Admin

Tiene permisos administrativos dentro de la organización.

Puede:

- modificar la organización
- administrar miembros según las reglas del sistema
- modificar roles permitidos
- crear, modificar y eliminar proyectos
- crear, modificar y eliminar boards
- gestionar tareas
- gestionar comentarios
- gestionar etiquetas

No puede realizar operaciones reservadas exclusivamente al `OWNER`, como transferir la propiedad o eliminar la organización.

### Member

Puede participar activamente en el trabajo de la organización.

Puede:

- acceder a proyectos y boards
- crear y modificar tareas según las reglas de acceso
- asignarse o asignar tareas cuando corresponda
- modificar estado y prioridad de tareas
- agregar y gestionar comentarios
- consultar etiquetas
- asociar etiquetas a tareas cuando corresponda

No puede administrar la organización ni sus miembros.

### Viewer

Tiene acceso de solo lectura.

Puede:

- consultar la organización
- consultar miembros
- consultar proyectos
- consultar boards
- consultar tareas
- consultar comentarios
- consultar etiquetas

No puede crear, modificar ni eliminar recursos.

## 3. Reglas de acceso

### Membresía

Un usuario debe pertenecer a la organización correspondiente para acceder a sus recursos.

La pertenencia se determina mediante `OrganizationMember`.

### Acceso a recursos

La autorización no depende únicamente del rol.

Los recursos se resuelven siguiendo su relación con la organización:

```text
Organization
    └── Project
        └── Board
            └── Task
                └── Comment