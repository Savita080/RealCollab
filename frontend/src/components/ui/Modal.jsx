// components/ui/Modal.jsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../../lib/hooks';
import s from '../../styles/modules/Modal.module.css';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={s.overlay}>
      <div ref={ref} className={`${s.panel} ${s[size]}`}>
        <div className={s.header}>
          <h3 className={s.title}>{title}</h3>
          <button className={s.close} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
