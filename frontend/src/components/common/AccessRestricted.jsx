// components/common/AccessRestricted.jsx
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import s from '../../styles/modules/AccessRestricted.module.css';

export default function AccessRestricted({ title = 'Access Restricted', message = "You don't have permission to view this resource.", onBack }) {
  const navigate = useNavigate();
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.iconCircle}>
          <Lock size={28} />
        </div>
        <h2 className={s.title}>{title}</h2>
        <p className={s.msg}>{message}</p>
        <Button variant="primary" size="md" onClick={onBack || (() => navigate(-1))}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
