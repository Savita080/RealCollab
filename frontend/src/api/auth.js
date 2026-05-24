import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const authAPI = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} credentials
 * @returns {{ user: object, token: string }}
 */
export const loginUser = async ({ email, password }) => {
  const { data } = await authAPI.post("/auth/login", { email, password });
  return data; // expects { user, token }
};

/**
 * POST /api/auth/register
 */
export const registerUser = async ({ name, email, password }) => {
  const { data } = await authAPI.post("/auth/register", { name, email, password });
  return data;
};

export default authAPI;