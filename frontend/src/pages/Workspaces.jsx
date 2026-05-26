// pages/Workspaces.jsx — Master dashboard showing all workspaces
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { workspaces as wsApi, notifications as notifApi } from '../lib/api';
import { Avatar } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import NotificationDropdown from '../components/layout/NotificationDropdown';
import s from '../styles/modules/Workspaces.module.css';

const ROLE_COLORS = { OWNER: 'var(--amber)', ADMIN: 'var(--indigo)', MEMBER: 'var(--green)', VIEWER: 'var(--text-3)' };

export default function Workspaces() {
  const { user, logout } = useAuth();
  const { toast, bindNotifications, unbindNotifications, setNotifications } = useUI();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    bindNotifications();
    notifApi.unread()
      .then(({ data }) => setNotifications(data.notifications ?? []))
      .catch(() => {});
    return () => unbindNotifications();
  }, []);

  useEffect(() => {
    setLoading(true);
    wsApi.list()
      .then(({ data }) => setWorkspaces(data.workspaces ?? data))
      .catch(() => toast('Failed to load workspaces', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setCreating(true);
    try {
      const { data } = await wsApi.create({ name: wsName.trim() });
      const ws = data.workspace ?? data;
      setWorkspaces(prev => [ws, ...prev]);
      setWsName('');
      setCreateModal(false);
      toast('Workspace created!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to create workspace', 'error');
    } finally { setCreating(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Determine user's role in each workspace
  const getMyRole = (ws) => {
    const uid = user?.id || user?._id;
    const m = ws.members?.find(m => (m.user?._id || m.user) === uid);
    return m?.role || 'MEMBER';
  };

  return (
    <div className={s.page}>
      {/* Top bar */}
      <div className={s.topBar}>
        <span className={s.logo}>DevCollab</span>
        <div className={s.topRight}>
          <NotificationDropdown />
          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <Avatar name={user?.name} size={32} />
          </Link>
          <button onClick={handleLogout} className={s.topRight} style={{
            background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13
          }}>
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={s.content}>
        <h1 className={s.heading}>Your Workspaces</h1>
        <p className={s.subheading}>Select a workspace or create a new one to get started.</p>

        {loading ? (
          <div className={s.grid}>
            {[1,2,3].map(i => (
              <div key={i} className={s.card} style={{ opacity: 0.3, pointerEvents: 'none' }}>
                <div className={s.cardName}>Loading…</div>
                <div className={s.cardMeta}>—</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.grid}>
            {workspaces.map(ws => {
              const role = getMyRole(ws);
              return (
                <Link to={`/workspaces/${ws._id}`} key={ws._id} className={s.card}>
                  <div className={s.cardName}>{ws.name}</div>
                  <div className={s.cardMeta}>
                    <span>{ws.members?.length ?? 0} members</span>
                    <span className={s.cardRole} style={{ background: ROLE_COLORS[role] }}>{role}</span>
                  </div>
                </Link>
              );
            })}
            <button className={s.createCard} onClick={() => setCreateModal(true)}>
              <span className={s.createIcon}>+</span>
              Create Workspace
            </button>
          </div>
        )}

        {!loading && workspaces.length === 0 && (
          <div className={s.empty}>
            <p>You're not a member of any workspace yet.</p>
            <Button variant="primary" size="md" onClick={() => setCreateModal(true)} style={{ marginTop: 16 }}>
              Create Your First Workspace
            </Button>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Workspace" size="sm">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Workspace name"
            placeholder="My Awesome Team"
            value={wsName}
            onChange={e => setWsName(e.target.value)}
            autoFocus
          />
          <Button type="submit" variant="primary" size="md" disabled={creating || !wsName.trim()}>
            {creating ? 'Creating…' : 'Create Workspace'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
