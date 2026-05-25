// lib/socket.js — Socket.IO client, single instance
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
});

import { BYPASS_BACKEND } from './api';

// Identity to re-announce on every (re)connect. Set by connectSocket / setSocketIdentity.
let identity = null;

export const setSocketIdentity = (userId, name) => {
  identity = userId ? { userId, name: name || '' } : null;
  if (identity && socket.connected) {
    socket.emit('user_online', identity);
  }
};

socket.on('connect', () => {
  if (identity) socket.emit('user_online', identity);
});

export const connectSocket = (token, userId, name) => {
  if (BYPASS_BACKEND) {
    console.log('[Socket] BYPASS_BACKEND is true. Skipping real socket connection.');
    return;
  }
  socket.auth = { token };
  if (userId) identity = { userId, name: name || '' };
  socket.connect();
};

export const disconnectSocket = () => socket.disconnect();

// Presence
export const emitUserOnline = (userId, name) => socket.emit('user_online', { userId, name: name || '' });

// Room helpers — event names must match backend (underscores, not colons)
export const joinProject    = (projectId)  => socket.emit('join_project', projectId);
export const leaveProject   = (projectId)  => socket.emit('leave_project', projectId);
export const joinWhiteboard = (wbId)       => socket.emit('join_whiteboard', wbId);
export const leaveWhiteboard= (wbId)       => socket.emit('leave_whiteboard', wbId);

// Typing indicator
export const emitTyping = (projectId, userName) => socket.emit('typing', { projectId, userName });

// Task events
export const emitTaskMove   = (data) => socket.emit('task_move', data);

// Whiteboard events
export const emitDraw       = (data) => socket.emit('whiteboard_draw', data);
export const emitSaveWb     = (data) => socket.emit('save_whiteboard', data);

export default socket;
