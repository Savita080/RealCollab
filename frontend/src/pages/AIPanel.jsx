// pages/AIPanel.jsx
import { useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { ai as aiApi } from '../lib/api';
import { useUI } from '../store/ui';
import Button from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import s from '../styles/modules/AIPanel.module.css';

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

// ── Structured result renderers per panel type ─────────────────────────────
const toSafeArray = (value) => (Array.isArray(value) ? value : []);

const toPercent = (value, min = 0, max = 100) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(min, Math.min(max, numeric));
};

const displayText = (value, keys = ['name', 'title', 'label', 'category', 'user_name']) => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    for (const key of keys) {
      if (value[key] != null) return String(value[key]);
    }
  }
  return '';
};

function StandupResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const { greeting, report_type, duration_ms } = data;
  const contributorReports = toSafeArray(data.contributor_reports);
  return (
    <div className={s.structured}>
      {greeting && <h3 className={s.greeting}>{greeting}</h3>}
      {report_type && <span className={s.reportType}>{report_type} report</span>}
      <div className={s.reportGrid}>
        {contributorReports.map((r, i) => {
          const pulseScore = toPercent(r.activity_pulse?.score);
          return (
        <div key={i} className={s.contribCard}>
          <h4 className={s.contribProject}>{r.project_name || r.contributor_name || `Contributor ${i + 1}`}</h4>
          {r.tasks_summary && (
            <div className={s.section}>
              <span className={s.sLabel}>📋 Tasks</span>
              <p className={s.markdownBlock}>{r.tasks_summary}</p>
            </div>
          )}
          {r.chat_summary && (
            <div className={s.section}>
              <span className={s.sLabel}>💬 Chat</span>
              <p className={s.markdownBlock}>{r.chat_summary}</p>
            </div>
          )}
          {r.wiki_summary && (
            <div className={s.section}>
              <span className={s.sLabel}>📄 Wiki</span>
              <p className={s.markdownBlock}>{r.wiki_summary}</p>
            </div>
          )}
          {r.activity_pulse && (
            <div className={s.pulseRow}>
              <span className={s.pulseScore}>{Math.round(pulseScore)}</span>
              <div className={s.pulseMeta}>
                <span className={s.sLabel}>Activity Pulse</span>
                <div className={s.pulseTrack}>
                  <div className={s.pulseFill} style={{ width: `${pulseScore}%` }} />
                </div>
                <div className={s.pulseChips}>
                  <span className={s.pulseMini}>💬 {r.activity_pulse.chat_count ?? 0}</span>
                  <span className={s.pulseMini}>📋 {r.activity_pulse.task_count ?? 0}</span>
                  <span className={s.pulseMini}>📄 {r.activity_pulse.wiki_count ?? 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
          );
        })}
      </div>
      {contributorReports.length === 0 && <p className={s.emptyResult}>No contributor reports in the latest standup payload.</p>}
      {duration_ms != null && <span className={s.durationBadge}>⏱ {duration_ms}ms</span>}
    </div>
  );
}

function BlockersResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const results = toSafeArray(data.results);
  const message = data.message;
  const total = data.total_active_tasks ?? 0;
  const stalled = data.stalled_tasks_count ?? results.length;
  return (
    <div className={s.structured}>
      <div className={s.statRow}>
        <span className={s.statChip}>{total} IN PROGRESS</span>
        <span className={s.statChip}>{stalled} STALLED</span>
      </div>
      {message && <p className={s.sText} style={{ marginTop: 8 }}>{message}</p>}
      {results.map((item, i) => (
        <div key={i} className={s.blockerCard}>
          <div className={s.blockerTitle}>{item.task_title || item.title || `Blocked task ${i + 1}`}</div>
          {item.ai_diagnosis && <p className={s.diagnosisText}>{item.ai_diagnosis}</p>}
          <div className={s.metaGrid}>
            {(item.duration_hours != null || item.stalled_duration_hours != null) && (
              <div className={s.metaItem}>
                <span className={s.metaKey}>Stalled</span>
                <span className={s.metaVal}>{item.duration_hours ?? item.stalled_duration_hours}h</span>
              </div>
            )}
            {(item.assignee_name || item.assignee) && (
              <div className={s.metaItem}>
                <span className={s.metaKey}>Assignee</span>
                <span className={s.metaVal}>
                  {displayText(item.assignee, ['name', 'user_name']) || item.assignee_name}
                </span>
              </div>
            )}
          </div>
          {toSafeArray(item.blocker_categories).length > 0 && (
            <div className={s.statRow}>
              {item.blocker_categories.map((cat, idx) => {
                const label = displayText(cat, ['category', 'name', 'label']) || `Category ${idx + 1}`;
                return (
                  <span key={`${label}-${idx}`} className={`${s.categoryChip} ${s.catBlocked}`}>{label}</span>
                );
              })}
            </div>
          )}
          {toSafeArray(item.mentioned_users).length > 0 && (
            <div className={s.statRow}>
              {item.mentioned_users.map((user, idx) => {
                const name = displayText(user, ['user_name', 'name', 'user_id']) || `user-${idx + 1}`;
                return (
                  <span key={`${name}-${idx}`} className={s.mentionChip}>@{name}</span>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {results.length === 0 && !message && <p className={s.emptyResult}>No bottlenecks detected 🎉</p>}
    </div>
  );
}

function SummaryResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;

  const project_name = data.project_name;
  const summaryText = data.summary_text ?? data.summary;
  const healthScore =
    typeof data.health_score === 'object' && data.health_score != null
      ? data.health_score.score
      : data.health_score;
  const healthBand =
    typeof data.health_score === 'object' && data.health_score != null
      ? data.health_score.band
      : null;
  const breakdown = data.task_breakdown;
  const insights = data.key_insights ?? data.recommendations ?? [];
  const dailyCompletions = toSafeArray(data.velocity?.daily_completions);
  const upcomingDeadlines = toSafeArray(data.upcoming_deadlines);
  const memberContributions = toSafeArray(data.member_contributions);
  const maxVelocity = Math.max(...dailyCompletions.map((v) => Number(v.count ?? v.value ?? 0)), 1);

  const statusChips = breakdown?.by_status
    ? Object.entries(breakdown.by_status).map(([status, info]) => (
        <span key={status} className={s.statChip}>
          {status}: {typeof info === 'object' && info != null ? info.count : info}
        </span>
      ))
    : null;

  const flatChips =
    breakdown && !breakdown.by_status
      ? Object.entries(breakdown)
          .filter(([, v]) => v == null || typeof v !== 'object')
          .map(([k, v]) => (
            <span key={k} className={s.statChip}>{k}: {v}</span>
          ))
      : null;

  return (
    <div className={s.structured}>
      {project_name && <h3 className={s.projName}>{project_name}</h3>}
      {healthScore != null && (
        <div className={s.healthBar}>
          <span className={s.sLabel}>Health Score{healthBand ? ` — ${healthBand}` : ''}</span>
          <div className={s.barTrack}>
            <div
              className={s.barFill}
              style={{
                width: `${healthScore}%`,
                background: `var(${healthScore > 70 ? '--status-success' : healthScore > 40 ? '--status-warning' : '--status-danger'})`,
              }}
            />
          </div>
          <span className={s.barVal}>{healthScore}%</span>
        </div>
      )}
      {summaryText && (
        <div className={s.section}>
          <span className={s.sLabel}>Summary</span>
          <p className={s.sText}>{summaryText}</p>
        </div>
      )}
      {(breakdown?.total != null || statusChips || flatChips?.length > 0) && (
        <div className={s.statRow}>
          {breakdown?.total != null && <span className={s.statChip}>total: {breakdown.total}</span>}
          {statusChips}
          {flatChips}
        </div>
      )}
      {insights.length > 0 && (
        <div className={s.section}>
          <span className={s.sLabel}>Insights</span>
          <ul className={s.recList}>
            {insights.map((item, i) => (
              <li key={i}>
                {typeof item === 'string'
                  ? item
                  : `${item.icon ? `${item.icon} ` : ''}${item.title || ''}${item.detail ? `: ${item.detail}` : ''}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {dailyCompletions.length > 0 && (
        <div className={s.section}>
          <span className={s.sLabel}>Velocity</span>
          <div className={s.velocityRow}>
            {dailyCompletions.map((entry, i) => {
              const value = Number(entry.count ?? entry.value ?? 0);
              const heightPct = Math.max(8, Math.round((value / maxVelocity) * 100));
              return (
                <div
                  key={`${entry.date ?? i}`}
                  className={s.velocityBar}
                  style={{ height: `${heightPct}%` }}
                  title={`${entry.date ?? `Day ${i + 1}`}: ${value}`}
                />
              );
            })}
          </div>
          <div className={s.velocityLabels}>
            {dailyCompletions.map((entry, i) => (
              <span key={`${entry.date ?? i}-label`}>{entry.date ? entry.date.slice(5) : i + 1}</span>
            ))}
          </div>
        </div>
      )}
      {upcomingDeadlines.length > 0 && (
        <div className={s.section}>
          <span className={s.sLabel}>Upcoming Deadlines</span>
          {upcomingDeadlines.map((deadline, i) => {
            const days = Number(deadline.days_remaining ?? deadline.days ?? 0);
            const urgencyClass = days < 0 ? s.overdue : days <= 3 ? s.dueSoon : s.dueSafe;
            return (
              <div key={`${deadline.title ?? deadline.task ?? i}`} className={s.deadlineItem}>
                <span className={s.deadlineTitle}>{deadline.title ?? deadline.task ?? `Deadline ${i + 1}`}</span>
                <span className={`${s.deadlineDays} ${urgencyClass}`}>
                  {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {memberContributions.length > 0 && (
        <div className={s.section}>
          <span className={s.sLabel}>Member Contributions</span>
          {memberContributions.map((member, i) => {
            const completed = Number(member.completed_tasks ?? member.completed ?? 0);
            const touched = Number(member.touched_tasks ?? member.total_tasks ?? completed);
            const ratio = touched > 0 ? Math.round((completed / touched) * 100) : 0;
            return (
              <div key={`${member.name ?? member.user ?? i}`} className={s.memberRow}>
                <span className={s.memberName}>{member.name ?? member.user ?? `Member ${i + 1}`}</span>
                <span className={s.memberStat}>{completed}/{touched} tasks</span>
                <div className={s.memberBar}>
                  <div className={s.memberBarFill} style={{ width: `${ratio}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!summaryText && !project_name && healthScore == null && (
        <pre className={s.result}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

function ReviewResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const weightedScore = data.weighted_score ?? data.overall_score;
  const agentResults = toSafeArray(data.agent_results);
  return (
    <div className={s.structured}>
      {weightedScore != null && (
        <div className={s.scoreHeader}>
          <span className={s.sLabel}>Weighted Score</span>
          <span className={s.bigScore}>{Number(weightedScore).toFixed(1)}</span>
        </div>
      )}
      <div className={s.agentGrid}>
        {agentResults.map((agent, i) => {
          const score = Number(agent.score ?? agent.weighted_score ?? 0);
          const scoreClass = score >= 80 ? s.agentScoreGood : score >= 60 ? s.agentScoreWarn : s.agentScoreBad;
          const issues = toSafeArray(agent.issues);
          const suggestions = toSafeArray(agent.suggestions);
          const isPerfect = score >= 100 && issues.length === 0 && suggestions.length === 0;
          return (
            <div key={`${agent.criteria ?? agent.name ?? i}`} className={s.agentCard}>
              <div className={s.agentHeader}>
                <span className={s.agentCriteria}>{agent.criteria ?? agent.name ?? `Criteria ${i + 1}`}</span>
                {agent.score != null && <span className={`${s.agentScore} ${scoreClass}`}>{score.toFixed(1)}</span>}
              </div>
              {agent.summary && (issues.length > 0 || suggestions.length > 0) && (
                <p className={s.agentSummary}>{agent.summary}</p>
              )}
              {issues.length > 0 && (
                <div className={s.section}>
                  <span className={s.sLabel}>Issues</span>
                  <ul className={s.issueList}>
                    {issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                  </ul>
                </div>
              )}
              {suggestions.length > 0 && (
                <div className={s.section}>
                  <span className={s.sLabel}>Suggestions</span>
                  <ul className={s.suggList}>
                    {suggestions.map((suggestion, idx) => <li key={idx}>{suggestion}</li>)}
                  </ul>
                </div>
              )}
              {issues.length === 0 && suggestions.length === 0 && (
                <p className={isPerfect ? s.agentClean : s.agentSummary}>
                  {agent.summary || (isPerfect
                    ? '✓ No issues found — excellent score.'
                    : 'No issues or suggestions for this criteria.')}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {weightedScore == null && agentResults.length === 0 && <pre className={s.result}>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

function PlanResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const featureTitle = data.feature_title ?? data.title;
  const tasks = data.tasks ?? data.subtasks ?? (Array.isArray(data) ? data : []);
  if (tasks.length === 0) return <pre className={s.result}>{JSON.stringify(data, null, 2)}</pre>;
  return (
    <div className={s.structured}>
      {featureTitle && <h3 className={s.featureTitle}>{featureTitle}</h3>}
      <ol className={s.planList}>
        {tasks.map((t, i) => (
          <li key={i} className={s.planItem}>
            <strong>{t.title || t.name || t}</strong>
            {t.description && <p className={s.sText}>{t.description}</p>}
            {(t.priority || toSafeArray(t.labels).length > 0) && (
              <div className={s.planMeta}>
                {t.priority && <span className={s.statChip}>{t.priority}</span>}
                {toSafeArray(t.labels).map((label) => (
                  <span key={`${t.title}-${label}`} className={s.labelChip}>{label}</span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RawResult({ data }) {
  return <pre className={s.result}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>;
}

// Map panel id → renderer
const RENDERERS = {
  standup:  StandupResult,
  blockers: BlockersResult,
  summary:  SummaryResult,
  review:   ReviewResult,
  plan:     PlanResult,
};

export default function AIPanel({ canEdit = true, isContributor = true } = {}) {
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
