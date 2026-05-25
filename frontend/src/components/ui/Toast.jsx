// components/ui/Toast.jsx
import { useUI } from '../../store/ui';
import s from '../../styles/modules/Toast.module.css';

const icons = { info: 'ℹ', success: '✓', error: '✕', warning: '⚠' };

export default function ToastStack() {
  const { toasts, dismissToast } = useUI();
  return (
    <div className={s.stack} aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`${s.toast} ${s[t.type]}`}>
          <span className={s.icon}>{icons[t.type]}</span>
          <span className={s.msg}>{t.msg}</span>
          <button className={s.x} onClick={() => dismissToast(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
