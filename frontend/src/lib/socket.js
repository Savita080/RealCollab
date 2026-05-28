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

// Rooms to re-join on reconnect.
const activeRooms = { workspaces: new Set(), projects: new Set(), whiteboards: new Set() };

export const setSocketIdentity = (userId, name, avatar) => {
  identity = userId ? { userId, name: name || '', avatar: avatar || '' } : null;
  if (identity && socket.connected) {
    socket.emit('user_online', identity);
  }
};

export const getSocketIdentity = () => identity;

socket.on('connect', () => {
  if (identity) socket.emit('user_online', identity);
  activeRooms.workspaces.forEach(id => socket.emit('join_workspace', id));
  activeRooms.projects.forEach(id => {
    socket.emit('join_project', id);
    socket.emit('request_presence', id);
  });
  activeRooms.whiteboards.forEach(id => socket.emit('join_whiteboard', id));
});

export const connectSocket = (token, userId, name, avatar) => {
  if (BYPASS_BACKEND) {
    console.log('[Socket] BYPASS_BACKEND is true. Skipping real socket connection.');
    return;
  }
  socket.auth = { token };
  if (userId) identity = { userId, name: name || '', avatar: avatar || '' };
  
  if (socket.connected) {
    console.log('[Socket] Socket already connected. Re-announcing identity and active rooms.');
    if (identity) socket.emit('user_online', identity);
    activeRooms.workspaces.forEach(id => socket.emit('join_workspace', id));
    activeRooms.projects.forEach(id => socket.emit('join_project', id));
    activeRooms.whiteboards.forEach(id => socket.emit('join_whiteboard', id));
  } else {
    socket.connect();
  }
};

export const disconnectSocket = () => socket.disconnect();

// Presence
export const emitUserOnline = (userId, name) => socket.emit('user_online', { userId, name: name || '' });

export const joinProject     = (projectId)    => {
  activeRooms.projects.add(projectId);
  if (socket.connected) {
    if (identity) socket.emit('user_online', identity);
    socket.emit('join_project', projectId);
    socket.emit('request_presence', projectId);
  }
};
export const leaveProject    = (projectId)    => { activeRooms.projects.delete(projectId); if (socket.connected) socket.emit('leave_project', projectId); };
export const joinWorkspace   = (workspaceId)  => { activeRooms.workspaces.add(workspaceId);    if (socket.connected) socket.emit('join_workspace', workspaceId); };
export const leaveWorkspace  = (workspaceId)  => { activeRooms.workspaces.delete(workspaceId); if (socket.connected) socket.emit('leave_workspace', workspaceId); };
export const joinWhiteboard  = (wbId)         => { activeRooms.whiteboards.add(wbId);    if (socket.connected) socket.emit('join_whiteboard', wbId); };
export const leaveWhiteboard = (wbId)         => { activeRooms.whiteboards.delete(wbId); if (socket.connected) socket.emit('leave_whiteboard', wbId); };

// Typing indicator
export const emitTyping = (projectId, userName) => socket.emit('typing', { projectId, userName });

// Task events
export const emitTaskMove   = (data) => socket.emit('task_move', data);

// Whiteboard events
export const emitDraw       = (data) => socket.emit('whiteboard_draw', data);
export const emitSaveWb     = (data) => socket.emit('save_whiteboard', data);
export const emitPointerUpdate = (data) => socket.emit('whiteboard_pointer_update', data);

export default socket;
