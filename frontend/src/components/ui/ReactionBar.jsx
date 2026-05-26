// components/ui/ReactionBar.jsx — Slack-style reaction chips under a message/comment.
// Props:
//  - reactions: [{ emoji, users: [userId | { _id }] }]
//  - currentUserId: my user id (used to highlight my reactions)
//  - onToggle(emoji): called when a chip is clicked OR when a new emoji is picked
//  - members: optional [{ user: {...} }] for nicer hover-tooltip names
import EmojiPickerButton from './EmojiPickerButton';
import s from '../../styles/modules/ReactionBar.module.css';

export default function ReactionBar({ reactions = [], currentUserId, onToggle, members = [] }) {
  const list = Array.isArray(reactions) ? reactions.filter(r => r?.emoji && r.users?.length > 0) : [];

  // Build a quick id -> name map so tooltips can show "Alice, Bob" instead of raw IDs
  const nameById = new Map();
  for (const m of members) {
    const u = m?.user || m;
    if (u?._id) nameById.set(u._id.toString(), u.name || 'Unknown');
  }

  const isMine = (entry) =>
    !!currentUserId && entry.users?.some(u => (u?._id || u)?.toString() === currentUserId.toString());

  const titleFor = (entry) => {
    const names = entry.users.slice(0, 6).map(u => {
      const id = (u?._id || u)?.toString();
      return nameById.get(id) || 'someone';
    });
    const extra = entry.users.length > names.length ? ` and ${entry.users.length - names.length} more` : '';
    return `${names.join(', ')}${extra} reacted with ${entry.emoji}`;
  };

  if (list.length === 0) {
    // Compact state — render only the picker button (parent decides whether to show it)
    return (
      <div className={s.bar}>
        <EmojiPickerButton
          className={`${s.chip} ${s.add}`}
          title="Add reaction"
          onSelect={onToggle}
        >
          <span aria-hidden>＋</span>
          <span style={{ fontSize: 12, marginLeft: 2 }}>😊</span>
        </EmojiPickerButton>
      </div>
    );
  }

  return (
    <div className={s.bar}>
      {list.map((r) => {
        const mine = isMine(r);
        return (
          <button
            key={r.emoji}
            type="button"
            className={`${s.chip} ${mine ? s.mine : ''}`}
            title={titleFor(r)}
            onClick={() => onToggle?.(r.emoji)}
          >
            <span className={s.emoji}>{r.emoji}</span>
            <span className={s.count}>{r.users.length}</span>
          </button>
        );
      })}
      <EmojiPickerButton
        className={`${s.chip} ${s.add}`}
        title="Add reaction"
        onSelect={onToggle}
      >
        <span aria-hidden>＋</span>
      </EmojiPickerButton>
    </div>
  );
}
