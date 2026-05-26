// components/ui/ReplyControls.jsx — WhatsApp-style reply UI primitives shared across chat surfaces.
import s from '../../styles/modules/ReplyControls.module.css';

// Small icon shown on hover next to a message — clicking sets the parent's `replyingTo` state.
export function ReplyButton({ onClick, title = 'Reply' }) {
  return (
    <button
      type="button"
      className={s.replyBtn}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      ↩
    </button>
  );
}

// Quote chip rendered above a bubble when the message has a `replyTo`.
// Click → calls onJump(parentId) so the parent can scroll/highlight the original.
export function QuoteChip({ replyTo, mine, onJump }) {
  if (!replyTo) return null;
  // sender or author depending on the model — accept both shapes
  const name = replyTo.sender?.name || replyTo.author?.name || 'Unknown';
  const text = replyTo.content || '(deleted)';
  const id = replyTo._id;
  return (
    <button
      type="button"
      className={`${s.quote} ${mine ? s.quoteMine : ''}`}
      onClick={() => id && onJump?.(id)}
      title="Jump to original"
    >
      <span className={s.quoteName}>{name}</span>
      <span className={s.quoteText}>{text}</span>
    </button>
  );
}

// Banner shown above the composer when the user is composing a reply.
export function ReplyPreview({ replyingTo, onCancel }) {
  if (!replyingTo) return null;
  const name = replyingTo.sender?.name || replyingTo.author?.name || 'Unknown';
  const text = replyingTo.content || '';
  return (
    <div className={s.preview}>
      <div className={s.previewBar} />
      <div className={s.previewBody}>
        <span className={s.previewLabel}>Replying to <strong>{name}</strong></span>
        <span className={s.previewText}>{text}</span>
      </div>
      <button
        type="button"
        className={s.previewClose}
        onClick={onCancel}
        title="Cancel reply"
        aria-label="Cancel reply"
      >
        ✕
      </button>
    </div>
  );
}
