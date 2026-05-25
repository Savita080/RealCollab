// components/layout/TopBar.jsx
import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { Avatar } from '../ui/Badge';
import { useClickOutside } from '../../lib/hooks';
import NotificationDropdown from './NotificationDropdown';
import s from '../../styles/modules/TopBar.module.css';

const PAGE_LABELS = {
  '/dashboard': 'DASHBOARD',
  '/kanban':    'KANBAN BOARD',
  '/snippets':  'CODE SNIPPETS',
  '/wiki':      'WIKI',
  '/ai':        'AI PANEL',
  '/members':   'MEMBERS',
  '/activity':  'ACTIVITY',
  '/collab':    'LIVE COLLAB',
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useUI();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState('');
  const userRef = useRef(null);
  useClickOutside(userRef, () => setUserOpen(false));

  const pageLabel = PAGE_LABELS[location.pathname] || 'DASHBOARD';

  return (
    <header className={s.bar}>
      {/* Page breadcrumb */}
      <span className={s.crumb}>{pageLabel}</span>

      {/* Search */}
      <div className={s.searchWrap}>
        <SearchIcon />
        <input
          className={s.search}
          placeholder="Search tasks, snippets, docs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={s.clearBtn} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* Right controls */}
      <div className={s.right}>
        {/* Bell */}
        <button
          className={s.iconBtn}
          onClick={() => setNotifOpen(o => !o)}
          aria-label="Notifications"
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className={s.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}

        {/* Avatar */}
        <div className={s.userWrap} ref={userRef}>
          <button className={s.userBtn} onClick={() => setUserOpen(o => !o)}>
            <Avatar name={user?.name || 'U'} size={28} />
          </button>
          {userOpen && (
            <div className={s.dropdown}>
              <div className={s.userInfo}>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <hr className={s.sep} />
              <Link to="/dashboard" className={s.item} onClick={() => setUserOpen(false)}>Dashboard</Link>
              <Link to="/members"   className={s.item} onClick={() => setUserOpen(false)}>Members</Link>
              <button className={s.item} onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function BellIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
