// components/layout/NotificationDropdown.jsx
import { useEffect, useRef } from 'react';
import { useUI } from '../../store/ui';
import { notifications as notifApi } from '../../lib/api';
import { fmtRelative } from '../../lib/utils';
import { useClickOutside } from '../../lib/hooks';
import s from './NotificationDropdown.module.css';

export default function NotificationDropdown({ onClose }) {
  const { notifications, setNotifications, clearUnread, bindNotifications, unbindNotifications } = useUI();
  const ref = useRef(null);
  useClickOutside(ref, onClose);

  useEffect(() => {
    notifApi.unread().then(({ data }) => {
      setNotifications(data.notifications ?? data);
      clearUnread();
    });
    bindNotifications();
    return () => unbindNotifications();
  }, []);

  const markRead = async (id) => {
    await notifApi.markRead(id);
    setNotifications(notifications.map(n => n._id === id ? { ...n, seen: true } : n));
  };

  return (
    <div ref={ref} className={s.panel}>
      <div className={s.head}>
        <span>Notifications</span>
        <button className={s.all} onClick={() => notifApi.markAll()}>Mark all read</button>
      </div>
      <div className={s.list}>
        {notifications.length === 0 && (
          <p className={s.empty}>All caught up ✓</p>
        )}
        {notifications.map(n => (
          <div
            key={n._id}
            className={`${s.item} ${!n.seen ? s.unread : ''}`}
            onClick={() => markRead(n._id)}
          >
            <div className={s.dot} />
            <div className={s.content}>
          <p className={s.msg}>{n.content || n.message}</p>
              <span className={s.time}>{fmtRelative(n.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
