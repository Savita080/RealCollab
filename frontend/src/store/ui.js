// store/ui.js
import { create } from 'zustand';
import socket from '../lib/socket';

export const useUI = create((set, get) => ({
  toasts: [],
  notifications: [],
  unreadCount: 0,
  sidebarOpen: true,

  toast: (msg, type = 'info', duration = 4000) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },

  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  // Bind socket notifications — event name must match backend exactly
  bindNotifications: () => {
    socket.on('new_notification', (notif) => {
      set(s => ({
        notifications: [notif, ...s.notifications],
        unreadCount: s.unreadCount + 1,
      }));
      get().toast(notif.content || notif.message || 'New notification', 'info');
    });
  },

  unbindNotifications: () => socket.off('new_notification'),

  setNotifications: (n) => set({ notifications: n, unreadCount: n.filter(x => !x.seen).length }),
  clearUnread: () => set({ unreadCount: 0 }),
}));
