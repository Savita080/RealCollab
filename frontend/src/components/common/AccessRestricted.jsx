// components/common/AccessRestricted.jsx
import s from '../../styles/modules/AccessRestricted.module.css';

export default function AccessRestricted({ message }) {
  return (
    <div className={s.container}>
      <div className={s.card}>
        <div className={s.icon}>🔒</div>
        <h2 className={s.title}>Access Restricted</h2>
        <p className={s.message}>
          {message || 'You are not a member of this project. Ask a project contributor or workspace admin to add you.'}
        </p>
      </div>
    </div>
  );
}
