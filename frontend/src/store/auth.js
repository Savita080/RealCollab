// store/auth.js
import { create } from 'zustand';
import { auth as authApi } from '../lib/api';
import { connectSocket, disconnectSocket, setSocketIdentity } from '../lib/socket';
import { registerPush } from '../lib/webpush';
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
      const uid = user.id || user._id;
      connectSocket(token, uid, user?.name);
      registerPush();
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
      const uid = data.user?.id || data.user?._id;
      connectSocket(data.token, uid, data.user?.name);
    } catch (_) {}
    // Fetch full profile after login (avatar, bio, skills, etc.)
    try {
      const { data: me } = await authApi.me();
      if (me.user) {
        set({ user: me.user });
        setSocketIdentity(me.user.id || me.user._id, me.user.name);
      }
    } catch (_) {}
    registerPush();
    return data;
  },

  googleLogin: async (creds) => {
    const { data } = await authApi.googleLogin(creds);
    if (!data.token) throw new Error(data.message || 'Google Login failed');
    localStorage.setItem('rc_token', data.token);
    if (data.refreshToken) localStorage.setItem('rc_refresh_token', data.refreshToken);
    set({ user: data.user, token: data.token });
    try {
      const uid = data.user?.id || data.user?._id;
      connectSocket(data.token, uid, data.user?.name);
    } catch (_) {}
    registerPush();
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
      const uid = data.user?.id || data.user?._id;
      connectSocket(data.token, uid, data.user?.name);
    } catch (_) {}
    registerPush();
    return data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('rc_refresh_token');
    if (refreshToken) {
      try { await authApi.logout({ refreshToken }); } catch (_) {}
    }
    localStorage.removeItem('rc_token');
    localStorage.removeItem('rc_refresh_token');
    try { setSocketIdentity(null); disconnectSocket(); } catch (_) {}
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

  // Imperatively replace the user object — used after subscription refresh
  // to keep the plan badge in sync without a full reload.
  setUser: (user) => set({ user }),

  isAuthed: () => !!get().token,
}));
