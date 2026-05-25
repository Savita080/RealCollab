// pages/workspace/Workspaces.jsx — landing/master after login: list all workspaces
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, FolderKanban, Sparkles, ArrowRight, LogOut } from 'lucide-react';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { workspaces as wsApi, projects as projApi, notifications as notifApi } from '../../lib/api';
import { Avatar } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import s from '../../styles/modules/Workspaces.module.css';

const WS_GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#06b6d4', '#3b82f6'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#ef4444'],
  ['#ec4899', '#8b5cf6'],
  ['#8b5cf6', '#ec4899'],
];

export default function Workspaces() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { workspaces: wsList, fetchWorkspaces, createWorkspace } = useWorkspace();
  const { bindNotifications, unbindNotifications, setNotifications } = useUI();

  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkspaces().finally(() => setLoading(false));
    bindNotifications();
    notifApi.unread()
      .then(({ data }) => setNotifications(data.notifications ?? data ?? []))
      .catch(() => {});
    return () => unbindNotifications();
  }, []);

  // Load stats per workspace (members + project counts) — fire-and-forget
  useEffect(() => {
    wsList.forEach(async (w) => {
      try {
        const [m, p] = await Promise.all([
          wsApi.members(w._id).catch(() => ({ data: { members: [] } })),
          projApi.list(w._id).catch(() => ({ data: { projects: [] } })),
        ]);
        const members = m.data.members ?? m.data ?? [];
        const projects = p.data.projects ?? p.data ?? [];
        setStats(prev => ({
          ...prev,
          [w._id]: { members: members.length, projects: projects.length },
        }));
      } catch {
        setStats(prev => ({ ...prev, [w._id]: { members: 0, projects: 0 } }));
      }
    });
  }, [wsList.length]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await createWorkspace({ name: newName.trim() });
      setNewName('');
      setCreateOpen(false);
      navigate(`/workspaces/${ws._id}`);
    } finally { setCreating(false); }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className={s.page}>
      {/* Top bar */}
      <header className={s.topbar}>
        <div className={s.brand}>
          <span className={s.brandLogo}>RC</span>
          <span className={s.brandName}>REALCOLLAB</span>
        </div>
        <div className={s.userBox}>
          <Avatar name={user?.name || 'U'} size={32} />
          <div className={s.userText}>
            <div className={s.userName}>{user?.name}</div>
            <div className={s.userEmail}>{user?.email}</div>
          </div>
          <button className={s.iconBtn} onClick={logout} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <div className={s.hero}>
        <div className={s.heroLeft}>
          <div className={s.eyebrow}>YOUR WORKSPACES</div>
          <h1 className={s.title}>Welcome back, {firstName}.</h1>
          <p className={s.subtitle}>
            Pick a workspace to jump into your projects, or create a new one to start collaborating.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Workspace
        </Button>
      </div>

      {/* Workspaces grid */}
      <section className={s.grid}>
        {loading && wsList.length === 0 && (
          <>
            <Skeleton height={170} style={{ borderRadius: 16 }} />
            <Skeleton height={170} style={{ borderRadius: 16 }} />
            <Skeleton height={170} style={{ borderRadius: 16 }} />
          </>
        )}

        {!loading && wsList.length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>
              <Sparkles size={28} />
            </div>
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to start collaborating with your team.</p>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Create Workspace
            </Button>
          </div>
        )}

        {wsList.map((w, i) => {
          const grad = WS_GRADIENTS[i % WS_GRADIENTS.length];
          const st = stats[w._id];
          return (
            <button
              key={w._id}
              className={s.card}
              onClick={() => navigate(`/workspaces/${w._id}`)}
              style={{ '--accent-1': grad[0], '--accent-2': grad[1] }}
            >
              <div className={s.cardHead}>
                <div
                  className={s.cardAvatar}
                  style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
                >
                  {w.name[0]?.toUpperCase()}
                </div>
                <div className={s.cardArrow}>
                  <ArrowRight size={16} />
                </div>
              </div>
              <h3 className={s.cardName}>{w.name}</h3>
              <div className={s.cardStats}>
                <span className={s.stat}>
                  <Users size={12} />
                  {st ? `${st.members} member${st.members === 1 ? '' : 's'}` : '…'}
                </span>
                <span className={s.statDot}>·</span>
                <span className={s.stat}>
                  <FolderKanban size={12} />
                  {st ? `${st.projects} project${st.projects === 1 ? '' : 's'}` : '…'}
                </span>
              </div>
              <div className={s.cardFooter}>
                <span className={s.cardMeta}>Open workspace</span>
              </div>
            </button>
          );
        })}

        {!loading && wsList.length > 0 && (
          <button className={s.newCard} onClick={() => setCreateOpen(true)}>
            <Plus size={20} />
            <span>New Workspace</span>
          </button>
        )}
      </section>

      {/* Create modal */}
      {createOpen && (
        <div className={s.modalOverlay} onClick={() => setCreateOpen(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>Create Workspace</h3>
            <p className={s.modalDesc}>
              Workspaces let you group projects, members, and conversations together.
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Workspace name"
                placeholder="e.g. DevFusion Team"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                autoFocus
              />
              <div className={s.modalActions}>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" loading={creating}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
