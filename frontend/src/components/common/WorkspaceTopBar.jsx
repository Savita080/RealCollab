// components/common/WorkspaceTopBar.jsx — top navbar inside WorkspaceLayout
import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, Search, X, ChevronRight, Settings as SettingsIcon, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import { Avatar } from '../ui/Badge';
import { useClickOutside } from '../../lib/hooks';
import NotificationDropdown from '../layout/NotificationDropdown';
import ProfileCardBadge from '../layout/ProfileCardBadge';
import ThemeQuickPick from '../layout/ThemeQuickPick';
import s from '../../styles/modules/WorkspaceTopBar.module.css';

const SEGMENT_LABELS = {
  projects: 'Projects',
  chat: 'Chat',
  members: 'Members',
  activity: 'Activity',
  settings: 'Settings',
  billing: 'Billing',
  kanban: 'Kanban',
  wiki: 'Wiki',
  snippets: 'Snippets',
  whiteboards: 'Whiteboards',
  whiteboard: 'Whiteboard',
  ai: 'AI Assistant',
  overview: 'Overview',
  invite: 'Invite',
};

export default function WorkspaceTopBar({ workspace, role }) {
  const { user, logout } = useAuth();
  const { unreadCount, sidebarOpen, toggleSidebar } = useUI();
  const { currentProject } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState('');
  const userRef = useRef(null);
  const notifRef = useRef(null);
  useClickOutside(userRef, () => setUserOpen(false));
  useClickOutside(notifRef, () => setNotifOpen(false));

  const toggleNotif = () => {
    setNotifOpen(o => {
      const next = !o;
      if (next) setUserOpen(false);
      return next;
    });
  };

  const toggleUser = () => {
    setUserOpen(o => {
      const next = !o;
      if (next) setNotifOpen(false);
      return next;
    });
  };

  // Build breadcrumbs from URL segments
  const segs = location.pathname.split('/').filter(Boolean);
  const crumbs = [];
  if (segs[0] === 'workspaces') {
    crumbs.push({ label: 'Workspaces', to: '/workspaces' });
    if (workspaceId) {
      crumbs.push({ label: workspace?.name || 'Workspace', to: `/workspaces/${workspaceId}` });
      // Detect projects branch
      const projIdx = segs.indexOf('projects');
      if (projIdx === 2 && segs.length === 3) {
        crumbs.push({ label: 'Projects', to: `/workspaces/${workspaceId}/projects` });
      } else if (projIdx === 2 && projectId) {
        crumbs.push({ label: 'Projects', to: `/workspaces/${workspaceId}/projects` });
        crumbs.push({ label: currentProject?.name || 'Project', to: `/workspaces/${workspaceId}/projects/${projectId}` });
        const sub = segs[5];
        if (sub) crumbs.push({ label: SEGMENT_LABELS[sub] || sub, to: location.pathname });
      } else if (projIdx === -1 && segs[2]) {
        crumbs.push({ label: SEGMENT_LABELS[segs[2]] || segs[2], to: location.pathname });
      }
    }
  }

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (!search.trim() || !workspaceId) return;
    navigate(`/workspaces/${workspaceId}/projects?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className={s.bar}>
      <button className={s.toggleBtn} onClick={toggleSidebar} title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
        <Menu size={16} />
      </button>

      {/* Breadcrumbs */}
      <nav className={s.crumbs}>
        {crumbs.map((c, i) => (
          <span key={i} className={s.crumbItem}>
            {i > 0 && <ChevronRight size={12} className={s.crumbSep} />}
            {i === crumbs.length - 1 ? (
              <span className={s.crumbActive}>{c.label}</span>
            ) : (
              <Link to={c.to} className={s.crumbLink}>{c.label}</Link>
            )}
          </span>
        ))}
      </nav>

      {/* Search */}
      <form className={s.searchWrap} onSubmit={onSearchSubmit}>
        <Search size={14} className={s.searchIcon} />
        <input
          className={s.search}
          placeholder="Search projects, tasks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className={s.clearBtn} onClick={() => setSearch('')}>
            <X size={12} />
          </button>
        )}
      </form>

      {/* Right controls */}
      <div className={s.right}>
        {(() => {
          const isPro = user?.subscription?.plan === 'PRO';
          return (
            <Link
              to="/subscribe"
              className={`${s.planPill} ${isPro ? s.planPillPro : s.planPillFree}`}
              title={isPro ? 'PRO plan — manage subscription' : 'FREE plan — upgrade to PRO'}
            >
              {isPro ? '✦ PRO' : 'FREE'}
            </Link>
          );
        })()}

        <div className={s.notifWrap} ref={notifRef}>
          <button
            className={s.iconBtn}
            onClick={toggleNotif}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className={s.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        <ThemeQuickPick />

        <div className={s.userWrap} ref={userRef}>
          <button className={s.userBtn} onClick={toggleUser}>
            <Avatar name={user?.name || 'U'} src={user?.avatar} size={28} />
          </button>
          {userOpen && (
            <ProfileCardBadge
              user={user}
              onClose={() => setUserOpen(false)}
              onLogout={logout}
              style={{ top: 'calc(100% + 10px)', right: '0' }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
