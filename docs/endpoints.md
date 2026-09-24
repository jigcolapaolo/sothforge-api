# SothForge API - Endpoints

## 1. Auth

| Método | Endpoint           |
| ------ | ------------------ |
| POST   | `/auth/register`   |
| POST   | `/auth/login`      |
| POST   | `/auth/refresh`    |
| POST   | `/auth/logout`     |
| POST   | `/auth/logout-all` |

---

## 2. Users

| Método | Endpoint             |
| ------ | -------------------- |
| GET    | `/users/me`          |
| PATCH  | `/users/me`          |
| PATCH  | `/users/me/password` |

---

## 3. Organizations

### Organizations

| Método | Endpoint                         |
| ------ | -------------------------------- |
| POST   | `/organizations`                 |
| GET    | `/organizations`                 |
| GET    | `/organizations/:organizationId` |
| PATCH  | `/organizations/:organizationId` |
| DELETE | `/organizations/:organizationId` |

### Members

| Método | Endpoint                                            |
| ------ | --------------------------------------------------- |
| POST   | `/organizations/:organizationId/members`            |
| GET    | `/organizations/:organizationId/members`            |
| PATCH  | `/organizations/:organizationId/members/:userId`    |
| PATCH  | `/organizations/:organizationId/transfer-ownership` |
| DELETE | `/organizations/:organizationId/members/me`         |
| DELETE | `/organizations/:organizationId/members/:userId`    |

---

## 4. Projects

| Método | Endpoint                                  |
| ------ | ----------------------------------------- |
| POST   | `/organizations/:organizationId/projects` |
| GET    | `/organizations/:organizationId/projects` |
| GET    | `/projects/:projectId`                    |
| PATCH  | `/projects/:projectId`                    |
| DELETE | `/projects/:projectId`                    |

---

## 5. Boards

| Método | Endpoint                      |
| ------ | ----------------------------- |
| POST   | `/projects/:projectId/boards` |
| GET    | `/projects/:projectId/boards` |
| GET    | `/boards/:boardId`            |
| PATCH  | `/boards/:boardId`            |
| DELETE | `/boards/:boardId`            |

---

## 6. Tasks

| Método | Endpoint                  |
| ------ | ------------------------- |
| POST   | `/boards/:boardId/tasks`  |
| GET    | `/boards/:boardId/tasks`  |
| GET    | `/tasks/:taskId`          |
| PATCH  | `/tasks/:taskId`          |
| DELETE | `/tasks/:taskId`          |
| PATCH  | `/tasks/:taskId/assignee` |
| DELETE | `/tasks/:taskId/assignee` |
| PATCH  | `/tasks/:taskId/status`   |
| PATCH  | `/tasks/:taskId/priority` |

---

## 7. Comments

| Método | Endpoint                  |
| ------ | ------------------------- |
| POST   | `/tasks/:taskId/comments` |
| GET    | `/tasks/:taskId/comments` |
| GET    | `/comments/:commentId`    |
| PATCH  | `/comments/:commentId`    |
| DELETE | `/comments/:commentId`    |

---

## 8. Labels

| Método | Endpoint                                |
| ------ | --------------------------------------- |
| POST   | `/organizations/:organizationId/labels` |
| GET    | `/organizations/:organizationId/labels` |
| POST   | `/tasks/:taskId/labels/:labelId`        |
| DELETE | `/tasks/:taskId/labels/:labelId`        |
| GET    | `/labels/:labelId`                      |
| PATCH  | `/labels/:labelId`                      |
| DELETE | `/labels/:labelId`                      |
