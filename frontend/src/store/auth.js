// store/auth.js
import { create } from 'zustand';
import { auth as authApi } from '../lib/api';
import { connectSocket, disconnectSocket, emitUserOnline } from '../lib/socket';
import { useWorkspace } from './workspace';
import { useTasks } from './tasks';

export const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem('rc_token'),
  loading: true,

  init: async () => {
    const token = localStorage.getItem('rc_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const { data } = await authApi.me();
      // Backend /me returns { user } with full profile (avatar, bio, githubUrl, skills)
      const user = data.user || { id: data.yourId, name: data.name, email: data.email };
      set({ user, loading: false });
      connectSocket(token);
      const uid = user.id || user._id;
      if (uid) setTimeout(() => emitUserOnline(uid), 500);
    } catch {
      localStorage.removeItem('rc_token');
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (creds) => {
    const { data } = await authApi.login(creds);
    if (!data.token) throw new Error(data.message || 'Login failed');
    localStorage.setItem('rc_token', data.token);
    if (data.refreshToken) localStorage.setItem('rc_refresh_token', data.refreshToken);
    set({ user: data.user, token: data.token });
    try {
      connectSocket(data.token);
      const uid = data.user?.id || data.user?._id;
      if (uid) setTimeout(() => emitUserOnline(uid), 500);
    } catch (_) {}
    // Fetch full profile after login (avatar, bio, skills, etc.)
    try {
      const { data: me } = await authApi.me();
      if (me.user) set({ user: me.user });
    } catch (_) {}
    return data;
  },

  googleLogin: async (creds) => {
    const { data } = await authApi.googleLogin(creds);
    if (!data.token) throw new Error(data.message || 'Google Login failed');
    localStorage.setItem('rc_token', data.token);
    if (data.refreshToken) localStorage.setItem('rc_refresh_token', data.refreshToken);
    set({ user: data.user, token: data.token });
    try {
      connectSocket(data.token);
      const uid = data.user?.id || data.user?._id;
      if (uid) setTimeout(() => emitUserOnline(uid), 500);
    } catch (_) {}
    return data;
  },

  register: async (creds) => {
    await authApi.register(creds);
    const { data } = await authApi.login({ email: creds.email, password: creds.password });
    if (!data.token) throw new Error('Registration succeeded but login failed');
    localStorage.setItem('rc_token', data.token);
    if (data.refreshToken) localStorage.setItem('rc_refresh_token', data.refreshToken);
    set({ user: data.user, token: data.token });
    try {
      connectSocket(data.token);
      const uid = data.user?.id || data.user?._id;
      if (uid) setTimeout(() => emitUserOnline(uid), 500);
    } catch (_) {}
    return data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('rc_refresh_token');
    if (refreshToken) {
      try { await authApi.logout({ refreshToken }); } catch (_) {}
    }
    localStorage.removeItem('rc_token');
    localStorage.removeItem('rc_refresh_token');
    try { disconnectSocket(); } catch (_) {}
    useWorkspace.getState().reset();
    useTasks.getState().reset();
    set({ user: null, token: null });
  },

  // Update profile fields (name, bio, avatar, githubUrl, skills)
  updateProfile: async (d) => {
    const { data } = await authApi.updateProfile(d);
    const updated = data.user ?? data;
    set({ user: updated });
    return updated;
  },

  isAuthed: () => !!get().token,
}));
