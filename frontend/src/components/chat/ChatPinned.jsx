import React from 'react';
import { Pin } from 'lucide-react';

export default function ChatPinned({ messages, jumpToMessage }) {
  const pinned = messages.filter(m => m.pinned && !m.deletedAt);
  if (pinned.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '6px 12px', background: 'var(--bg-2, rgba(0,0,0,0.04))', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        <Pin size={11} /> Pinned ({pinned.length})
      </div>
      {pinned.slice(0, 3).map(p => (
        <button
          key={p._id}
          onClick={() => jumpToMessage(p._id)}
          style={{ background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-2)', fontSize: 12, padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title="Jump to message"
        >
          <strong style={{ marginRight: 6 }}>{p.sender?.name || 'Unknown'}:</strong>
          {p.content}
        </button>
      ))}
      {pinned.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>+{pinned.length - 3} more pinned</div>}
    </div>
  );
}
