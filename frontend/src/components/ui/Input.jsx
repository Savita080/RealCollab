// components/ui/Input.jsx
import { cls } from '../../lib/utils';
import s from '../../styles/modules/Input.module.css';

export function Input({ label, error, icon, className, ...props }) {
  return (
    <label className={s.wrap}>
      {label && <span className={s.label}>{label}</span>}
      <span className={cls(s.field, error && s.err)}>
        {icon && <span className={s.ico}>{icon}</span>}
        <input className={cls(s.input, className)} {...props} />
      </span>
      {error && <span className={s.msg}>{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className, ...props }) {
  return (
    <label className={s.wrap}>
      {label && <span className={s.label}>{label}</span>}
      <textarea className={cls(s.input, s.ta, error && s.err, className)} {...props} />
      {error && <span className={s.msg}>{error}</span>}
    </label>
  );
}

export function Select({ label, error, options = [], className, children, ...props }) {
  // #region agent log (debug)
  fetch('http://127.0.0.1:7942/ingest/a4a06877-767b-4074-b736-7d5787786897', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2ee502' },
    body: JSON.stringify({
      sessionId: '2ee502',
      runId: 'pre-fix',
      hypothesisId: 'A',
      location: 'frontend/src/components/ui/Input.jsx:Select',
      message: 'Select render inputs',
      data: {
        label: label || null,
        optionsLen: Array.isArray(options) ? options.length : null,
        hasChildren: !!children,
        value: props.value ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return (
    <label className={s.wrap}>
      {label && <span className={s.label}>{label}</span>}
      <select className={cls(s.input, s.sel, error && s.err, className)} {...props}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
        {children}
      </select>
      {error && <span className={s.msg}>{error}</span>}
    </label>
  );
}
