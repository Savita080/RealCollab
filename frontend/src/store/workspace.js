// store/workspace.js
import { create } from 'zustand';
import { workspaces, projects } from '../lib/api';

export const useWorkspace = create((set, get) => ({
  workspaces: [],
  current: null,       // active workspace
  projects: [],
  currentProject: null,
  loading: false,

  fetchWorkspaces: async () => {
    set({ loading: true });
    const { data } = await workspaces.list();
    const list = data.workspaces ?? data;
    set({ workspaces: list, loading: false });
    const currentId = get().current?._id;
    const targetId = currentId && list.find(w => w._id === currentId) ? currentId : list[0]?._id;
    if (targetId) get().setWorkspace(targetId);
  },

  setWorkspace: async (id) => {
    const ws = get().workspaces.find(w => w._id === id);
    set({ current: ws });
    const { data } = await projects.list(id);
    const list = data.projects ?? data;
    set({ projects: list });
    if (list.length && !get().currentProject) set({ currentProject: list[0] });
  },

  setProject: (project) => set({ currentProject: project }),

  refreshProjects: async () => {
    const ws = get().current;
    if (!ws) return;
    const { data } = await projects.list(ws._id);
    const list = data.projects ?? data;
    set({ projects: list });
    // If currentProject is no longer in the list, clear it
    const current = get().currentProject;
    if (current && !list.find(p => p._id === current._id)) {
      set({ currentProject: list[0] || null });
    }
  },

  reset: () => set({ workspaces: [], current: null, projects: [], currentProject: null, loading: false }),

  createWorkspace: async (d) => {
    const { data } = await workspaces.create(d);
    const ws = data.workspace ?? data;
    set(s => ({ workspaces: [ws, ...s.workspaces], current: ws, projects: [], currentProject: null }));
    return ws;
  },

  createProject: async (d) => {
    const wid = get().current?._id;
    const { data } = await projects.create(wid, d);
    const proj = data.project ?? data;
    set(s => ({ projects: [proj, ...s.projects], currentProject: proj }));
    return proj;
  },
}));
