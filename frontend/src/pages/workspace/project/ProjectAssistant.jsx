// pages/workspace/project/ProjectAssistant.jsx — AI panel adapted from AIPanel.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ai as aiApi } from '../../../lib/api';
import { useUI } from '../../../store/ui';
import Button from '../../../components/ui/Button';
import { Textarea, Select } from '../../../components/ui/Input';
import AiReviewResult from '../../../components/ai/AiReviewResult';
import s from '../../../styles/modules/AIPanel.module.css';

const LANGUAGES = ['python', 'java', 'javascript', 'c++', 'go'];

export default function ProjectAssistant() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, project } = ctx;
  const { toast } = useUI();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [warmingUp, setWarmingUp] = useState(false);

  // Code review state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [showReview, setShowReview] = useState(false);

  const callAI = async (action, apiFn, payload = {}) => {
    setLoading(true);
    setActiveAction(action);
    setResult(null);
    setWarmingUp(false);

    const warmTimer = setTimeout(() => setWarmingUp(true), 5000);

    try {
      const { data } = await apiFn;
      setResult(data);
    } catch (err) {
      toast(err?.response?.data?.message || 'AI request failed', 'error');
    } finally {
      clearTimeout(warmTimer);
      setLoading(false);
      setWarmingUp(false);
    }
  };

  return (
    <div className={s.page}>
      <h1 className={s.title}>AI Assistant</h1>
      <p className={s.subtitle}>{project?.name} — AI-powered insights</p>

      <div className={s.actions}>
        <button
          className={`${s.actionCard} ${activeAction === 'summary' ? s.actionActive : ''}`}
          onClick={() => callAI('summary', aiApi.summarise(workspaceId, projectId))}
          disabled={loading}
        >
          <span className={s.actionIcon}>📊</span>
          <span className={s.actionLabel}>Summarise Project</span>
        </button>

        <button
          className={`${s.actionCard} ${activeAction === 'blocker' ? s.actionActive : ''}`}
          onClick={() => callAI('blocker', aiApi.blockers(workspaceId, projectId))}
          disabled={loading}
        >
          <span className={s.actionIcon}>⚠️</span>
          <span className={s.actionLabel}>What's Blocking Us?</span>
        </button>

        <button
          className={`${s.actionCard} ${activeAction === 'standup' ? s.actionActive : ''}`}
          onClick={() => callAI('standup', aiApi.standup(workspaceId, projectId))}
          disabled={loading}
        >
          <span className={s.actionIcon}>📋</span>
          <span className={s.actionLabel}>Generate Standup</span>
        </button>

        <div className={`${s.actionCard} ${s.actionDisabled}`}>
          <span className={s.actionIcon}>🔮</span>
          <span className={s.actionLabel}>Break Down Feature</span>
          <span className={s.comingSoon}>Coming Soon</span>
        </div>

        <button
          className={`${s.actionCard} ${activeAction === 'review' ? s.actionActive : ''}`}
          onClick={() => setShowReview(!showReview)}
          disabled={loading}
        >
          <span className={s.actionIcon}>🔍</span>
          <span className={s.actionLabel}>Review Code</span>
        </button>
      </div>

      {/* Code review input */}
      {showReview && (
        <div className={s.reviewSection}>
          <Select label="Language" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Textarea
            label="Paste your code"
            value={code}
            onChange={e => setCode(e.target.value)}
            rows={10}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={loading || !code.trim()}
            onClick={() => callAI('review', aiApi.review({ code, language, projectId }))}
          >
            Review Code
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={s.resultCard}>
          <div className={s.spinner} />
          <p>{warmingUp ? '☕ Warming up AI service… (cold start can take 30-60s)' : 'Processing…'}</p>
        </div>
      )}

      {/* Result display */}
      {result && !loading && (
        <div className={s.resultCard}>
          <div className={s.resultHeader}>
            <span>AI Result</span>
            <button
              className={s.copyBtn}
              onClick={() => {
                navigator.clipboard.writeText(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
                toast('Copied to clipboard!', 'success');
              }}
            >
              📋 Copy
            </button>
          </div>
          {activeAction === 'review' ? (
            <div style={{ marginTop: 16 }}>
              <AiReviewResult data={result} />
            </div>
          ) : (
            <pre className={s.resultContent}>
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
