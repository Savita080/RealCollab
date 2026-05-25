// pages/AIPanel.jsx
import { useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { ai as aiApi } from '../lib/api';
import { useUI } from '../store/ui';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import s from '../styles/modules/AIPanel.module.css';

const PANELS = [
  { id: 'summary',  label: 'Progress Summary', icon: '◎', desc: 'AI reads all task statuses and gives a project health report.' },
  { id: 'blockers', label: 'Bottleneck Finder', icon: '⚠', desc: 'Identifies tasks stuck "In Progress" for too long.' },
  { id: 'standup',  label: 'Standup Report',    icon: '✦', desc: 'Generates a daily standup based on last 24h task movement.' },
  { id: 'plan',     label: 'Task Generator',    icon: '▦', desc: 'Breaks a feature description into subtasks automatically.' },
  { id: 'review',   label: 'Code Reviewer',     icon: '</>', desc: 'Paste code and get bug, performance, readability feedback.' },
];

const CODE_LANGS = ['javascript', 'typescript', 'python', 'go', 'java', 'c++', 'rust', 'php', 'ruby', 'swift'];

// ── Structured result renderers per panel type ─────────────────────────────
function StandupResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const { done, today, blockers, summary } = data;
  return (
    <div className={s.structured}>
      {done && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#10b981' }}>✓ DONE</span>
          <p className={s.sText}>{done}</p>
        </div>
      )}
      {today && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#6366f1' }}>→ TODAY</span>
          <p className={s.sText}>{today}</p>
        </div>
      )}
      {blockers && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#f59e0b' }}>⚠ BLOCKERS</span>
          <p className={s.sText}>{blockers}</p>
        </div>
      )}
      {summary && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#00d4ff' }}>◎ SUMMARY</span>
          <p className={s.sText}>{summary}</p>
        </div>
      )}
    </div>
  );
}

function BlockersResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const results = data.results ?? data.bottlenecks ?? [];
  const message = data.message;
  const total = data.total_active_tasks ?? 0;
  const stalled = data.stalled_tasks_count ?? results.length;
  return (
    <div className={s.structured}>
      <div className={s.statRow}>
        <span className={s.statChip}>{total} IN PROGRESS</span>
        <span className={s.statChip} style={{ '--cc': '#f59e0b' }}>{stalled} STALLED</span>
      </div>
      {message && <p className={s.sText} style={{ marginTop: 8 }}>{message}</p>}
      {results.map((item, i) => (
        <div key={i} className={s.blockerCard}>
          <div className={s.blockerTitle}>{item.task_title || item.title}</div>
          {item.assignee && <span className={s.blockerMeta}>Assignee: {item.assignee}</span>}
          {item.reason && <p className={s.sText}>{item.reason}</p>}
          {item.suggestion && <p className={s.suggestion}>{item.suggestion}</p>}
        </div>
      ))}
      {results.length === 0 && !message && <p className={s.emptyResult}>No bottlenecks detected 🎉</p>}
    </div>
  );
}

function SummaryResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const { project_name, summary, task_breakdown, health_score, recommendations } = data;
  return (
    <div className={s.structured}>
      {project_name && <h3 className={s.projName}>{project_name}</h3>}
      {health_score != null && (
        <div className={s.healthBar}>
          <span className={s.sLabel}>Health Score</span>
          <div className={s.barTrack}>
            <div className={s.barFill} style={{ width: `${health_score}%`, background: health_score > 70 ? '#10b981' : health_score > 40 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <span className={s.barVal}>{health_score}%</span>
        </div>
      )}
      {summary && (
        <div className={s.section}>
          <span className={s.sLabel}>Summary</span>
          <p className={s.sText}>{summary}</p>
        </div>
      )}
      {task_breakdown && (
        <div className={s.statRow}>
          {Object.entries(task_breakdown).map(([k, v]) => (
            <span key={k} className={s.statChip}>{k}: {v}</span>
          ))}
        </div>
      )}
      {recommendations?.length > 0 && (
        <div className={s.section}>
          <span className={s.sLabel}>Recommendations</span>
          <ul className={s.recList}>
            {recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {!summary && !project_name && <pre className={s.result}>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

function ReviewResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const { bugs, performance, readability, suggestions, overall } = data;
  return (
    <div className={s.structured}>
      {overall && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#00d4ff' }}>Overall</span>
          <p className={s.sText}>{overall}</p>
        </div>
      )}
      {bugs && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#ef4444' }}>🐛 Bugs</span>
          <p className={s.sText}>{typeof bugs === 'string' ? bugs : JSON.stringify(bugs)}</p>
        </div>
      )}
      {performance && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#f59e0b' }}>⚡ Performance</span>
          <p className={s.sText}>{typeof performance === 'string' ? performance : JSON.stringify(performance)}</p>
        </div>
      )}
      {readability && (
        <div className={s.section}>
          <span className={s.sLabel} style={{ color: '#10b981' }}>📖 Readability</span>
          <p className={s.sText}>{typeof readability === 'string' ? readability : JSON.stringify(readability)}</p>
        </div>
      )}
      {suggestions?.length > 0 && (
        <div className={s.section}>
          <span className={s.sLabel}>💡 Suggestions</span>
          <ul className={s.recList}>
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {!overall && !bugs && !performance && <pre className={s.result}>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

function PlanResult({ data }) {
  if (typeof data === 'string') return <pre className={s.result}>{data}</pre>;
  const tasks = data.tasks ?? data.subtasks ?? (Array.isArray(data) ? data : []);
  if (tasks.length === 0) return <pre className={s.result}>{JSON.stringify(data, null, 2)}</pre>;
  return (
    <div className={s.structured}>
      <ol className={s.planList}>
        {tasks.map((t, i) => (
          <li key={i} className={s.planItem}>
            <strong>{t.title || t.name || t}</strong>
            {t.description && <p className={s.sText}>{t.description}</p>}
            {t.priority && <span className={s.statChip}>{t.priority}</span>}
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

export default function AIPanel() {
  const { currentProject, current: currentWorkspace } = useWorkspace();
  const { toast } = useUI();
  const [active, setActive] = useState('summary');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLang, setCodeLang] = useState('javascript');
  const [planInput, setPlanInput] = useState('');

  const run = async () => {
    if (!currentProject) {
      toast('Select a project first', 'error'); return;
    }
    setLoading(true);
    setResult(null);
    try {
      let data;
      if (active === 'summary')  ({ data } = await aiApi.summarise(currentWorkspace._id, currentProject._id));
      if (active === 'blockers') ({ data } = await aiApi.blockers(currentWorkspace._id, currentProject._id));
      if (active === 'standup')  ({ data } = await aiApi.standup(currentWorkspace._id, currentProject._id));
      if (active === 'plan')     ({ data } = await aiApi.plan(currentWorkspace._id, currentProject._id, { featureDescription: planInput }));
      if (active === 'review')   ({ data } = await aiApi.review({ code: codeInput, language: codeLang, projectId: currentProject._id }));
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setResult({ _error: msg });
      toast('AI request failed', 'error');
    } finally { setLoading(false); }
  };

  const panel = PANELS.find(p => p.id === active);
  const Renderer = RENDERERS[active] || RawResult;

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
            <Button variant="primary" size="sm" loading={loading} onClick={run}>
              {loading ? 'Thinking…' : 'Run'}
            </Button>
          </div>

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
                {!currentProject && <p style={{ color: '#f59e0b', fontSize: 12 }}>⚠ Select a project first</p>}
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
