// components/layout/ThemeQuickPick.jsx
// Topbar quick-pick: a palette icon button that opens a small swatch dropdown.
// Falls back to a portal so the dropdown can render above the header without
// being clipped by overflow: hidden ancestors.
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../store/theme';
import s from '../../styles/modules/ThemeQuickPick.module.css';

export default function ThemeQuickPick() {
  const { themes, current, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.target.closest?.('[data-theme-popover]')) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const popoverWidth = 240;
      const left = Math.max(8, Math.min(window.innerWidth - popoverWidth - 8, rect.right - popoverWidth));
      setPos({ top: rect.bottom + 8, left });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        className={s.btn}
        onClick={toggle}
        aria-label="Change theme"
        title="Change theme"
      >
        <PaletteIcon />
      </button>
      {open && createPortal(
        <div data-theme-popover className={s.popover} style={{ top: pos.top, left: pos.left }}>
          <div className={s.head}>Theme</div>
          {themes.map(t => {
            const active = t.id === current;
            return (
              <button
                key={t.id}
                className={`${s.row} ${active ? s.active : ''}`}
                onClick={() => { setTheme(t.id); setOpen(false); }}
              >
                <span className={s.swatch}>
                  {t.swatch.map((c, i) => (
                    <span key={i} className={s.dot} style={{ background: c }} />
                  ))}
                </span>
                <div className={s.meta}>
                  <strong className={s.name}>{t.name}</strong>
                  <span className={s.kind}>{t.kind}</span>
                </div>
                {active && <span className={s.check}>✓</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  );
}
