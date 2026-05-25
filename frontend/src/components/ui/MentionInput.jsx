// components/ui/MentionInput.jsx — text input with @mention autocomplete
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import s from '../../styles/modules/MentionInput.module.css';

/**
 * Props:
 *  - value, onChange (controlled)
 *  - members: [{ user: { _id, name, avatar } }] from workspace.members or project.members
 *  - placeholder, disabled, autoFocus, className, onKeyDown
 *  - as: 'input' | 'textarea' (default 'input')
 *  - inputClassName: classes applied to the input element itself
 */
export default function MentionInput({
  value,
  onChange,
  members = [],
  placeholder,
  disabled,
  autoFocus,
  className,
  inputClassName,
  onKeyDown,
  as = 'input',
  ...rest
}) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [anchor, setAnchor] = useState(null); // index of '@' in value
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 200, flipUp: false });

  // Normalize member list: members may be [{user: {...}}] OR [{_id, name, ...}]
  const memberList = (members || []).map(m => m?.user || m).filter(u => u?._id && u?.name);

  const filtered = memberList
    .filter(u => !query || u.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  // Reset index when filter changes
  useEffect(() => { setActiveIdx(0); }, [query, open]);

  // Keep menu glued to the input when the user scrolls / resizes while it's open.
  // (Capture-phase listener catches scroll on any ancestor, including the modal panel.)
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // If the input has scrolled out of view, close the menu
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const menuHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = spaceBelow < menuHeight && rect.top > menuHeight;
      setMenuPos({
        top: flipUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
        flipUp,
      });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const closeMenu = () => { setOpen(false); setAnchor(null); setQuery(''); };

  const detectMention = (text, caret) => {
    // Walk back from caret looking for '@' before whitespace.
    // The '@' must be at start of string OR preceded by whitespace.
    for (let i = caret - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === '@') {
        const prev = i === 0 ? ' ' : text[i - 1];
        if (/\s/.test(prev)) {
          const q = text.slice(i + 1, caret);
          // Stop if query contains whitespace (mention ended)
          if (/\s/.test(q)) return null;
          return { anchor: i, query: q };
        }
        return null;
      }
      if (/\s/.test(ch)) return null;
    }
    return null;
  };

  const handleInput = (e) => {
    const text = e.target.value;
    onChange(e);
    const caret = e.target.selectionStart ?? text.length;
    const m = detectMention(text, caret);
    if (m) {
      // position:fixed is viewport-relative, so use getBoundingClientRect directly
      // (do NOT add scrollY/scrollX — that would push the menu off-screen when scrolled)
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const menuHeight = 240; // estimated max menu height
        const spaceBelow = window.innerHeight - rect.bottom;
        const flipUp = spaceBelow < menuHeight && rect.top > menuHeight;
        setMenuPos({
          top: flipUp ? rect.top - 4 : rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 220),
          flipUp,
        });
      }
      setOpen(true);
      setAnchor(m.anchor);
      setQuery(m.query);
    } else {
      closeMenu();
    }
  };

  const insertMention = useCallback((user) => {
    const el = inputRef.current;
    if (!el || anchor == null) return;
    const text = value;
    const caret = el.selectionStart ?? text.length;
    // Replace the range [anchor, caret) with `@FullName `
    const before = text.slice(0, anchor);
    const after = text.slice(caret);
    // Mention token (no spaces — backend regex captures \w/.- only). Replace spaces with non-breaking? No — backend supports [\w.-], so collapse to underscore-free single token by replacing spaces with no separator? Better: keep first word (matches existing comment behavior).
    const firstWord = user.name.split(/\s+/)[0];
    const insertion = `@${firstWord} `;
    const next = before + insertion + after;
    // Build a synthetic event so parent's onChange handler updates state
    const newCaret = (before + insertion).length;
    onChange({ target: { value: next, selectionStart: newCaret, selectionEnd: newCaret } });
    closeMenu();
    requestAnimationFrame(() => {
      el.focus();
      try { el.setSelectionRange(newCaret, newCaret); } catch (_) {}
    });
  }, [anchor, value, onChange]);

  const handleKeyDown = (e) => {
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % filtered.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => (i - 1 + filtered.length) % filtered.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[activeIdx]);
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    }
    onKeyDown?.(e);
  };

  const handleBlur = () => {
    // Delay so click on menu item still fires
    setTimeout(closeMenu, 120);
  };

  const InputEl = as === 'textarea' ? 'textarea' : 'input';

  return (
    <div className={`${s.wrap} ${className || ''}`}>
      <InputEl
        ref={inputRef}
        className={inputClassName || s.input}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        {...rest}
      />
      {open && filtered.length > 0 && createPortal(
        <ul
          className={s.menu}
          role="listbox"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            minWidth: menuPos.width,
            transform: menuPos.flipUp ? 'translateY(-100%)' : 'none',
          }}
        >
          {filtered.map((u, i) => (
            <li
              key={u._id}
              role="option"
              aria-selected={i === activeIdx}
              className={`${s.item} ${i === activeIdx ? s.active : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
            >
              <span className={s.avatar} aria-hidden>
                {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className={s.name}>{u.name}</span>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
