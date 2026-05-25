// components/ui/NotificationPopup.jsx — corner popup that appears when a new notification arrives
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../store/ui';
import { Avatar } from './Badge';
import s from '../../styles/modules/NotificationPopup.module.css';

const TYPE_ICONS = { MENTION: '💬', PROJECT_ASSIGN: '📋', ROLE_CHANGE: '🔑' };
const TYPE_LABEL = { MENTION: 'New mention', PROJECT_ASSIGN: 'New assignment', ROLE_CHANGE: 'Role updated' };

// Routes that actually exist in App.jsx — prevents "throw to login" when an old
// notification has a stale link like /tasks/:id (which falls through to /).
const VALID_PREFIXES = ['/dashboard', '/kanban', '/snippets', '/wiki', '/activity', '/collab', '/ai', '/members', '/profile', '/subscribe'];
const isSafeLink = (l) => typeof l === 'string' && VALID_PREFIXES.some(p => l === p || l.startsWith(p + '?') || l.startsWith(p + '/'));

export default function NotificationPopupStack() {
  const { popups, dismissPopup, pausePopup, resumePopup } = useUI();
  const navigate = useNavigate();

  const handleClick = (n) => {
    if (isSafeLink(n.link)) navigate(n.link);
    dismissPopup(n._id || n.id);
  };

  return (
    <div className={s.stack} aria-live="polite">
      {popups.map((n) => (
        <div
          key={n._id || n.id}
          className={`${s.popup} ${isSafeLink(n.link) ? s.clickable : ''}`}
          onClick={() => handleClick(n)}
          onMouseEnter={() => pausePopup(n._id || n.id)}
          onMouseLeave={() => resumePopup(n._id || n.id)}
        >
          <div className={s.iconWrap}>
            {n.sender?.name ? (
              <Avatar name={n.sender.name} src={n.sender.avatar} size={36} />
            ) : (
              <span className={s.fallbackIcon}>{TYPE_ICONS[n.type] || '🔔'}</span>
            )}
            <span className={s.typeBadge}>{TYPE_ICONS[n.type] || '🔔'}</span>
          </div>
          <div className={s.body}>
            <div className={s.head}>
              <span className={s.label}>{TYPE_LABEL[n.type] || 'Notification'}</span>
              {n.link && !isSafeLink(n.link) && <span className={s.staleHint} title="This notification points to an old page that no longer exists">stale link</span>}
              <button
                className={s.x}
                onClick={(e) => { e.stopPropagation(); dismissPopup(n._id || n.id); }}
                aria-label="Dismiss"
              >✕</button>
            </div>
            <p className={s.content}>{n.content || n.message}</p>
            {isSafeLink(n.link) && <span className={s.cta}>Click to open →</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
