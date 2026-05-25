// pages/ActivityFeed.jsx
import { useEffect, useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { activity as activityApi } from '../lib/api';
import { fmtRelative } from '../lib/utils';
import { Avatar } from '../components/ui/Badge';
import s from '../styles/modules/ActivityFeed.module.css';

const ACTION_ICONS = {
  CREATED_TASK: '✦', COMPLETED_TASK: '✓', MOVED_TASK: '→', UPDATED_TASK: '✎',
  CREATED_SNIPPET: '</>', CREATED_WIKI: '□', UPDATED_WIKI: '□',
  JOINED_PROJECT: '●', SENT_MESSAGE: '◎', default: '◈'
};

const ACTION_LABELS = {
  CREATED_TASK: 'created task', COMPLETED_TASK: 'completed task', MOVED_TASK: 'moved task',
  UPDATED_TASK: 'updated task', CREATED_SNIPPET: 'added snippet', CREATED_WIKI: 'created wiki page',
  UPDATED_WIKI: 'updated wiki', JOINED_PROJECT: 'joined project', SENT_MESSAGE: 'sent a message',
};

export default function ActivityFeed() {
  const { current: ws, currentProject } = useWorkspace();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ws || !currentProject) return;
    setLoading(true);
    activityApi.list(ws._id, currentProject._id)
      .then(({ data }) => setFeed(data.activities ?? data))
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, [ws?._id, currentProject?._id]);

  if (!currentProject) {
    return (
      <div className={s.page}>
        <div className={s.header}><h1 className={s.title}>Activity Feed</h1></div>
        <p className={s.empty}>Select a project to view its activity.</p>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Activity Feed</h1>
        <span className={s.projectBadge}>{currentProject.name}</span>
      </div>

      <div className={s.feed}>
        {loading && <p className={s.empty}>Loading…</p>}
        {!loading && feed.length === 0 && <p className={s.empty}>No activity yet. Start building!</p>}
        {feed.map((item, i) => (
          <div key={item._id || i} className={s.item}>
            <div className={s.iconWrap}>
              <span className={s.icon}>{ACTION_ICONS[item.action] || ACTION_ICONS.default}</span>
            </div>
            <div className={s.content}>
              <p className={s.msg}>
                <strong className={s.actor}>{item.user?.name || 'Someone'}</strong>
                {' '}
                {ACTION_LABELS[item.action] || item.action?.toLowerCase().replace(/_/g, ' ')}
                {item.targetName && <span className={s.target}> "{item.targetName}"</span>}
              </p>
              <span className={s.time}>{fmtRelative(item.createdAt)}</span>
            </div>
            <Avatar name={item.user?.name || '?'} size={28} />
          </div>
        ))}
      </div>
    </div>
  );
}
