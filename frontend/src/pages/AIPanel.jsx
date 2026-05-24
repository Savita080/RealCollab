// pages/AIPanel.jsx
import { useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { ai as aiApi } from '../lib/api';
import { useUI } from '../store/ui';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import s from './AIPanel.module.css';

const PANELS = [
  { id: 'summary',  label: 'Progress Summary', icon: '◎', desc: 'AI reads all task statuses and gives a project health report.' },
  { id: 'blockers', label: 'Blockers',          icon: '⚠', desc: 'Identifies tasks stuck "In Progress" for too long.' },
  { id: 'standup',  label: 'Standup Report',    icon: '✦', desc: 'Generates a daily standup based on last 24h task movement.' },
  { id: 'plan',     label: 'Step-wise Plan',    icon: '▦', desc: 'Breaks a feature description into 6 subtasks automatically.' },
  { id: 'review',   label: 'Code Reviewer',     icon: '</>', desc: 'Paste code and get bug, performance, readability feedback.' },
];

export default function AIPanel() {
  const { currentProject, current: currentWorkspace } = useWorkspace();
  const { toast } = useUI();
  const [active, setActive] = useState('summary');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [planInput, setPlanInput] = useState('');

  const run = async () => {
    if (!currentProject) {
      toast('Select a project first', 'error'); return;
    }
    setLoading(true);
    setResult('');
    try {
      let data;
      if (active === 'summary')  ({ data } = await aiApi.summarise(currentWorkspace._id, currentProject._id));
      if (active === 'blockers') ({ data } = await aiApi.blockers(currentWorkspace._id, currentProject._id));
      if (active === 'standup')  ({ data } = await aiApi.standup(currentWorkspace._id, currentProject._id));
      if (active === 'plan')     ({ data } = await aiApi.plan(currentWorkspace._id, currentProject._id, { description: planInput }));
      if (active === 'review')   ({ data } = await aiApi.review({ code: codeInput, language: 'JavaScript', projectId: currentProject._id }));
      setResult(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch (err) {
      setResult('Error: ' + (err.response?.data?.message || err.message));
      toast('AI request failed', 'error');
    } finally { setLoading(false); }
  };

  const panel = PANELS.find(p => p.id === active);

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.mascotBadge}>
          <span className={s.octoIcon}>🐙</span>
          <div>
            <strong>Octo AI Panel</strong>
            <span>Powered by Suhani's FastAPI service</span>
          </div>
          <span className={s.onlineDot} title="Service online" />
        </div>
      </div>

      <div className={s.body}>
        {/* Panel selector */}
        <aside className={s.panels}>
          {PANELS.map(p => (
            <button
              key={p.id}
              className={`${s.panelBtn} ${active === p.id ? s.activePanel : ''}`}
              onClick={() => { setActive(p.id); setResult(''); }}
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
                placeholder="User types: Build a login system + AI creates 6 subtasks"
                value={planInput}
                onChange={e => setPlanInput(e.target.value)}
              />
            </div>
          )}
          {active === 'review' && (
            <div className={s.extraInput}>
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
                <p>Click "Run" to get {panel?.label.toLowerCase()}.</p>
              </div>
            )}
            {loading && (
              <div className={s.thinking}>
                <span className={s.dots}>●●●</span>
                <span>Octo is thinking…</span>
              </div>
            )}
            {result && <pre className={s.result}>{result}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}
