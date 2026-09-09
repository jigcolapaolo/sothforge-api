# Redis

Redis se utiliza en SothForge para dos propósitos principales:

* Rate limiting distribuido.
* Cache de consultas de proyectos.

Actualmente, Redis se ejecuta de forma independiente de la API mediante Docker.

```text
SothForge API
    │
    ├── Rate Limiting ──────┐
    │                       │
    └── Cache de Projects ──┤
                            ▼
                           Redis
                            │
                            ▼
                       PostgreSQL
```

## 1. Configuración de Redis

La API se conecta a Redis mediante la variable de entorno `REDIS_URL`.

Ejemplo:

```env
REDIS_URL=redis://localhost:6379
```

Redis se ejecuta actualmente como un contenedor Docker independiente:

```bash
docker run -d --name sothforge-redis -p 6379:6379 redis:alpine
```

La API no se ejecuta dentro de Docker.

## 2. Rate Limiting

Redis se utiliza como almacenamiento para el sistema de throttling de NestJS.

Esto permite almacenar el estado del rate limiting fuera del proceso de la aplicación, en lugar de mantenerlo únicamente en memoria.

El límite global configurado es:

* 20 solicitudes por minuto.

Determinadas operaciones de escritura pueden tener límites más estrictos cuando corresponde.

El uso de Redis como almacenamiento del throttling también permite compartir el estado del rate limiting entre múltiples instancias de la API.

## 3. Cache de Projects

Actualmente se implementa cache para:

```text
GET /organizations/:organizationId/projects
```

El cache almacena la lista de proyectos pertenecientes a una organización.

### Clave de cache

Cada organización tiene su propia clave:

```text
projects:{organizationId}
```

Por ejemplo:

```text
projects:550e8400-e29b-41d4-a716-446655440000
```

Esto evita que los proyectos de diferentes organizaciones compartan la misma entrada de cache.

### Flujo del cache

Al solicitar la lista de proyectos:

```text
GET /organizations/:organizationId/projects
                │
                ▼
             Redis
                │
        ┌───────┴───────┐
        │               │
      HIT              MISS
        │               │
        ▼               ▼
    Retornar        PostgreSQL
      cache              │
                         ▼
                       Redis
                         │
                         ▼
                  Retornar proyectos
```

Si los datos solicitados existen en Redis, se retornan directamente sin consultar PostgreSQL.

Si el cache no existe, la API consulta PostgreSQL, almacena el resultado en Redis y retorna los proyectos.

## 4. Expiración del Cache

Las entradas del cache de proyectos tienen un TTL de 60 segundos.

```text
TTL = 60 segundos
```

Una vez transcurrido ese tiempo, Redis elimina automáticamente la entrada.

La siguiente solicitud será un cache miss, por lo que la API obtendrá los datos actualizados desde PostgreSQL y volverá a almacenar el resultado en Redis.

Esto permite reducir consultas repetitivas a la base de datos sin mantener datos cacheados indefinidamente.

## 5. Invalidación del Cache

El cache de proyectos se invalida explícitamente después de realizar correctamente una modificación.

Las siguientes operaciones eliminan el cache correspondiente a la organización:

```text
POST   /organizations/:organizationId/projects
PATCH  /projects/:id
DELETE /projects/:id
```

La clave de cache se elimina después de que la operación en la base de datos haya finalizado correctamente:

```text
Modificación en PostgreSQL
          │
          ▼
       Exitosa
          │
          ▼
Eliminar projects:{organizationId}
```

La siguiente solicitud `GET` será entonces un cache miss, consultará PostgreSQL y volverá a poblar el cache con los datos actualizados.

Esto evita devolver una lista de proyectos desactualizada después de crear, modificar o eliminar un proyecto.

## 6. ¿Por qué solamente Projects?

El cache está limitado intencionalmente al módulo de Projects en esta etapa.

Projects proporciona un caso de uso sencillo y útil para caching: la API consulta frecuentemente la colección de proyectos de una organización, mientras que los datos subyacentes no necesariamente cambian en cada solicitud.

Otros recursos, especialmente Tasks y Comments, pueden modificarse con mayor frecuencia y requerirían estrategias de invalidación más complejas.

Agregar cache a todos los módulos introduciría complejidad adicional sin proporcionar necesariamente un beneficio significativo para el alcance actual del proyecto.

## 7. Responsabilidades actuales de Redis

| Uso                         | Propósito                                         | Estrategia                                         |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Rate limiting               | Proteger endpoints frente a solicitudes excesivas | Throttling respaldado por Redis                    |
| Cache de Projects           | Reducir consultas repetitivas a PostgreSQL        | TTL + invalidación explícita                       |
| Blacklist de refresh tokens | No utilizado                                      | Las sesiones de PostgreSQL gestionan la revocación |

Redis podrá utilizarse para nuevos casos de uso en el futuro si los requisitos de rendimiento o escalabilidad lo justifican.
