// lib/api.js — single axios instance, all endpoints
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Auth header injection
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('rc_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Simple 401 handler — just clear token and redirect to login
api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rc_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────
export const auth = {
  register: d  => api.post('/auth/register', d),
  login:    d  => api.post('/auth/login', d),
  me:       () => api.get('/auth/me'),
};

// ── Workspaces ────────────────────────────────────────
export const workspaces = {
  list:         ()           => api.get('/workspaces'),
  create:       d            => api.post('/workspaces', d),
  get:          id           => api.get(`/workspaces/${id}`),
  update:       (id, d)      => api.patch(`/workspaces/${id}`, d),
  delete:       id           => api.delete(`/workspaces/${id}`),
  invite:       (id, d)      => api.post(`/workspaces/${id}/invite`, d),
  acceptInvite: token        => api.post(`/workspaces/invite/accept/${token}`),
  members:      id           => api.get(`/workspaces/${id}/members`),
  updateRole:   (id, uid, d) => api.patch(`/workspaces/${id}/members/${uid}/role`, d),
  removeMember: (id, uid)    => api.delete(`/workspaces/${id}/members/${uid}`),
};

// ── Projects ──────────────────────────────────────────
// Mounted at: /api/workspaces/:workspaceId/projects
export const projects = {
  list:   wid         => api.get(`/workspaces/${wid}/projects`),
  create: (wid, d)    => api.post(`/workspaces/${wid}/projects`, d),
  get:    (wid, id)   => api.get(`/workspaces/${wid}/projects/${id}`),
  update: (wid, id, d)=> api.patch(`/workspaces/${wid}/projects/${id}`, d),
  delete: (wid, id)   => api.delete(`/workspaces/${wid}/projects/${id}`),
  members:    (wid, pid)        => api.get(`/workspaces/${wid}/projects/${pid}/members`),
  addMember:  (wid, pid, d)     => api.post(`/workspaces/${wid}/projects/${pid}/members`, d),
  removeMember:(wid, pid, uid)  => api.delete(`/workspaces/${wid}/projects/${pid}/members/${uid}`),
};

// ── Tasks ─────────────────────────────────────────────
// Mounted at: /api/workspaces/:workspaceId/projects/:projectId/tasks
export const tasks = {
  list:   (wid, pid)       => api.get(`/workspaces/${wid}/projects/${pid}/tasks`),
  create: (wid, pid, d)    => api.post(`/workspaces/${wid}/projects/${pid}/tasks`, d),
  update: (wid, pid, id, d)=> api.patch(`/workspaces/${wid}/projects/${pid}/tasks/${id}`, d),
  delete: (wid, pid, id)   => api.delete(`/workspaces/${wid}/projects/${pid}/tasks/${id}`),
  // Comments — mounted at: /api/tasks/:taskId/comments
  comments:      taskId       => api.get(`/tasks/${taskId}/comments`),
  comment:       (taskId, d)  => api.post(`/tasks/${taskId}/comments`, d),   // body: { content, projectId }
  deleteComment: (taskId, cid)=> api.delete(`/tasks/${taskId}/comments/${cid}`),
};

// ── Snippets ──────────────────────────────────────────
// Mounted at: /api/workspaces/:wId/projects/:pId/snippets
export const snippets = {
  list:   (wid, pid)           => api.get(`/workspaces/${wid}/projects/${pid}/snippets`),
  create: (wid, pid, d)        => api.post(`/workspaces/${wid}/projects/${pid}/snippets`, d),
  get:    (wid, pid, id)       => api.get(`/workspaces/${wid}/projects/${pid}/snippets/${id}`),
  update: (wid, pid, id, d)    => api.patch(`/workspaces/${wid}/projects/${pid}/snippets/${id}`, d),
  delete: (wid, pid, id)       => api.delete(`/workspaces/${wid}/projects/${pid}/snippets/${id}`),
};

// ── Wiki ──────────────────────────────────────────────
// Mounted at: /api/workspaces/:wId/projects/:pId/wiki
export const wiki = {
  pages:    (wid, pid)              => api.get(`/workspaces/${wid}/projects/${pid}/wiki`),
  get:      (wid, pid, pgId)        => api.get(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}`),
  create:   (wid, pid, d)           => api.post(`/workspaces/${wid}/projects/${pid}/wiki`, d),
  update:   (wid, pid, pgId, d)     => api.patch(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}`, d),
  versions: (wid, pid, pgId)        => api.get(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}/versions`),
  delete:   (wid, pid, pgId)        => api.delete(`/workspaces/${wid}/projects/${pid}/wiki/${pgId}`),
};

// ── Chat ──────────────────────────────────────────────
// Project chat mounted at: /api/workspaces/:wId/projects/:pId/chat
export const chat = {
  projectMessages: (wid, pid)    => api.get(`/workspaces/${wid}/projects/${pid}/chat`),
  sendProject:     (wid, pid, d) => api.post(`/workspaces/${wid}/projects/${pid}/chat`, d),
};

// ── Activity ──────────────────────────────────────────
// Mounted at: /api/workspaces/:wId/projects/:pId/activity
export const activity = {
  list: (wid, pid, params) => api.get(`/workspaces/${wid}/projects/${pid}/activity`, { params }),
};

// ── Notifications ─────────────────────────────────────
export const notifications = {
  create:   d  => api.post('/notifications', d),
  unread:   () => api.get('/notifications/unread'),
  markRead: id => api.patch(`/notifications/${id}/read`),
  markAll:  () => api.patch('/notifications/read-all'),
};

// ── AI (Suhani's service) ─────────────────────────────
export const ai = {
  summarise: (wid, pid)      => api.post(`/ai/summarize-project`, { projectId: pid }),
  blockers:  (wid, pid)      => api.post(`/ai/generate-tasks`, { projectId: pid }),
  standup:   (wid, pid)      => api.post(`/ai/standup`, { projectId: pid }),
  plan:      (wid, pid, d)   => api.post(`/ai/generate-tasks`, { projectId: pid, ...d }),
  review:    d               => api.post('/ai/review-code', d),
};

export default api;
