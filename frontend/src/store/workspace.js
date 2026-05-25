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
    if (list.length && !get().current) get().setWorkspace(list[0]._id);
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
