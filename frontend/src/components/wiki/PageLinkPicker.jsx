import { useEffect } from 'react';
import { FileIcon } from './WikiIcons';
import s from '../../styles/modules/Wiki.module.css';

export default function PageLinkPicker({ pages, query, position, onSelect, onClose }) {
  const filtered = pages.filter(p =>
    p.title.toLowerCase().includes((query || '').toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!filtered.length) return null;

  return (
    <div
      className={s.pageLinkPicker}
      style={position ? { top: position.top, left: position.left } : {}}
    >
      <div className={s.pickerHeader}>Link to page</div>
      {filtered.map(pg => (
        <button key={pg._id} className={s.pickerItem} onClick={() => onSelect(pg)}>
          <FileIcon /> <span>{pg.title}</span>
        </button>
      ))}
    </div>
  );
}
