// components/common/ProjectSidebar.jsx — project-scoped left nav (slim)
import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, LayoutGrid, KanbanSquare, MessageSquare, FileText, Code2,
  Palette, Sparkles, Activity, Users, Settings, Folder, Plus,
} from 'lucide-react';
import { useWorkspace } from '../../store/workspace';
import s from '../../styles/modules/ProjectSidebar.module.css';

const PROJECT_COLORS = [
  '#6366f1', '#00d4ff', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4',
];

export default function ProjectSidebar({ project, canEdit }) {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const { projects } = useWorkspace();
  const [projDropOpen, setProjDropOpen] = useState(false);

  const projBase = `/workspaces/${workspaceId}/projects/${projectId}`;
  const NAV = [
    { to: `${projBase}`,             label: 'Overview',    icon: LayoutGrid, end: true },
    { to: `${projBase}/kanban`,      label: 'Kanban',      icon: KanbanSquare },
    { to: `${projBase}/chat`,        label: 'Chat',        icon: MessageSquare },
    { to: `${projBase}/wiki`,        label: 'Wiki',        icon: FileText },
    { to: `${projBase}/snippets`,    label: 'Snippets',    icon: Code2 },
    { to: `${projBase}/whiteboards`, label: 'Whiteboards', icon: Palette },
    { to: `${projBase}/ai`,          label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
    { to: `${projBase}/activity`,    label: 'Activity',    icon: Activity },
  ];

  const SETTINGS_NAV = [
    { to: `${projBase}/members`,  label: 'Members',  icon: Users },
    { to: `${projBase}/settings`, label: 'Settings', icon: Settings, editorOnly: true },
  ];

  const projIdx = projects.findIndex(p => p._id === projectId);
  const projColor = PROJECT_COLORS[projIdx % PROJECT_COLORS.length] || PROJECT_COLORS[0];

  return (
    <aside className={s.sidebar}>
      {/* Back to workspace */}
      <button className={s.back} onClick={() => navigate(`/workspaces/${workspaceId}`)}>
        <ArrowLeft size={14} />
        <span>Back to workspace</span>
      </button>

      {/* Project header / switcher */}
      <div className={s.projHead}>
        <button className={s.projHeadBtn} onClick={() => setProjDropOpen(o => !o)}>
          <span className={s.projDot} style={{ background: projColor }} />
          <div className={s.projHeadText}>
            <div className={s.projLabel}>PROJECT</div>
            <div className={s.projName}>{project?.name || 'Loading…'}</div>
          </div>
          <Folder size={14} className={s.projHeadChev} />
        </button>

        {projDropOpen && (
          <div className={s.projDrop}>
            {projects.map((p, i) => {
              const active = p._id === projectId;
              return (
                <button
                  key={p._id}
                  className={`${s.projOpt} ${active ? s.projOptActive : ''}`}
                  onClick={() => {
                    setProjDropOpen(false);
                    navigate(`/workspaces/${workspaceId}/projects/${p._id}`);
                  }}
                >
                  <span className={s.projOptDot} style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                  <span className={s.projOptName}>{p.name}</span>
                </button>
              );
            })}
            <button
              className={s.projOptNew}
              onClick={() => {
                setProjDropOpen(false);
                navigate(`/workspaces/${workspaceId}/projects`);
              }}
            >
              <Plus size={13} /> All projects
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
            {n.badge && <span className={s.badge}>{n.badge}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <nav className={s.navSection}>
        <div className={s.sectionLabel}>SETTINGS</div>
        {SETTINGS_NAV.filter(n => !n.editorOnly || canEdit).map(n => (
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

      {/* Footer */}
      <div className={s.foot}>
        <div className={s.footRole}>{canEdit ? 'Editor' : 'Viewer'}</div>
        <div className={s.footHint}>
          {canEdit ? 'You can create and edit content' : 'Read-only access'}
        </div>
      </div>
    </aside>
  );
}
