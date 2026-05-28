// store/chat.js — global chat state (unread counts per project)
import { create } from 'zustand';
import socket from '../lib/socket';
import { chat as chatApi } from '../lib/api';

let bound = false;

export const useChat = create((set, get) => ({
  // { [projectId]: count }, keyed by canonical project _id
  unread: {},

  fetchUnread: async () => {
    try {
      const { data } = await chatApi.unreadCounts();
      set({ unread: data.counts || {} });
    } catch (_) {}
  },

  bump: (projectId) => set(s => ({
    unread: { ...s.unread, [projectId]: (s.unread[projectId] || 0) + 1 },
  })),

  clear: (projectId) => set(s => {
    if (!s.unread[projectId]) return s;
    const next = { ...s.unread };
    delete next[projectId];
    return { unread: next };
  }),

  // Bind socket listeners once. Caller must pass the current user id so we can
  // skip self-authored messages (which shouldn't bump unread).
  bindSocket: (currentUserId) => {
    if (bound) return;
    bound = true;
    socket.on('new_group_message', (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      if (senderId && senderId === currentUserId) return;
      const pid = msg.project?._id || msg.project;
      if (pid) get().bump(pid);
    });
  },
}));
