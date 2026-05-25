// components/PaywallModal.jsx — global plan-limit modal
import { useUI } from '../store/ui';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../store/workspace';
import s from '../styles/modules/PaywallModal.module.css';

export default function PaywallModal() {
  const { paywallModal, closePaywall } = useUI();
  const { current: ws } = useWorkspace();
  const navigate = useNavigate();

  if (!paywallModal) return null;

  const isAI = paywallModal.error === 'AI quota exceeded';

  const handleUpgrade = () => {
    closePaywall();
    navigate('/subscribe');
  };

  return (
    <div className={s.overlay} onClick={closePaywall}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.icon}>{isAI ? '🤖' : '🚀'}</div>

        <h2 className={s.title}>
          {isAI ? 'AI Quota Reached' : 'Plan Limit Reached'}
        </h2>

        <p className={s.msg}>
          {paywallModal.message || (isAI
            ? 'You\'ve used all your AI requests for this month. Upgrade to PRO for 200 requests/month.'
            : 'Your workspace has reached its FREE plan limit. Upgrade to PRO for unlimited access.')}
        </p>

        <div className={s.planComparison}>
          <div className={s.planChip}>
            <span className={s.chipLabel}>FREE</span>
            <span>{isAI ? '10 AI req/mo' : '3 projects'}</span>
          </div>
          <span className={s.arrow}>→</span>
          <div className={`${s.planChip} ${s.pro}`}>
            <span className={s.chipLabel}>PRO</span>
            <span>{isAI ? '200 AI req/mo' : 'Unlimited'}</span>
          </div>
        </div>

        <div className={s.actions}>
          <button className={s.upgradeBtn} onClick={handleUpgrade}>
            ✦ Upgrade to PRO — ₹499/month
          </button>
          <button className={s.dismissBtn} onClick={closePaywall}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
