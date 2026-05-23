import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckSquare, Clock, ArrowLeft, Loader2, User, Tag, Calendar, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getWorkspaces, getProjects, getTasks } from "@/api/workspace";
import api from "@/api/workspace"; // Use axios client directly for task creation/updates

export default function Kanban() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [project, setProject]         = useState(null);
  const [tasks, setTasks]             = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetColumn, setTargetColumn] = useState("TODO");

  // Add Task Form States
  const [newTitle, setNewTitle]       = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [newPriority, setNewPriority] = useState("P2");
  const [adding, setAdding]           = useState(false);

  useEffect(() => {
    async function resolveProjectAndFetch() {
      setLoading(true);
      try {
        // 1. Fetch workspaces to find the workspace containing this project
        const wsData = await getWorkspaces();
        const wsList = wsData.workspaces || [];

        let resolvedWsId = null;
        let resolvedProj = null;

        for (const ws of wsList) {
          const projData = await getProjects(ws._id);
          const matchedProj = (projData.projects || []).find(p => p._id === projectId);
          if (matchedProj) {
            resolvedWsId = ws._id;
            resolvedProj = matchedProj;
            break;
          }
        }

        if (!resolvedWsId || !resolvedProj) {
          toast.error("Project or Workspace not found");
          navigate("/dashboard");
          return;
        }

        setWorkspaceId(resolvedWsId);
        setProject(resolvedProj);

        // 2. Fetch tasks for this project
        const taskData = await getTasks(resolvedWsId, projectId);
        setTasks(taskData.tasks || []);
      } catch (err) {
        console.error("Error resolving project tasks:", err);
        toast.error("Failed to load project board");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) resolveProjectAndFetch();
  }, [projectId]);

  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return toast.error("Task title is required");

    setAdding(true);
    try {
      // Backend: POST /api/workspaces/:workspaceId/projects/:projectId/tasks
      const { data } = await api.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        title: newTitle,
        description: newDesc,
        status: targetColumn,
        priority: newPriority
      });

      toast.success("Task created!");
      setTasks(prev => [...prev, data.task]);
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewPriority("P2");
    } catch (err) {
      toast.error("Failed to add task");
    } finally {
      setAdding(false);
    }
  }

  const columns = [
    { id: "TODO",        title: "To Do",       color: "border-t-cyan-400 bg-cyan-500/5 text-cyan-300" },
    { id: "IN_PROGRESS", title: "In Progress", color: "border-t-violet-400 bg-violet-500/5 text-violet-300" },
    { id: "IN_REVIEW",   title: "In Review",   color: "border-t-orange-400 bg-orange-500/5 text-orange-300" },
    { id: "DONE",        title: "Done",        color: "border-t-emerald-400 bg-emerald-500/5 text-emerald-300" }
  ];

  const getPriorityBadge = (priority) => {
    const badges = {
      P0: "bg-red-500/15 text-red-400 border-red-500/20",
      P1: "bg-orange-500/15 text-orange-400 border-orange-500/20",
      P2: "bg-white/5 text-white/40 border-white/10"
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border uppercase tracking-wider ${badges[priority] || badges.P2}`}>
        {priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/dashboard")} 
            className="w-9 h-9 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{project?.name}</h1>
            <p className="text-xs text-white/40 mt-0.5">{project?.description || "No description provided"}</p>
          </div>
        </div>
      </div>

      {/* Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div 
              key={col.id} 
              className={`rounded-2xl border-t-2 border border-white/[0.05] p-4 flex flex-col min-h-[500px] ${col.color}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{col.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">{colTasks.length}</span>
                </div>
                <button
                  onClick={() => {
                    setTargetColumn(col.id);
                    setShowAddModal(true);
                  }}
                  className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Task list inside column */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-center p-4">
                    <p className="text-[11px] text-white/20">No tasks here yet.</p>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <motion.div 
                      key={task._id}
                      layout
                      className="rounded-xl border border-white/[0.06] bg-[#0c1222] p-4 shadow-sm hover:border-white/10 transition-all space-y-3 group relative cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-white/80 line-clamp-2 leading-relaxed">{task.title}</span>
                        {getPriorityBadge(task.priority)}
                      </div>
                      
                      {task.description && (
                        <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between text-[9px] text-white/30 pt-1 border-t border-white/[0.03]">
                        <span className="flex items-center gap-1">
                          <Clock size={9} />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                        </span>
                        <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-[8px] font-bold text-white/60">
                          {task.assignee ? <User size={8} /> : "?"}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1424] p-6 shadow-[0_0_80px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Add Task to {columns.find(c => c.id === targetColumn)?.title}</h2>
                <button onClick={() => setShowAddModal(false)} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Task Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Design Landing Page"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Provide details about the task..."
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-400 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Priority</label>
                  <div className="flex gap-2">
                    {["P0", "P1", "P2"].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPriority(p)}
                        className={cn(
                          "flex-1 rounded-xl py-2.5 text-xs font-semibold border transition-all cursor-pointer",
                          newPriority === p
                            ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                            : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white"
                        )}
                      >
                        {p === "P0" ? "Critical (P0)" : p === "P1" ? "High (P1)" : "Normal (P2)"}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-cyan-500 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {adding ? <Loader2 size={15} className="animate-spin" /> : "Add Task"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
