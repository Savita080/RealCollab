# Backend API Reference

**Base URL:** `http://localhost:3000/api`  
**Auth:** All routes except Register / Login / Google require `Authorization: Bearer <token>`

---

## Authentication

| Method | Endpoint | Body | Response |
|---|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` | `{ user: { id, name, email } }` |
| `POST` | `/auth/login` | `{ email, password }` | `{ token, user }` |
| `POST` | `/auth/google` | `{ credential }` | `{ token, user }` |
| `GET` | `/auth/me` | — | `{ user }` full profile |
| `PATCH` | `/auth/me` | `{ name?, bio?, avatar?, githubUrl?, skills? }` | `{ user }` |

---

## Workspaces

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces` | `{ name }` | Authenticated |
| `GET` | `/workspaces` | — | Authenticated |
| `PATCH` | `/workspaces/:workspaceId` | `{ name }` | OWNER |
| `DELETE` | `/workspaces/:workspaceId` | — | OWNER |
| `PATCH` | `/workspaces/:workspaceId/transfer-ownership` | `{ newOwnerId }` | OWNER |
| `POST` | `/workspaces/:workspaceId/invite` | `{ email, role? }` | ADMIN |
| `POST` | `/workspaces/invite/accept/:token` | — | Authenticated |
| `GET` | `/workspaces/:workspaceId/members` | — | VIEWER |
| `PATCH` | `/workspaces/:workspaceId/members/:userId/role` | `{ role }` | ADMIN |
| `DELETE` | `/workspaces/:workspaceId/members/:userId` | — | ADMIN |

---

## Projects

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects` | `{ name, description? }` | MEMBER |
| `GET` | `/workspaces/:wId/projects` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId` | `{ name?, description? }` | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId` | — | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/members` | — | VIEWER |
| `POST` | `/workspaces/:wId/projects/:pId/members` | `{ userId, role? }` | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/members/:userId` | — | CONTRIBUTOR |

---

## Tasks

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/tasks` | `{ title, description?, status?, priority?, assignee?, dueDate?, labels?, attachments? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/tasks` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId/tasks/:taskId` | any task fields | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/tasks/:taskId` | — | CONTRIBUTOR |

`status`: `TODO` `IN_PROGRESS` `IN_REVIEW` `DONE`  
`priority`: `P0` `P1` `P2`  
`attachments`: `[{ url, name }]` — frontend uploads file, sends URL

---

## Task Comments

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| `POST` | `/tasks/:taskId/comments` | `{ content, projectId }` | Auto-parses `@username` → sends MENTION notification |
| `GET` | `/tasks/:taskId/comments` | — | Sorted oldest-first |
| `DELETE` | `/tasks/:taskId/comments/:commentId` | `{ projectId }` | — |

---

## Chat

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/chat` | `{ content }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/chat` | — | VIEWER |
| `POST` | `/workspaces/:wId/chat` | `{ content }` | MEMBER |
| `GET` | `/workspaces/:wId/chat` | — | VIEWER |

---

## Code Snippets

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/snippets` | `{ title, language, code, description?, tags? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/snippets` | — | VIEWER |
| `GET` | `/workspaces/:wId/projects/:pId/snippets/:id` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId/snippets/:id` | any fields | CONTRIBUTOR |
| `DELETE` | `/workspaces/:wId/projects/:pId/snippets/:id` | — | CONTRIBUTOR |

---

## Wiki

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/wiki` | `{ title, content? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/wiki` | — | VIEWER |
| `GET` | `/workspaces/:wId/projects/:pId/wiki/:pageId` | — | VIEWER |
| `PATCH` | `/workspaces/:wId/projects/:pId/wiki/:pageId` | `{ title?, content?, commitMessage }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/wiki/:pageId/versions` | — | VIEWER |
| `DELETE` | `/workspaces/:wId/projects/:pId/wiki/:pageId` | — | CONTRIBUTOR |

`commitMessage` is required (min 10 chars) when updating `content`.

---

## Whiteboards

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/workspaces/:wId/projects/:pId/whiteboards` | `{ name? }` | CONTRIBUTOR |
| `GET` | `/workspaces/:wId/projects/:pId/whiteboards` | — | VIEWER |
| `DELETE` | `/workspaces/:wId/projects/:pId/whiteboards/:whiteboardId` | — | CONTRIBUTOR |

---

## Notifications

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| `GET` | `/notifications/unread` | — | Returns unseen notifications |
| `PATCH` | `/notifications/mark-read` | — | Marks all as seen |
| `POST` | `/notifications` | `{ recipientId, type, content, link? }` | Manual trigger (mentions are auto) |

`type`: `MENTION` `PROJECT_ASSIGN` `ROLE_CHANGE`

---

## Activity Feed

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/workspaces/:wId/projects/:pId/activity` | Latest 50 entries, populated user |

---

## AI

All endpoints require `projectId` or `workspaceId` in body for quota tracking. Returns `403` when monthly quota is exceeded.

| Method | Endpoint | Body |
|---|---|---|
| `POST` | `/ai/review-code` | `{ code, language, snippetId, projectId }` |
| `POST` | `/ai/standup` | `{ projectId }` |
| `POST` | `/ai/summarize-project` | `{ projectId }` |
| `POST` | `/ai/generate-tasks` | `{ projectId, featureDescription }` |
| `POST` | `/ai/bottleneck` | `{ projectId }` |

---

## Subscriptions

| Method | Endpoint | Body | RBAC |
|---|---|---|---|
| `POST` | `/subscriptions/:workspaceId/subscribe` | — | OWNER |
| `POST` | `/subscriptions/:workspaceId/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | OWNER |
| `POST` | `/subscriptions/:workspaceId/cancel` | — | OWNER |
| `GET` | `/subscriptions/:workspaceId/subscription` | — | VIEWER |

`/subscribe` returns `{ orderId, amount, currency, keyId }` — pass to Razorpay checkout JS.  
`/verify` upgrades workspace to PRO on valid HMAC signature.

---

## WebSocket Events

**Connection:** Socket.IO on `http://localhost:3000`

| Event | Direction | Payload |
|---|---|---|
| `user_online` | Client → Server | `userId` |
| `join_project` | Client → Server | `projectId` |
| `leave_project` | Client → Server | `projectId` |
| `task_move` | Client → Server | `{ taskId, projectId, newStatus, newPosition }` |
| `task_moved` | Server → Room | `{ taskId, status, position }` |
| `task_move_error` | Server → Client | `{ taskId }` |
| `task_comment_added` | Server → Room | comment object |
| `task_comment_deleted` | Server → Room | `{ commentId, taskId }` |
| `new_group_message` | Server → Room | message object |
| `new_notification` | Server → User | notification object |
| `join_whiteboard` | Client → Server | `whiteboardId` |
| `whiteboard_sync` | Server → Client | elements array |
| `whiteboard_draw` | Client → Server | `{ whiteboardId, elements }` |
| `whiteboard_update` | Server → Room | elements array |
| `save_whiteboard` | Client → Server | `{ whiteboardId, elements }` |
| `leave_whiteboard` | Client → Server | `whiteboardId` |
