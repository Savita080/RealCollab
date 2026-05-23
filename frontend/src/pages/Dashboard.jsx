import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, LayoutDashboard, Activity, Loader2, X, ChevronRight, GitCommit, CheckSquare, Zap, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { getWorkspaces, createWorkspace, getProjects, createProject, getTasks, getProjectActivity } from "@/api/workspace";
import useAuthStore from "@/store/authStore";
import { cn } from "@/lib/utils";

// ── little fade-up wrapper used throughout ──────
function FadeUp({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── stat card ───────────────────────────────────
function StatCard({ label, value, icon: Icon, color, delay }) {
  return (
    <FadeUp delay={delay}>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex items-center gap-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-black text-white">{value ?? "—"}</p>
          <p className="text-xs text-white/40 mt-0.5">{label}</p>
        </div>
      </div>
    </FadeUp>
  );
}

// ── create workspace modal ──────────────────────
function CreateModal({ onClose, onCreate }) {
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Workspace name is required");
    setLoading(true);
    try {
      const response = await createWorkspace({ name, description });
      toast.success("Workspace created!");
      onCreate(response.workspace);
      onClose();
    } catch (err) {
      toast.error("Failed to create workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1424] p-6 shadow-[0_0_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">New Workspace</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-400 focus:shadow-[0_0_20px_rgba(167,139,250,0.15)] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Description <span className="normal-case text-white/25">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="What is this workspace for?"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-400 transition-all resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-cyan-500 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Create Workspace"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── create project modal ────────────────────────
function CreateProjectModal({ onClose, onCreate, workspaceId }) {
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Project name is required");
    setLoading(true);
    try {
      const response = await createProject(workspaceId, { name, description });
      toast.success("Project created!");
      onCreate(response.project);
      onClose();
    } catch (err) {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1424] p-6 shadow-[0_0_80px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">New Project</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-400 focus:shadow-[0_0_20px_rgba(167,139,250,0.15)] transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Description <span className="normal-case text-white/25">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-400 transition-all resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-cyan-500 hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Create Project"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── role badge ──────────────────────────────────
function RoleBadge({ role }) {
  const styles = {
    owner:  "bg-violet-500/15 text-violet-300 border-violet-500/20",
    admin:  "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
    member: "bg-white/5 text-white/50 border-white/10",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider", styles[role] || styles.member)}>
      {role}
    </span>
  );
}

// ── activity icon map ───────────────────────────
const activityIcon = {
  task:    { icon: CheckSquare, color: "text-cyan-400" },
  commit:  { icon: GitCommit,   color: "text-violet-400" },
  member:  { icon: Users,       color: "text-emerald-400" },
  default: { icon: Activity,    color: "text-white/40" },
};

// ── activity description format helpers ─────────
function getActivityMessage(item) {
  const userName = item.user?.name || "System";
  const targetName = item.targetName || "a resource";
  switch (item.action) {
    case "CREATED_TASK":
      return `${userName} created task "${targetName}"`;
    case "COMPLETED_TASK":
      return `${userName} completed task "${targetName}"`;
    case "DELETED_TASK":
      return `${userName} deleted task "${targetName}"`;
    case "UPDATED_TASK":
      return `${userName} updated task "${targetName}"`;
    case "JOINED_WORKSPACE":
      return `Workspace "${targetName}" is active. Welcome!`;
    default:
      return `${userName} performed ${item.action?.replace("_", " ") || "an action"} on "${targetName}"`;
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return "just now";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ── main component ──────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [workspaces, setWorkspaces]   = useState([]);
  const [projects, setProjects]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [activity, setActivity]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [activeWs, setActiveWs]       = useState(null); // selected workspace id

  // greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // load workspace details (projects, tasks, activities) and compute stats
  async function loadWorkspaceDetails(workspaceId, currentWorkspaces = workspaces) {
    setLoadingProjects(true);
    try {
      const workspace = currentWorkspaces.find(w => w._id === workspaceId);

      // 1. Fetch projects
      const projData = await getProjects(workspaceId);
      const projList = projData.projects || [];

      // 2. Fetch tasks and activities for each project in parallel
      const details = await Promise.all(
        projList.map(async (project) => {
          let tasks = [];
          let activities = [];
          try {
            const tData = await getTasks(workspaceId, project._id);
            tasks = tData.tasks || [];
          } catch (err) {
            console.error(`Failed to fetch tasks for project ${project._id}`, err);
          }
          try {
            const aData = await getProjectActivity(workspaceId, project._id);
            activities = aData.activities || [];
          } catch (err) {
            console.error(`Failed to fetch activities for project ${project._id}`, err);
          }
          return { projectId: project._id, tasks, activities };
        })
      );

      // Color mapping & Emoji assignment for modular projects UI
      const colorPalette = [
        "rgba(139, 92, 246, 0.2)", // violet
        "rgba(6, 182, 212, 0.2)",  // cyan
        "rgba(16, 185, 129, 0.2)", // emerald
        "rgba(249, 115, 22, 0.2)", // orange
        "rgba(236, 72, 153, 0.2)", // pink
      ];

      const mappedProjects = projList.map((project, idx) => {
        const projDetails = details.find(d => d.projectId === project._id);
        const userRoleObj = workspace?.members?.find(m => m.user?._id === user?.id || m.user === user?.id);
        const userRole = userRoleObj?.role || "MEMBER";

        return {
          ...project,
          color: colorPalette[idx % colorPalette.length],
          emoji: ["📁", "🚀", "💡", "🛠️", "🎯", "🌐"][idx % 6],
          taskCount: projDetails?.tasks?.length || 0,
          memberCount: project.members?.length || 0,
          userRole: userRole.toLowerCase(),
          tasks: projDetails?.tasks || []
        };
      });

      setProjects(mappedProjects);

      // 3. Aggregate activity feed
      const allActivities = details.flatMap(d => d.activities);
      allActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      let displayActivities = allActivities;
      if (displayActivities.length === 0 && workspace) {
        displayActivities = [{
          _id: "welcome-activity",
          action: "JOINED_WORKSPACE",
          user: { name: "System" },
          targetName: workspace.name,
          createdAt: workspace.createdAt || new Date().toISOString()
        }];
      }
      setActivity(displayActivities);

      // 4. Compute workspace-wide stats
      const totalProjects = mappedProjects.length;
      const memberCount = workspace?.members?.length || 1;
      
      let tasksDone = 0;
      mappedProjects.forEach(p => {
        tasksDone += p.tasks.filter(t => t.status === "DONE").length;
      });

      let activeSprints = 0;
      mappedProjects.forEach(p => {
        const hasActiveTasks = p.tasks.some(t => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
        if (hasActiveTasks) activeSprints++;
      });

      setStats({
        totalProjects,
        memberCount,
        tasksDone,
        activeSprints
      });

    } catch (err) {
      console.error("Error loading workspace projects:", err);
      toast.error("Could not load workspace projects");
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    async function fetchAll() {
      try {
        const data = await getWorkspaces();
        const wsList = data.workspaces || [];
        setWorkspaces(wsList);
        if (wsList.length > 0) {
          const firstId = wsList[0]._id;
          setActiveWs(firstId);
          await loadWorkspaceDetails(firstId, wsList);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  async function switchWorkspace(id) {
    setActiveWs(id);
    await loadWorkspaceDetails(id);
  }

  const handleProjectCreated = (newProject) => {
    const mapped = {
      ...newProject,
      color: "rgba(139, 92, 246, 0.2)",
      emoji: "📁",
      taskCount: 0,
      memberCount: 0,
      userRole: "owner",
      tasks: []
    };
    setProjects(prev => [...prev, mapped]);
    setStats(prev => ({
      ...prev,
      totalProjects: (prev?.totalProjects || 0) + 1
    }));
  };

  const statCards = [
    { label: "Projects",       value: stats?.totalProjects,  icon: LayoutDashboard, color: "bg-violet-500/20" },
    { label: "Tasks Done",     value: stats?.tasksDone,      icon: CheckSquare,     color: "bg-cyan-500/20" },
    { label: "Team Members",   value: stats?.memberCount,    icon: Users,           color: "bg-emerald-500/20" },
    { label: "Active Sprints", value: stats?.activeSprints,  icon: Zap,             color: "bg-orange-500/20" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* header */}
      <FadeUp>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/40">{greeting},</p>
            <h1 className="text-3xl font-black text-white tracking-tight mt-0.5">
              {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-sm text-white/35 mt-1">Here's what's happening across your workspaces.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-sm font-semibold text-white hover:brightness-110 transition-all"
          >
            <Plus size={15} /> New Workspace
          </button>
        </div>
      </FadeUp>

      {/* workspace tabs (if user has multiple) */}
      {workspaces.length > 1 && (
        <FadeUp delay={0.05}>
          <div className="flex gap-2 flex-wrap">
            {workspaces.map(ws => (
              <button
                key={ws._id}
                onClick={() => switchWorkspace(ws._id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                  activeWs === ws._id
                    ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                    : "bg-white/[0.03] border-white/[0.07] text-white/45 hover:text-white"
                )}
              >
                {ws.name}
              </button>
            ))}
          </div>
        </FadeUp>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={0.1 + i * 0.05} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* projects grid */}
        <div className="lg:col-span-2 space-y-4">
          <FadeUp delay={0.25}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Projects</h2>
              <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                View all <ChevronRight size={13} />
              </button>
            </div>
          </FadeUp>

          {workspaces.length === 0 ? (
            <FadeUp delay={0.3}>
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-white/30 text-sm">No workspaces yet.</p>
                <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                  Create your first workspace →
                </button>
              </div>
            </FadeUp>
          ) : loadingProjects ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((project, i) => (
                <FadeUp key={project._id} delay={0.3 + i * 0.05}>
                  <div
                    onClick={() => navigate(`/kanban/${project._id}`)}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 p-5 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: project.color || "rgba(139,92,246,0.2)" }}>
                        {project.emoji || "📁"}
                      </div>
                      <RoleBadge role={project.userRole} />
                    </div>
                    <p className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">{project.name}</p>
                    <p className="text-xs text-white/35 mt-1 line-clamp-1">{project.description || "No description"}</p>
                    <div className="mt-4 flex items-center gap-3 text-[11px] text-white/30">
                      <span className="flex items-center gap-1"><CheckSquare size={11} /> {project.taskCount || 0} tasks</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {project.memberCount || 0} members</span>
                    </div>
                  </div>
                </FadeUp>
              ))}

              {/* add project card */}
              <FadeUp delay={0.35}>
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="rounded-2xl border border-dashed border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 p-5 w-full h-full min-h-[140px] flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] group-hover:bg-violet-500/15 flex items-center justify-center transition-all">
                    <Plus size={16} className="text-white/30 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <p className="text-xs text-white/30 group-hover:text-white/50 transition-colors">New Project</p>
                </button>
              </FadeUp>
            </div>
          )}
        </div>

        {/* activity feed */}
        <div className="space-y-4">
          <FadeUp delay={0.3}>
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Recent Activity</h2>
          </FadeUp>

          <FadeUp delay={0.35}>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] divide-y divide-white/[0.05] overflow-hidden">
              {activity.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-white/25">No activity yet.</p>
                </div>
              ) : (
                activity.slice(0, 8).map((item, i) => {
                  let type = "default";
                  if (item.action?.includes("TASK")) {
                    type = "task";
                  } else if (item.action?.includes("MEMBER")) {
                    type = "member";
                  }
                  const { icon: Icon, color } = activityIcon[type] || activityIcon.default;
                  return (
                    <div key={item._id || i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <Icon size={13} className={cn("mt-0.5 flex-shrink-0", color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 leading-relaxed line-clamp-2">{getActivityMessage(item)}</p>
                        <p className="text-[10px] text-white/25 mt-0.5 flex items-center gap-1">
                          <Clock size={9} /> {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </FadeUp>
        </div>

      </div>

      {/* create workspace modal */}
      <AnimatePresence>
        {showModal && (
          <CreateModal
            onClose={() => setShowModal(false)}
            onCreate={ws => setWorkspaces(prev => [...prev, ws])}
          />
        )}
      </AnimatePresence>

      {/* create project modal */}
      <AnimatePresence>
        {showProjectModal && activeWs && (
          <CreateProjectModal
            workspaceId={activeWs}
            onClose={() => setShowProjectModal(false)}
            onCreate={handleProjectCreated}
          />
        )}
      </AnimatePresence>

    </div>
  );
}