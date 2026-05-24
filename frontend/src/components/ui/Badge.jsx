// components/ui/Badge.jsx
import { cls } from '../../lib/utils';
import s from './Badge.module.css';

export function Badge({ label, color, dot = false, className }) {
  return (
    <span className={cls(s.badge, className)} style={{ '--c': color }}>
      {dot && <span className={s.dot} />}
      {label}
    </span>
  );
}

// Avatar component
export function Avatar({ name = '?', src, size = 32, online = false }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = name.charCodeAt(0) * 137 % 360;
  return (
    <span className={s.avatar} style={{ '--sz': `${size}px`, '--hue': hue }}>
      {src
        ? <img src={src} alt={name} />
        : <span>{initials}</span>
      }
      {online && <span className={s.online} />}
    </span>
  );
}

// AvatarGroup - stacked presence indicators
export function AvatarGroup({ users = [], max = 4 }) {
  const shown = users.slice(0, max);
  const rest = users.length - max;
  return (
    <span className={s.group}>
      {shown.map(u => <Avatar key={u._id} name={u.name} src={u.avatar} online={u.online} size={28} />)}
      {rest > 0 && <span className={s.more}>+{rest}</span>}
    </span>
  );
}

// Priority chip
export function PriorityChip({ priority }) {
  const colors = { P0: '#ef4444', P1: '#f59e0b', P2: '#10b981' };
  return (
    <span className={s.chip} style={{ '--c': colors[priority] || '#6366f1' }}>
      {priority}
    </span>
  );
}
