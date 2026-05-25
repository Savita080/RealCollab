// pages/Subscribe.jsx — Razorpay subscription management
import { useEffect, useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { subscriptions as subApi } from '../lib/api';
import Button from '../components/ui/Button';
import s from './Subscribe.module.css';

const FREE_LIMIT = 10;
const PRO_LIMIT = 200;

const FREE_FEATURES = [
  '3 projects',
  '10 AI requests / month',
  '5 workspace members',
  'Kanban, Wiki, Snippets',
  'Real-time collaboration',
];

const PRO_FEATURES = [
  'Unlimited projects',
  '200 AI requests / month',
  'Unlimited workspace members',
  'Everything in FREE',
  'Priority email support',
  'Advanced activity history',
];

export default function Subscribe() {
  const { current: ws } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useUI();

  const [status, setStatus]   = useState(null);  // { plan: 'FREE'|'PRO', aiRequestsUsed, ... }
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Fetch current subscription status
  useEffect(() => {
    if (!ws) return;
    setLoading(true);
    subApi.getStatus(ws._id)
      .then(({ data }) => setStatus(data))
      .catch(() => setStatus({ plan: 'FREE', aiRequestsUsed: 0 }))
      .finally(() => setLoading(false));
  }, [ws?._id]);

  const handleSubscribe = async () => {
    if (!ws) return;
    setSubLoading(true);
    try {
      // Step 1: Create Razorpay order
      const { data } = await subApi.subscribe(ws._id);
      const { orderId, amount, currency, key } = data;

      // Step 2: Load Razorpay SDK dynamically
      const loadRazorpay = () => new Promise(resolve => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast('Failed to load payment gateway', 'error');
        setSubLoading(false);
        return;
      }

      // Step 3: Open Razorpay checkout
      const rzp = new window.Razorpay({
        key,
        amount,
        currency,
        order_id: orderId,
        name: 'RealCollab',
        description: 'PRO Plan Subscription',
        prefill: { email: user?.email, name: user?.name },
        theme: { color: '#6366f1' },
        handler: async (response) => {
          // Step 4: Verify payment on backend
          try {
            await subApi.verify(ws._id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            });
            toast('🎉 Upgraded to PRO!', 'success');
            // Refresh status
            const { data: newStatus } = await subApi.getStatus(ws._id);
            setStatus(newStatus);
          } catch (err) {
            toast(err?.response?.data?.message || 'Payment verification failed', 'error');
          }
        },
        modal: {
          ondismiss: () => setSubLoading(false),
        },
      });
      rzp.open();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to initiate payment', 'error');
      setSubLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your PRO subscription? Your workspace will revert to the FREE plan.')) return;
    setCancelLoading(true);
    try {
      await subApi.cancel(ws._id);
      const { data: newStatus } = await subApi.getStatus(ws._id);
      setStatus(newStatus);
      toast('Subscription cancelled', 'info');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to cancel subscription', 'error');
    } finally { setCancelLoading(false); }
  };

  if (!ws) return <div className={s.loading}>Select a workspace to manage its subscription.</div>;

  const isPro  = status?.plan === 'PRO';
  const used   = status?.aiRequestsUsed ?? 0;
  const limit  = isPro ? PRO_LIMIT : FREE_LIMIT;
  const pct    = Math.min(100, Math.round(used / limit * 100));
  const isOwner = user?.role === 'OWNER' || user?.role === 'owner';

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Subscription</h1>
        <p className={s.subtitle}>Manage your {ws.name} workspace plan</p>
      </div>

      {/* Current plan status */}
      {loading ? (
        <div className={s.loading}>Loading plan info…</div>
      ) : (
        <div className={s.statusCard}>
          <div className={s.planLeft}>
            <span className={`${s.planBadge} ${isPro ? s.pro : s.free}`}>
              {isPro ? '✦ PRO' : '◈ FREE'}
            </span>
            <div className={s.planName}>{ws.name}</div>
            <div className={s.planDesc}>
              {isPro
                ? `Workspace plan: PRO — ${PRO_LIMIT} AI requests/month`
                : `Workspace plan: FREE — ${FREE_LIMIT} AI requests/month`}
            </div>
          </div>

          <div className={s.usageSection}>
            <span className={s.usageLabel}>AI Usage this month</span>
            <div className={s.barTrack}>
              <div
                className={s.barFill}
                style={{
                  width: `${pct}%`,
                  background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <span className={s.barVal}>{used} / {limit} requests used</span>
          </div>
        </div>
      )}

      {/* Plans comparison */}
      <div className={s.plansGrid}>
        {/* FREE plan */}
        <div className={`${s.planCard} ${!isPro ? s.current : ''}`}>
          <div className={s.planCardHeader}>
            <span className={s.planCardName}>FREE</span>
            <span className={s.planCardPrice}>₹0 <span>/ month</span></span>
          </div>
          <ul className={s.planFeatures}>
            {FREE_FEATURES.map(f => (
              <li key={f}><span>✓</span> {f}</li>
            ))}
          </ul>
          {!isPro && (
            <Button variant="ghost" size="sm" disabled>Current Plan</Button>
          )}
        </div>

        {/* PRO plan */}
        <div className={`${s.planCard} ${isPro ? s.current : s.recommended}`}>
          <div className={s.planCardHeader}>
            <div>
              <span className={s.planCardName}>PRO</span>
              {!isPro && <span className={s.planCardBadge}>RECOMMENDED</span>}
            </div>
            <span className={s.planCardPrice}>₹499 <span>/ month</span></span>
          </div>
          <ul className={s.planFeatures}>
            {PRO_FEATURES.map(f => (
              <li key={f}><span>✦</span> {f}</li>
            ))}
          </ul>
          {!isPro && isOwner && (
            <Button variant="cyan" size="md" loading={subLoading} onClick={handleSubscribe}>
              Upgrade to PRO ↗
            </Button>
          )}
          {!isPro && !isOwner && (
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Only the workspace OWNER can upgrade.</p>
          )}
          {isPro && isOwner && (
            <Button variant="ghost" size="sm" loading={cancelLoading} onClick={handleCancel}>
              Cancel Subscription
            </Button>
          )}
          {isPro && !isOwner && (
            <Button variant="ghost" size="sm" disabled>Active Plan</Button>
          )}
        </div>
      </div>
    </div>
  );
}
