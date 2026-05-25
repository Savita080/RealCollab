// store/ui.js
import { create } from 'zustand';
import socket from '../lib/socket';

// Listen for paywall events dispatched by api.js 403 interceptor
let paywallListenerAttached = false;
function attachPaywallListener(openPaywall) {
  if (paywallListenerAttached) return;
  paywallListenerAttached = true;
  window.addEventListener('paywall', (e) => openPaywall(e.detail));
}

const POPUP_DURATION = 6000;
const POPUP_MAX = 4;

export const useUI = create((set, get) => ({
  toasts: [],
  popups: [],          // live notification popups (corner dialogs)
  notifications: [],
  unreadCount: 0,
  sidebarOpen: true,
  paywallModal: null,   // { message, upgradeUrl } or null

  toast: (msg, type = 'info', duration = 4000) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },

  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // Notification popups (separate from toasts — bigger, click-to-navigate)
  pushPopup: (notif) => {
    const id = notif._id || `pop-${Date.now()}`;
    const item = { ...notif, id };
    set(s => ({ popups: [item, ...s.popups].slice(0, POPUP_MAX) }));
    setTimeout(() => {
      set(s => ({ popups: s.popups.filter(p => (p._id || p.id) !== id) }));
    }, POPUP_DURATION);
  },

  dismissPopup: (id) => set(s => ({ popups: s.popups.filter(p => (p._id || p.id) !== id) })),

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  openPaywall: (data) => set({ paywallModal: data }),
  closePaywall: () => set({ paywallModal: null }),

  // Bind socket notifications — event name must match backend exactly
  bindNotifications: () => {
    // Attach paywall listener once
    attachPaywallListener(get().openPaywall);

    // Remove any prior listener to avoid duplicates on remounts
    socket.off('new_notification');
    socket.on('new_notification', (notif) => {
      set(s => ({
        notifications: [notif, ...s.notifications],
        unreadCount: s.unreadCount + 1,
      }));
      get().pushPopup(notif);
    });
  },

  unbindNotifications: () => socket.off('new_notification'),

  setNotifications: (n) => set({ notifications: n, unreadCount: n.filter(x => !x.seen).length }),
  clearUnread: () => set({ unreadCount: 0 }),
}));

// Auto-attach paywall listener so 403 errors show modal even outside notification context
setTimeout(() => attachPaywallListener(useUI.getState().openPaywall), 100);

