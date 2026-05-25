// store/tasks.js
import { create } from 'zustand';
import { tasks as tasksApi } from '../lib/api';
import { emitTaskMove } from '../lib/socket';
import socket from '../lib/socket';

export const TASK_COLUMNS = [
  { key: 'To Do', label: 'To Do' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'In Review', label: 'In Review' },
  { key: 'Done', label: 'Done' },
];

export const TASK_STATUS_COLORS = {
  'To Do': '#6366f1',
  'In Progress': '#f59e0b',
  'In Review': '#00d4ff',
  'Done': '#10b981',
};

const COLS = TASK_COLUMNS.map(c => c.key);

// Map backend status enums to display labels
const STATUS_MAP = {
  'TODO': 'To Do',
  'IN_PROGRESS': 'In Progress',
  'IN_REVIEW': 'In Review',
  'DONE': 'Done',
};
// Map display labels → backend enums
const STATUS_REVERSE = {
  'To Do': 'TODO',
  'In Progress': 'IN_PROGRESS',
  'In Review': 'IN_REVIEW',
  'Done': 'DONE',
};

const toDisplayStatus = (status) => STATUS_MAP[status] || status;
const toBackendStatus = (status) => STATUS_REVERSE[status] || STATUS_REVERSE[toDisplayStatus(status)] || status;

// Normalise task status from backend enum to display label
const normalise = (task) => ({
  ...task,
  status: STATUS_MAP[task.status] || task.status,
});

export const useTasks = create((set, get) => ({
  tasks: [],
  loading: false,

  // Derived: group by status
  columns: () => COLS.reduce((acc, col) => ({
    ...acc,
    [col]: get().tasks.filter(t => t.status === col),
  }), {}),

  fetch: async (wid, pid) => {
    set({ loading: true });
    try {
      const { data } = await tasksApi.list(wid, pid);
      const list = (data.tasks ?? data).map(normalise);
      set({ tasks: list });
    } finally {
      set({ loading: false });
    }
  },

  create: async (wid, pid, d) => {
    const payload = { ...d };
    if (payload.status) payload.status = toBackendStatus(payload.status);
    const { data } = await tasksApi.create(wid, pid, payload);
    const task = normalise(data.task ?? data);
    set(s => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  move: async (wid, pid, taskId, status, projectId) => {
    const displayStatus = toDisplayStatus(status);
    const backendStatus = toBackendStatus(displayStatus);
    set(s => ({ tasks: s.tasks.map(t => t._id === taskId ? { ...t, status: displayStatus } : t) }));
    emitTaskMove({ taskId, projectId, newStatus: backendStatus });
    await tasksApi.update(wid, pid, taskId, { status: backendStatus });
  },

  update: async (wid, pid, taskId, d) => {
    const payload = { ...d };
    if (payload.status) payload.status = toBackendStatus(payload.status);
    const { data } = await tasksApi.update(wid, pid, taskId, payload);
    const task = normalise(data.task ?? data);
    set(s => ({ tasks: s.tasks.map(t => t._id === taskId ? task : t) }));
    return task;
  },

  delete: async (wid, pid, taskId) => {
    set(s => ({ tasks: s.tasks.filter(t => t._id !== taskId) }));
    await tasksApi.delete(wid, pid, taskId);
  },

  // Socket listeners — event names match backend exactly (underscores)
  bindSocket: () => {
    socket.on('task_moved', ({ taskId, status }) =>
      set(s => ({ tasks: s.tasks.map(t =>
        t._id === taskId ? { ...t, status: STATUS_MAP[status] || status } : t
      )}))
    );
    socket.on('task_updated', (updated) =>
      set(s => ({ tasks: s.tasks.map(t => t._id === updated._id ? normalise(updated) : t) }))
    );
    socket.on('task_created', (task) =>
      set(s => ({ tasks: [normalise(task), ...s.tasks] }))
    );
    socket.on('task_deleted', (taskId) =>
      set(s => ({ tasks: s.tasks.filter(t => t._id !== taskId) }))
    );
  },

  unbindSocket: () => {
    socket.off('task_moved');
    socket.off('task_updated');
    socket.off('task_created');
    socket.off('task_deleted');
  },

  reset: () => set({ tasks: [], loading: false }),
}));
