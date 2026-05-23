import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

// attach token from localStorage on every request
api.interceptors.request.use(cfg => {
  const store = JSON.parse(localStorage.getItem("realcollab-auth") || "{}");
  const token = store?.state?.token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Workspace ──────────────────────────────────
export const getWorkspaces   = ()         => api.get("/workspaces").then(r => r.data);
export const createWorkspace = (data)     => api.post("/workspaces", data).then(r => r.data);
export const inviteMember    = (id, data) => api.post(`/workspaces/${id}/invite`, data).then(r => r.data);

// ── Projects ───────────────────────────────────
export const getProjects     = (workspaceId) => api.get(`/workspaces/${workspaceId}/projects`).then(r => r.data);
export const createProject   = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/projects`, data).then(r => r.data);

// ── Tasks ──────────────────────────────────────
export const getTasks        = (workspaceId, projectId) => api.get(`/workspaces/${workspaceId}/projects/${projectId}/tasks`).then(r => r.data);

// ── Project Activity ───────────────────────────
export const getProjectActivity = (workspaceId, projectId) => api.get(`/workspaces/${workspaceId}/projects/${projectId}/activity`).then(r => r.data);

export default api;