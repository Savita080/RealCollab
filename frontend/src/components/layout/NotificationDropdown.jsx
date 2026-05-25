// components/layout/NotificationDropdown.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../store/ui';
import { notifications as notifApi } from '../../lib/api';
import { fmtRelative } from '../../lib/utils';
import { useClickOutside } from '../../lib/hooks';
import s from '../../styles/modules/NotificationDropdown.module.css';

const TYPE_ICONS = { MENTION: '💬', PROJECT_ASSIGN: '📋', ROLE_CHANGE: '🔑' };

export default function NotificationDropdown({ onClose }) {
  const { notifications, setNotifications, clearUnread, bindNotifications, unbindNotifications } = useUI();
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, onClose);

  useEffect(() => {
    // Load unread notifications
    notifApi.unread().then(({ data }) => {
      setNotifications(data.notifications ?? data);
    }).catch(() => {});

    // Mark all as seen when dropdown opens (correct backend endpoint: PATCH /notifications/mark-read)
    notifApi.markAll().catch(() => {});
    clearUnread();

    bindNotifications();
    return () => unbindNotifications();
  }, []);

  const handleClick = (n) => {
    if (n.link) { navigate(n.link); onClose(); }
  };

  return (
    <div ref={ref} className={s.panel}>
      <div className={s.head}>
        <span>Notifications</span>
        <button className={s.all} onClick={() => notifApi.markAll().catch(() => {})}>Mark all read</button>
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

