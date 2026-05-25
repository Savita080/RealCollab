// pages/workspace/project/ProjectOverview.jsx
import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { tasks as tasksApi, activity as actApi } from '../../../lib/api';
import { Avatar } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { fmtRelative } from '../../../lib/utils';
import s from '../../../styles/modules/ProjectOverview.module.css';

const STATUS_MAP = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' };
const STATUS_COLORS = { 'To Do': '#6366f1', 'In Progress': '#f59e0b', 'In Review': '#00d4ff', 'Done': '#10b981' };

export default function ProjectOverview() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, project } = ctx;
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    tasksApi.list(workspaceId, projectId)
      .then(({ data }) => setTasks(data.tasks ?? data))
      .catch(() => {});
    actApi.list(workspaceId, projectId)
      .then(({ data }) => setActivities((data.activities ?? data).slice(0, 5)))
      .catch(() => {});
  }, [workspaceId, projectId]);

  // Count tasks by status
  const counts = tasks.reduce((acc, t) => {
    const display = STATUS_MAP[t.status] || t.status;
    acc[display] = (acc[display] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={s.page}>
      <h1 className={s.heading}>{project?.name || 'Project'}</h1>
      {project?.description && <p className={s.desc}>{project.description}</p>}

      <div className={s.stats}>
        <div className={s.statCard}>
          <div className={s.statValue} style={{ color: 'var(--text-1)' }}>{tasks.length}</div>
          <div className={s.statLabel}>Total Tasks</div>
        </div>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className={s.statCard}>
            <div className={s.statValue} style={{ color }}>{counts[status] || 0}</div>
            <div className={s.statLabel}>{status}</div>
          </div>
        ))}
        <div className={s.statCard}>
          <div className={s.statValue} style={{ color: 'var(--green)' }}>{ctx?.projectMembers?.length ?? 0}</div>
          <div className={s.statLabel}>Members</div>
        </div>
      </div>

      {/* Quick AI actions */}
      <div className={s.section}>
        <div className={s.sectionTitle}>AI Insights</div>
        <div className={s.aiActions}>
          <Button variant="outline" size="sm" onClick={() => navigate('assistant')}>🤖 Summarise Project</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('assistant')}>⚠️ What's Blocking Us?</Button>
        </div>
      </div>

      {/* Recent activity */}
      <div className={s.section}>
        <div className={s.sectionTitle}>Recent Activity</div>
        {activities.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No activity yet.</p>
        ) : (
          activities.map((a, i) => (
            <div key={a._id ?? i} className={s.activityItem}>
              <Avatar name={a.user?.name} size={24} />
              <span><strong>{a.user?.name}</strong> {a.action?.replace(/_/g, ' ').toLowerCase()} — {a.targetName}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 12 }}>{fmtRelative(a.createdAt)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
