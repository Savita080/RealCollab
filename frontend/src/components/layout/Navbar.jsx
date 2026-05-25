// components/layout/Navbar.jsx
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import { Avatar } from '../ui/Badge';
import { useClickOutside } from '../../lib/hooks';
import NotificationDropdown from './NotificationDropdown';
import s from '../../styles/modules/Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useUI();
  const { current: ws, workspaces, setWorkspace } = useWorkspace();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  useClickOutside(userRef, () => setUserOpen(false));

  return (
    <header className={s.bar}>
      {/* Brand */}
      <Link to="/dashboard" className={s.brand}>
        <span className={s.logo}>RC</span>
        <span className={s.wordmark}>RealCollab</span>
      </Link>

      {/* Workspace selector */}
      {ws && (
        <select
          className={s.wsSelect}
          value={ws._id}
          onChange={e => setWorkspace(e.target.value)}
          aria-label="Switch workspace"
        >
          {workspaces.map(w => (
            <option key={w._id} value={w._id}>{w.name}</option>
          ))}
        </select>
      )}

      <div className={s.right}>
        {/* Notification bell */}
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

        {/* User menu */}
        <div className={s.userWrap} ref={userRef}>
          <button className={s.userBtn} onClick={() => setUserOpen(o => !o)}>
            <Avatar name={user?.name || 'U'} size={30} />
          </button>
          {userOpen && (
            <div className={s.dropdown}>
              <div className={s.userInfo}>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <hr className={s.sep} />
              <Link to="/dashboard" className={s.item} onClick={() => setUserOpen(false)}>Dashboard</Link>
              <Link to="/profile"   className={s.item} onClick={() => setUserOpen(false)}>My Profile</Link>
              <Link to="/subscribe" className={s.item} onClick={() => setUserOpen(false)}>Subscription</Link>
              <hr className={s.sep} />
              <button className={s.item} onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
