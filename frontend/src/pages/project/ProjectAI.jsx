// pages/AIPanel.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useWorkspace } from '../../store/workspace';
import { ai as aiApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import Button from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import s from '../../styles/modules/AIPanel.module.css';

const PANELS = [
  { id: 'summary',  label: 'Progress Summary', icon: '◎', desc: 'AI reads all task statuses and gives a project health report.' },
  { id: 'blockers', label: 'Bottleneck Finder', icon: '⚠', desc: 'Identifies tasks stuck "In Progress" for too long.' },
  { id: 'standup',  label: 'Standup Report',    icon: '✦', desc: 'Generates a daily standup based on last 24h task movement.' },
  { id: 'plan',     label: 'Task Generator',    icon: '▦', desc: 'Breaks a feature description into subtasks automatically.' },
  { id: 'review',   label: 'Code Reviewer',     icon: '</>', desc: 'Paste code and get bug, performance, readability feedback.' },
];

const CODE_LANGS = ['python', 'java', 'javascript', 'c++', 'go'];

const REVIEW_CRITERIA = [
  { key: 'clean_code', label: 'Clean Code' },
  { key: 'syntax', label: 'Syntax' },
  { key: 'security', label: 'Security' },
  { key: 'readability', label: 'Readability' },
  { key: 'performance', label: 'Performance' },
  { key: 'robustness', label: 'Robustness' },
];

const DEFAULT_REVIEW_WEIGHTS = {
  clean_code: 17,
  syntax: 17,
  security: 17,
  readability: 17,
  performance: 16,
  robustness: 16,
};

import {
  StandupResult,
  BlockersResult,
  SummaryResult,
  ReviewResult,
  PlanResult,
  RawResult
} from '../../components/ai/AIResults';

// Map panel id → renderer
const RENDERERS = {
  standup:  StandupResult,
  blockers: BlockersResult,
  summary:  SummaryResult,
  review:   ReviewResult,
  plan:     PlanResult,
};

export default function ProjectAI() {
  const { canEdit, isContributor } = useOutletContext() || {};
  const { currentProject, current: currentWorkspace } = useWorkspace();
  const { toast, paywallModal } = useUI();
  const allowRun = canEdit && isContributor;
  const [active, setActive] = useState('summary');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLang, setCodeLang] = useState('javascript');
  const [reviewContext, setReviewContext] = useState('');
  const [reviewWeights, setReviewWeights] = useState(DEFAULT_REVIEW_WEIGHTS);
  const [planInput, setPlanInput] = useState('');

  const reviewWeightTotal = REVIEW_CRITERIA.reduce(
    (sum, { key }) => sum + (Number(reviewWeights[key]) || 0),
    0,
  );

  const buildReviewPayload = () => {
    const payload = {
      code: codeInput,
      language: codeLang,
      projectId: currentProject._id,
    };
    const trimmedContext = reviewContext.trim();
    if (trimmedContext) payload.context = trimmedContext;

    const weights = {};
    for (const { key } of REVIEW_CRITERIA) {
      const pct = Number(reviewWeights[key]);
      if (!Number.isNaN(pct) && pct > 0) weights[key] = pct / 100;
    }
    if (Object.keys(weights).length > 0) payload.weights = weights;
    return payload;
  };

  const run = async () => {
    if (!currentProject) {
      toast('Select a project first', 'error'); return;
    }
    if (!allowRun) {
      toast('Only project contributors can run AI tools.', 'error'); return;
    }
    // #region agent log
    fetch('http://127.0.0.1:7942/ingest/a4a06877-767b-4074-b736-7d5787786897',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bc313a'},body:JSON.stringify({sessionId:'bc313a',location:'AIPanel.jsx:run:start',message:'Run clicked',data:{active,hasProject:!!currentProject,hasWorkspace:!!currentWorkspace,workspaceId:currentWorkspace?._id??null},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    setLoading(true);
    setResult(null);
    try {
      let data;
      if (active === 'summary')  ({ data } = await aiApi.summarise(currentWorkspace._id, currentProject._id));
      if (active === 'blockers') ({ data } = await aiApi.blockers(currentWorkspace._id, currentProject._id));
      if (active === 'standup')  ({ data } = await aiApi.standup(currentWorkspace._id, currentProject._id));
      if (active === 'plan')     ({ data } = await aiApi.plan(currentWorkspace._id, currentProject._id, { featureDescription: planInput }));
      if (active === 'review')   ({ data } = await aiApi.review(buildReviewPayload()));
      // #region agent log
      fetch('http://127.0.0.1:7942/ingest/a4a06877-767b-4074-b736-7d5787786897',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bc313a'},body:JSON.stringify({sessionId:'bc313a',location:'AIPanel.jsx:run:success',message:'API success',data:{active,dataKeys:data&&typeof data==='object'?Object.keys(data):null,healthScoreType:data?.health_score!=null?typeof data.health_score:null,hasSummaryText:!!data?.summary_text,hasSummary:!!data?.summary},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      // #region agent log
      fetch('http://127.0.0.1:7942/ingest/a4a06877-767b-4074-b736-7d5787786897',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bc313a'},body:JSON.stringify({sessionId:'bc313a',location:'AIPanel.jsx:run:error',message:'API error',data:{active,status:err.response?.status,errorField:err.response?.data?.error,msg},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setResult({ _error: msg });
      toast('AI request failed', 'error');
    } finally { setLoading(false); }
  };

  const panel = PANELS.find(p => p.id === active);
  const Renderer = RENDERERS[active] || RawResult;

  // #region agent log
  if (result && active === 'summary') {
    fetch('http://127.0.0.1:7942/ingest/a4a06877-767b-4074-b736-7d5787786897',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bc313a'},body:JSON.stringify({sessionId:'bc313a',location:'AIPanel.jsx:render',message:'About to render summary result',data:{loading,hasError:!!result?._error,paywallOpen:!!paywallModal},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
  }
  // #endregion

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.mascotBadge}>
          <span className={s.octoIcon}>🐙</span>
          <div>
            <strong>Octo AI Panel</strong>
            <span>Powered by FastAPI microservices</span>
          </div>
          <span className={s.onlineDot} title="Service online" />
        </div>
        {currentProject && (
          <div className={s.projectBadge}>
            <span>◎</span> {currentProject.name}
          </div>
        )}
      </div>

      <div className={s.body}>
        {/* Panel selector */}
        <aside className={s.panels}>
          {PANELS.map(p => (
            <button
              key={p.id}
              className={`${s.panelBtn} ${active === p.id ? s.activePanel : ''}`}
              onClick={() => { setActive(p.id); setResult(null); }}
            >
              <span className={s.panelIcon}>{p.icon}</span>
              <div>
                <strong>{p.label}</strong>
                <span>{p.desc}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Output area */}
        <div className={s.output}>
          <div className={s.outputHeader}>
            <span className={s.panelTitle}>{panel?.icon} {panel?.label}</span>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={run}
              disabled={!allowRun}
              title={!allowRun ? 'Only project contributors can run AI tools' : undefined}
            >
              {loading ? 'Thinking…' : 'Run'}
            </Button>
          </div>
          {!allowRun && (
            <div className={s.placeholder} style={{ marginTop: 8, color: 'var(--status-warning)', fontSize: 12 }}>
              ⚠ Viewers can't run AI tools. Ask a contributor to run them for you.
            </div>
          )}

          {/* Extra inputs for specific panels */}
          {active === 'plan' && (
            <div className={s.extraInput}>
              <Input
                label="Feature description"
                placeholder="Build a real-time notification system with Redis pubsub"
                value={planInput}
                onChange={e => setPlanInput(e.target.value)}
              />
            </div>
          )}
          {active === 'review' && (
            <div className={s.extraInput}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Language"
                    value={codeLang}
                    onChange={e => setCodeLang(e.target.value)}
                    options={CODE_LANGS}
                  />
                </div>
              </div>
              <Textarea
                label="Code purpose (context)"
                placeholder="e.g. LeetCode two-sum solution for interview prep (≤50 words)"
                value={reviewContext}
                onChange={e => setReviewContext(e.target.value)}
                rows={2}
                maxLength={400}
              />
              <div className={s.weightsSection}>
                <div className={s.weightsHeader}>
                  <span className={s.sLabel}>Criteria weights (%)</span>
                  <span className={s.weightsTotal} data-warning={reviewWeightTotal !== 100 ? 'true' : undefined}>
                    Total: {reviewWeightTotal}%
                  </span>
                </div>
                <div className={s.weightsGrid}>
                  {REVIEW_CRITERIA.map(({ key, label }) => (
                    <Input
                      key={key}
                      label={label}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={reviewWeights[key]}
                      onChange={e => setReviewWeights(prev => ({
                        ...prev,
                        [key]: e.target.value === '' ? '' : Number(e.target.value),
                      }))}
                    />
                  ))}
                </div>
                <p className={s.weightsHint}>
                  Sent to the reviewer as 0–1 values (e.g. 20% → 0.2). Weights do not need to sum to 100.
                </p>
              </div>
              <textarea
                className={s.codeInput}
                placeholder="Paste your code here…"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                rows={8}
              />
            </div>
          )}

          <div className={s.resultBox}>
            {!result && !loading && (
              <div className={s.placeholder}>
                <span>✦</span>
                <p>Click "Run" to get {panel?.label?.toLowerCase()}.</p>
                {!currentProject && <p style={{ color: 'var(--status-warning)', fontSize: 12 }}>⚠ Select a project first</p>}
              </div>
            )}
            {loading && (
              <div className={s.thinking}>
                <span className={s.dots}>●●●</span>
                <span>Octo is thinking…</span>
              </div>
            )}
            {result && !loading && (
              result._error
                ? <div className={s.errorBox}>❌ {result._error}</div>
                : <Renderer data={result} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
