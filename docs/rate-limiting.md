# SothForge API - Rate Limiting

La API utiliza rate limiting para limitar la cantidad de solicitudes que un cliente puede realizar durante un período determinado.

Los endpoints tienen un límite general de `20 solicitudes por minuto`. Algunos endpoints sensibles cuentan con límites específicos más restrictivos.

Cuando existe un límite específico para un endpoint, este reemplaza al límite general.

## Límite general

| Alcance | Límite |
| ------- | -----: |
| General | 20/min |

---

## Auth

| Método | Endpoint         | Límite |
| ------ | ---------------- | -----: |
| POST   | `/auth/login`    |  5/min |
| POST   | `/auth/register` |  5/min |
| POST   | `/auth/refresh`  | 10/min |

---

## Organizations

### Organizations

| Método | Endpoint                         | Límite |
| ------ | -------------------------------- | -----: |
| POST   | `/organizations`                 |  5/min |
| PATCH  | `/organizations/:organizationId` | 10/min |
| DELETE | `/organizations/:organizationId` |  5/min |

### Members

| Método | Endpoint                                            | Límite |
| ------ | --------------------------------------------------- | -----: |
| POST   | `/organizations/:organizationId/members`            | 10/min |
| PATCH  | `/organizations/:organizationId/members/:userId`    | 10/min |
| PATCH  | `/organizations/:organizationId/transfer-ownership` |  3/min |
| DELETE | `/organizations/:organizationId/members/me`         |  5/min |
| DELETE | `/organizations/:organizationId/members/:userId`    | 10/min |

---

## Projects

| Método | Endpoint                                  | Límite |
| ------ | ----------------------------------------- | -----: |
| POST   | `/organizations/:organizationId/projects` | 10/min |
| PATCH  | `/projects/:projectId`                    | 10/min |
| DELETE | `/projects/:projectId`                    |  5/min |

---

## Boards

| Método | Endpoint                      | Límite |
| ------ | ----------------------------- | -----: |
| POST   | `/projects/:projectId/boards` | 10/min |
| PATCH  | `/boards/:boardId`            | 10/min |
| DELETE | `/boards/:boardId`            |  5/min |

---

## Tasks

| Método | Endpoint                  | Límite |
| ------ | ------------------------- | -----: |
| POST   | `/boards/:boardId/tasks`  | 10/min |
| PATCH  | `/tasks/:taskId`          | 10/min |
| DELETE | `/tasks/:taskId`          |  5/min |
| PATCH  | `/tasks/:taskId/assignee` | 10/min |
| DELETE | `/tasks/:taskId/assignee` |  5/min |
| PATCH  | `/tasks/:taskId/status`   | 10/min |
| PATCH  | `/tasks/:taskId/priority` | 10/min |

---

## Comments

| Método | Endpoint                  | Límite |
| ------ | ------------------------- | -----: |
| POST   | `/tasks/:taskId/comments` | 10/min |
| PATCH  | `/comments/:commentId`    | 10/min |
| DELETE | `/comments/:commentId`    |  5/min |

---

## Labels

| Método | Endpoint                                | Límite |
| ------ | --------------------------------------- | -----: |
| POST   | `/organizations/:organizationId/labels` | 10/min |
| PATCH  | `/labels/:labelId`                      | 10/min |
| DELETE | `/labels/:labelId`                      |  5/min |
| POST   | `/tasks/:taskId/labels/:labelId`        | 10/min |
| DELETE | `/tasks/:taskId/labels/:labelId`        |  5/min |
