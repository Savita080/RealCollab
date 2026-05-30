import React from 'react';
import s from '../../styles/modules/AIPanel.module.css';

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

export function StandupResult({ data }) {
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

export function BlockersResult({ data }) {
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

export function SummaryResult({ data }) {
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

export function ReviewResult({ data }) {
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

export function PlanResult({ data }) {
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

export function RawResult({ data }) {
  return <pre className={s.result}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>;
}
