# SothForge API - Endpoints Base

## 1. Auth

- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

## 2. Users

- GET /users/me
- PATCH /users/me
- PATCH /users/change-password

## 3. Organizations

- POST /organizations
- GET /organizations
- GET /organizations/:id
- PATCH /organizations/:id
- DELETE /organizations/:id
- POST /organizations/:id/members
- PATCH /organizations/:id/members/:memberId
- DELETE /organizations/:id/members/:memberId

## 4. Projects

- POST /organizations/:organizationId/projects
- GET /organizations/:organizationId/projects
- GET /projects/:id
- PATCH /projects/:id
- DELETE /projects/:id

## 5. Boards

- POST /projects/:projectId/boards
- GET /projects/:projectId/boards
- GET /boards/:id
- PATCH /boards/:id
- DELETE /boards/:id

## 6. Tasks

- POST /boards/:boardId/tasks
- GET /boards/:boardId/tasks
- GET /tasks/:id
- PATCH /tasks/:id
- DELETE /tasks/:id

## 7. Comments

- POST /tasks/:taskId/comments
- GET /tasks/:taskId/comments
- PATCH /comments/:id
- DELETE /comments/:id

## 8. Labels

- POST /labels
- GET /labels
- PATCH /labels/:id
- DELETE /labels/:id
