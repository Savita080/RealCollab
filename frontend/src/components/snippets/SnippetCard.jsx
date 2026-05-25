// components/snippets/SnippetCard.jsx
import { useState } from 'react';
import s from '../../styles/modules/SnippetCard.module.css';

const LANG_COLORS = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3776ab',
  go: '#00add8', rust: '#ce422b', java: '#ed8b00', bash: '#10b981',
};

export default function SnippetCard({ snippet, onDelete, onEdit, onAiReview }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div className={s.left}>
          <span className={s.lang} style={{ '--c': LANG_COLORS[snippet.language] || '#6366f1' }}>
            {snippet.language}
          </span>
          <h3 className={s.title}>{snippet.title}</h3>
        </div>
        <div className={s.actions}>
          <button className={s.btn} onClick={copy} title="Copy">{copied ? '✓' : '⎘'}</button>
          {onAiReview && <button className={s.btn} onClick={onAiReview} title="AI Review">✦</button>}
          {onEdit && <button className={s.btn} onClick={onEdit} title="Edit">✎</button>}
          <button className={s.btn} onClick={onDelete} title="Delete">✕</button>
        </div>
      </div>

      {snippet.description && <p className={s.desc}>{snippet.description}</p>}

      <pre className={s.code}><code>{snippet.code}</code></pre>

      {snippet.tags?.length > 0 && (
        <div className={s.tags}>
          {snippet.tags.map(t => <span key={t} className={s.tag}>{t}</span>)}
        </div>
      )}
    </div>
  );
}
