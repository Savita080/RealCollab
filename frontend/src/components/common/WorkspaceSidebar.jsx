// components/common/WorkspaceSidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { Avatar } from '../ui/Badge';
import s from '../../styles/modules/WorkspaceSidebar.module.css';

const ROLE_COLORS = { OWNER: '#f59e0b', ADMIN: '#6366f1', MEMBER: '#10b981', VIEWER: '#6b7280' };

const NAV_ITEMS = [
  { to: '',         label: 'Dashboard',  icon: '📊', end: true },
  { to: 'projects', label: 'Projects',   icon: '📁' },
  { to: 'chat',     label: 'Chat',       icon: '💬' },
  { to: 'members',  label: 'Members',    icon: '👥' },
];

const ADMIN_NAV = [
  { to: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function WorkspaceSidebar({ workspace, role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManage = role === 'OWNER' || role === 'ADMIN';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = canManage ? [...NAV_ITEMS, ...ADMIN_NAV] : NAV_ITEMS;

  return (
    <aside className={s.sidebar}>
      <div className={s.header}>
        <div className={s.wsName}>{workspace?.name || 'Workspace'}</div>
        {role && (
          <span className={s.roleBadge} style={{ background: ROLE_COLORS[role] || '#6b7280' }}>
            {role}
          </span>
        )}
      </div>

      <nav className={s.nav}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${s.navLink} ${isActive ? s.navLinkActive : ''}`
            }
          >
            <span className={s.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={s.footer}>
        <div className={s.footerUser}>
          <Avatar name={user?.name} size={28} />
          <span className={s.footerName}>{user?.name}</span>
        </div>
        <button className={s.logoutBtn} onClick={handleLogout} title="Logout">
          ⏻
        </button>
      </div>
    </aside>
  );
}
