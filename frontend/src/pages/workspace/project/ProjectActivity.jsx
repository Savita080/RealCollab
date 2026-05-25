// pages/workspace/project/ProjectActivity.jsx — adapted from ActivityFeed.jsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { activity as actApi } from '../../../lib/api';
import { Avatar } from '../../../components/ui/Badge';
import { fmtRelative } from '../../../lib/utils';
import s from '../../../styles/modules/ActivityFeed.module.css';

export default function ProjectActivity() {
  const ctx = useOutletContext();
  const { workspaceId, projectId } = ctx;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    actApi.list(workspaceId, projectId)
      .then(({ data }) => setActivities(data.activities ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, projectId]);

  return (
    <div className={s.page}>
      <h1 className={s.title}>Activity Feed</h1>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Loading activity…</p>
      ) : activities.length === 0 ? (
        <p style={{ color: 'var(--text-3)' }}>No activity recorded yet.</p>
      ) : (
        <div className={s.list}>
          {activities.map((a, i) => (
            <div key={a._id ?? i} className={s.item}>
              <Avatar name={a.user?.name} size={28} />
              <div className={s.itemContent}>
                <div className={s.itemText}>
                  <strong>{a.user?.name || 'Unknown'}</strong>{' '}
                  {a.action?.replace(/_/g, ' ').toLowerCase()}
                  {a.targetName && <> — <em>{a.targetName}</em></>}
                </div>
                <div className={s.itemTime}>{fmtRelative(a.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
