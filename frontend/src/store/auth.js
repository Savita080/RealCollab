// store/auth.js
import { create } from 'zustand';
import { auth as authApi } from '../lib/api';
import { connectSocket, disconnectSocket, emitUserOnline } from '../lib/socket';

export const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem('rc_token'),
  loading: true,

  init: async () => {
    const token = localStorage.getItem('rc_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const { data } = await authApi.me();
      // Backend /me returns { message, yourId } — build a minimal user object
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
    // Backend returns { message, token, user: { id, name, email } }
    const { data } = await authApi.login(creds);
    if (!data.token) throw new Error(data.message || 'Login failed');
    localStorage.setItem('rc_token', data.token);
    set({ user: data.user, token: data.token });
    try {
      connectSocket(data.token);
      const uid = data.user?.id || data.user?._id;
      if (uid) setTimeout(() => emitUserOnline(uid), 500);
    } catch (_) {}
    return data;
  },

  register: async (creds) => {
    // Backend register returns { message, user } with NO token
    // So we auto-login immediately after register
    await authApi.register(creds);
    // Now login to get a token
    const { data } = await authApi.login({ email: creds.email, password: creds.password });
    if (!data.token) throw new Error('Registration succeeded but login failed');
    localStorage.setItem('rc_token', data.token);
    set({ user: data.user, token: data.token });
    try {
      connectSocket(data.token);
      const uid = data.user?.id || data.user?._id;
      if (uid) setTimeout(() => emitUserOnline(uid), 500);
    } catch (_) {}
    return data;
  },

  logout: async () => {
    // Backend has no /auth/logout route — just clear locally
    localStorage.removeItem('rc_token');
    try { disconnectSocket(); } catch (_) {}
    set({ user: null, token: null });
  },

  isAuthed: () => !!get().token,
}));
