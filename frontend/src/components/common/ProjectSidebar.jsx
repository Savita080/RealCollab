// components/common/ProjectSidebar.jsx
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import s from '../../styles/modules/ProjectSidebar.module.css';

const NAV_ITEMS = [
  { to: '',            label: 'Overview',     icon: '📋', end: true },
  { to: 'kanban',      label: 'Kanban',       icon: '📌' },
  { to: 'chat',        label: 'Chat',         icon: '💬' },
  { to: 'snippets',    label: 'Snippets',     icon: '✂️' },
  { to: 'wiki',        label: 'Wiki',         icon: '📖' },
  { to: 'assistant',   label: 'AI Assistant', icon: '🤖' },
  { to: 'activity',    label: 'Activity',     icon: '📊' },
  { to: 'whiteboards', label: 'Whiteboards',  icon: '🖊' },
  { to: 'members',     label: 'Members',      icon: '👥' },
];

const EDIT_NAV = [
  { to: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function ProjectSidebar({ project, canEdit }) {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const items = canEdit ? [...NAV_ITEMS, ...EDIT_NAV] : NAV_ITEMS;

  return (
    <aside className={s.sidebar}>
      <button className={s.backBtn} onClick={() => navigate(`/workspaces/${workspaceId}`)}>
        ← Back to Workspace
      </button>
      <div className={s.header}>
        <div className={s.projName}>{project?.name || 'Project'}</div>
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
    </aside>
  );
}
