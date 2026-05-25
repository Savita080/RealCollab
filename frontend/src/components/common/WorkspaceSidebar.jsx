// components/common/WorkspaceSidebar.jsx — workspace-scoped left nav
import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, MessageSquare, Users, Settings,
  Activity, CreditCard, Plus, ChevronDown, Check, LogOut, User as UserIcon,
} from 'lucide-react';
import { useWorkspace } from '../../store/workspace';
import { useAuth } from '../../store/auth';
import { Avatar } from '../ui/Badge';
import { Input } from '../ui/Input';
import Button from '../ui/Button';
import { useClickOutside } from '../../lib/hooks';
import s from '../../styles/modules/WorkspaceSidebar.module.css';

export default function WorkspaceSidebar({ role }) {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { workspaces: wsList, current, createWorkspace } = useWorkspace();
  const { user, logout } = useAuth();

  const [wsDropOpen, setWsDropOpen] = useState(false);
  const [wsModal, setWsModal] = useState(false);
  const [wsName, setWsName] = useState('');
  const [busy, setBusy] = useState(false);

  const dropRef = useRef(null);
  useClickOutside(dropRef, () => setWsDropOpen(false));

  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  const wsBase = `/workspaces/${workspaceId}`;
  const NAV = [
    { to: `${wsBase}`,          label: 'Overview',   icon: LayoutDashboard, end: true },
    { to: `${wsBase}/projects`, label: 'Projects',   icon: FolderKanban },
    { to: `${wsBase}/chat`,     label: 'Chat',       icon: MessageSquare },
    { to: `${wsBase}/activity`, label: 'Activity',   icon: Activity },
    { to: `${wsBase}/members`,  label: 'Members',    icon: Users },
  ];

  const SETTINGS_NAV = [
    { to: `${wsBase}/settings`, label: 'Settings',     icon: Settings, adminOnly: true },
    { to: `${wsBase}/billing`,  label: 'Billing',      icon: CreditCard, adminOnly: true },
  ];

  const handleCreateWs = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setBusy(true);
    try {
      const ws = await createWorkspace({ name: wsName.trim() });
      setWsName('');
      setWsModal(false);
      navigate(`/workspaces/${ws._id}`);
    } finally { setBusy(false); }
  };

  const wsName_ = current?.name || 'Loading…';
  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <>
      <aside className={s.sidebar}>
        {/* Brand */}
        <button className={s.brand} onClick={() => navigate('/workspaces')}>
          <span className={s.brandLogo}>RC</span>
          <span className={s.brandName}>REALCOLLAB</span>
        </button>

        {/* Workspace switcher */}
        <div className={s.wsSection} ref={dropRef}>
          <div className={s.wsLabel}>WORKSPACE</div>
          <button className={s.wsSelector} onClick={() => setWsDropOpen(o => !o)}>
            <span className={s.wsAvatar}>{wsName_[0]?.toUpperCase()}</span>
            <span className={s.wsName}>{wsName_}</span>
            <ChevronDown size={14} className={`${s.chev} ${wsDropOpen ? s.chevUp : ''}`} />
          </button>

          {wsDropOpen && (
            <div className={s.wsDrop}>
              {wsList.map(w => {
                const active = workspaceId === w._id;
                return (
                  <button
                    key={w._id}
                    className={`${s.wsOpt} ${active ? s.wsOptActive : ''}`}
                    onClick={() => { setWsDropOpen(false); navigate(`/workspaces/${w._id}`); }}
                  >
                    <span className={s.wsAvatarSm}>{w.name[0]?.toUpperCase()}</span>
                    <span className={s.wsOptName}>{w.name}</span>
                    {active && <Check size={12} className={s.wsOptCheck} />}
                  </button>
                );
              })}
              <button
                className={s.wsOptNew}
                onClick={() => { setWsDropOpen(false); setWsModal(true); }}
              >
                <Plus size={14} /> New Workspace
              </button>
              <button
                className={s.wsOptNew}
                onClick={() => { setWsDropOpen(false); navigate('/workspaces'); }}
              >
                All workspaces…
              </button>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className={s.navSection}>
          <div className={s.sectionLabel}>WORKSPACE</div>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
            >
              <span className={s.linkIcon}><n.icon size={16} /></span>
              <span className={s.linkLabel}>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Settings */}
        <nav className={s.navSection}>
          <div className={s.sectionLabel}>SETTINGS</div>
          {SETTINGS_NAV.filter(n => !n.adminOnly || isAdmin).map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
            >
              <span className={s.linkIcon}><n.icon size={16} /></span>
              <span className={s.linkLabel}>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={s.spacer} />

        {/* User footer */}
        <div className={s.userFoot}>
          <Avatar name={user?.name || 'U'} size={32} />
          <div className={s.userInfo}>
            <button className={s.userNameBtn} onClick={() => navigate('/profile')} title="Edit profile">
              {firstName}
            </button>
            <span className={s.userRole}>{role || 'Member'}</span>
          </div>
          <button className={s.logoutBtn} onClick={logout} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {wsModal && (
        <div className={s.modalOverlay} onClick={() => setWsModal(false)}>
          <div className={s.miniModal} onClick={e => e.stopPropagation()}>
            <h3 className={s.miniModalTitle}>Create Workspace</h3>
            <form onSubmit={handleCreateWs} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Workspace name" placeholder="DevFusion Team" value={wsName}
                onChange={e => setWsName(e.target.value)} required />
              <Button type="submit" variant="cyan" size="md" loading={busy}>Create Workspace</Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
