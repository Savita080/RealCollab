// components/layout/NotificationDropdown.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../store/ui';
import { notifications as notifApi } from '../../lib/api';
import { fmtRelative } from '../../lib/utils';
import { useClickOutside } from '../../lib/hooks';
import s from '../../styles/modules/NotificationDropdown.module.css';

const TYPE_ICONS = { MENTION: '💬', PROJECT_ASSIGN: '📋', ROLE_CHANGE: '🔑' };

const toRelative = (l) => {
  if (typeof l !== 'string') return l;
  try { return new URL(l).pathname + new URL(l).search; } catch { return l; }
};

export default function NotificationDropdown({ onClose }) {
  const { notifications, setNotifications, clearUnread } = useUI();
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, onClose);

  useEffect(() => {
    // Load unread notifications. Do NOT mark them as read here — notifications
    // should only disappear when the user clicks one or hits "Mark all read".
    notifApi.unread().then(({ data }) => {
      setNotifications(data.notifications ?? data);
    }).catch(() => {});
    // Note: socket listener is bound globally in AppShell — do NOT re-bind here.
  }, []);

  const handleClick = (n) => {
    // Mark this single notification as read on the server, then drop it from the list.
    if (n._id) {
      notifApi.markOne(n._id).catch(() => {});
      setNotifications(notifications.filter(x => x._id !== n._id));
    }
    if (n.link) { navigate(toRelative(n.link)); onClose(); }
  };

  const handleMarkAll = async () => {
    try { await notifApi.markAll(); } catch {}
    setNotifications([]);
    clearUnread();
  };

  return (
    <div ref={ref} className={s.panel}>
      <div className={s.head}>
        <span>Notifications</span>
        <button className={s.all} onClick={handleMarkAll}>Mark all read</button>
      </div>
      <div className={s.list}>
        {notifications.length === 0 && (
          <p className={s.empty}>All caught up ✓</p>
        )}
        {notifications.map(n => (
          <div
            key={n._id}
            className={`${s.item} ${!n.seen ? s.unread : ''}`}
            onClick={() => handleClick(n)}
            style={{ cursor: n.link ? 'pointer' : 'default' }}
          >
            <span className={s.typeIcon}>{TYPE_ICONS[n.type] || '🔔'}</span>
            <div className={s.content}>
              <p className={s.msg}>{n.content || n.message}</p>
              <span className={s.time}>{fmtRelative(n.createdAt)}</span>
            </div>
            {!n.seen && <div className={s.dot} />}
          </div>
        ))}
      </div>
    </div>
  );
}

