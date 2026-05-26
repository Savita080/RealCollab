// components/activity/ActivityFeedPanel.jsx — shared workspace/project activity feed with filters
import { useCallback, useEffect, useMemo, useState } from 'react';
import { activity as activityApi, workspaces as wsApi } from '../../lib/api';
import { fmtRelative } from '../../lib/utils';
import { Avatar } from '../ui/Badge';
import { Select } from '../ui/Input';
import s from '../../styles/modules/ActivityFeed.module.css';

const TIME_OPTIONS = [
  { value: '', label: 'All time' },
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '12h', label: 'Last 12 hours' },
  { value: '1d', label: 'Last day' },
  { value: '1w', label: 'Last week' },
];

const OBJECT_OPTIONS = [
  { value: '', label: 'All objects' },
  { value: 'KANBAN', label: 'Kanban / Tasks' },
  { value: 'SNIPPET', label: 'Snippets' },
  { value: 'WIKI', label: 'Wiki pages' },
  { value: 'WHITEBOARD', label: 'Whiteboards' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'MEMBER', label: 'Members' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'AI', label: 'AI services' },
];

const WS_LABELS = {
  WORKSPACE_CREATED: (a) => `${meta(a).ownerName || a.user?.name || 'Someone'} created workspace "${a.targetName}"`,
  MEMBER_JOINED: (a) => `${a.targetName} joined as ${meta(a).role || 'member'}`,
  MEMBER_ROLE_CHANGED: (a) => `${a.user?.name} changed ${a.targetName}'s role from ${meta(a).previousRole} to ${meta(a).newRole}`,
  MEMBER_REMOVED: (a) => `${a.user?.name} removed ${a.targetName} from the workspace`,
  MEMBER_LEFT: (a) => `${a.targetName} left the workspace`,
  OWNERSHIP_TRANSFERRED: (a) => `${a.user?.name} transferred ownership to ${meta(a).newOwnerName || 'another member'}`,
  PROJECT_CREATED: (a) => `${a.user?.name} created project "${a.targetName}"`,
  PROJECT_DELETED: (a) => `${a.user?.name} deleted project "${a.targetName}"`,
  PROJECT_RENAMED: (a) => `${a.user?.name} renamed project from "${meta(a).previousName}" to "${meta(a).newName}"`,
  PROJECT_DESCRIPTION_UPDATED: (a) => `${a.user?.name} updated description of "${a.targetName}"`,
  PROJECT_MEMBER_JOINED: (a) => `${a.targetName} joined project "${meta(a).projectName || a.project?.name}" as ${meta(a).role}`,
  PROJECT_MEMBER_LEFT: (a) => `${a.targetName} left project "${meta(a).projectName || a.project?.name}"`,
};

const PROJ_LABELS = {
  PROJECT_CREATED: (a) => `${a.user?.name} created this project`,
  MEMBER_ADDED: (a) => `${a.user?.name} added ${a.targetName} as ${meta(a).role}`,
  MEMBER_ROLE_CHANGED: (a) => `${a.user?.name} changed ${a.targetName}'s role from ${meta(a).previousRole} to ${meta(a).newRole}`,
  MEMBER_REMOVED: (a) => `${a.user?.name} removed ${a.targetName} from the project`,
  MEMBER_EXITED: (a) => `${a.targetName} left the project`,
  TASK_CREATED: (a) => `${a.user?.name} created task "${a.targetName}"`,
  TASK_UPDATED: (a) => `${a.user?.name} modified task "${a.targetName}"`,
  TASK_DELETED: (a) => `${a.user?.name} deleted task "${a.targetName}"`,
  SNIPPET_CREATED: (a) => `${a.user?.name} added snippet "${a.targetName}"`,
  SNIPPET_DELETED: (a) => `${a.user?.name} deleted snippet "${a.targetName}"`,
  SNIPPET_METADATA_UPDATED: (a) => `${a.user?.name} updated snippet metadata for "${a.targetName}"`,
  SNIPPET_UPDATED: (a) => `${a.user?.name} updated snippet "${a.targetName}"`,
  WIKI_CREATED: (a) => `${a.user?.name} created wiki page "${a.targetName}"`,
  WIKI_DELETED: (a) => `${a.user?.name} deleted wiki page "${a.targetName}"`,
  WIKI_METADATA_UPDATED: (a) => `${a.user?.name} updated wiki metadata for "${a.targetName}"`,
  WIKI_UPDATED: (a) => `${a.user?.name} updated wiki page "${a.targetName}"`,
  WHITEBOARD_CREATED: (a) => `${a.user?.name} created whiteboard "${a.targetName}"`,
  WHITEBOARD_DELETED: (a) => `${a.user?.name} deleted whiteboard "${a.targetName}"`,
  WHITEBOARD_RENAMED: (a) => `${a.user?.name} renamed whiteboard from "${meta(a).previousName}" to "${meta(a).newName}"`,
  AI_CODE_REVIEWER: (a) => `${a.user?.name} used AI Code Reviewer`,
  AI_STANDUP: (a) => `${a.user?.name} used AI Standup Report`,
  AI_SUMMARIZE: (a) => `${a.user?.name} used AI Project Summary`,
  AI_GENERATE_TASKS: (a) => `${a.user?.name} used AI Task Generator`,
  AI_BOTTLENECK: (a) => `${a.user?.name} used AI Bottleneck Analysis`,
};

const meta = (a) => a.metadata || {};

function formatActivity(a, scope) {
  const labels = scope === 'workspace' ? WS_LABELS : PROJ_LABELS;
  const fn = labels[a.action];
  if (fn) return fn(a);
  return `${a.user?.name || 'Someone'} ${a.action?.replace(/_/g, ' ').toLowerCase()}${a.targetName ? ` — ${a.targetName}` : ''}`;
}

export default function ActivityFeedPanel({
  workspaceId,
  projectId = null,
  title = 'Activity Feed',
  subtitle = null,
}) {
  const scope = projectId ? 'project' : 'workspace';

  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState('');
  const [objectType, setObjectType] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [targetNameInput, setTargetNameInput] = useState('');
  const [targetName, setTargetName] = useState('');
  const [affectedUserId, setAffectedUserId] = useState('');
  const [aiOnly, setAiOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTargetName(targetNameInput), 400);
    return () => clearTimeout(t);
  }, [targetNameInput]);

  useEffect(() => {
    if (!workspaceId) return;
    wsApi.members(workspaceId)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, [workspaceId]);

  useEffect(() => {
    // #region agent log (debug)
    fetch('http://127.0.0.1:7942/ingest/a4a06877-767b-4074-b736-7d5787786897', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2ee502' },
      body: JSON.stringify({
        sessionId: '2ee502',
        runId: 'pre-fix',
        hypothesisId: 'B',
        location: 'frontend/src/components/activity/ActivityFeedPanel.jsx:membersEffect',
        message: 'Activity feed inputs / members state',
        data: {
          workspaceId: workspaceId || null,
          projectId: projectId || null,
          scope,
          membersLen: Array.isArray(members) ? members.length : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [workspaceId, projectId, scope, members]);

  const queryParams = useMemo(() => {
    const p = {};
    if (userId) p.userId = userId;
    if (objectType) p.objectType = objectType;
    if (timeRange) p.timeRange = timeRange;
    if (targetName.trim()) p.targetName = targetName.trim();
    if (affectedUserId) p.affectedUserId = affectedUserId;
    if (aiOnly) p.aiOnly = 'true';
    return p;
  }, [userId, objectType, timeRange, targetName, affectedUserId, aiOnly]);

  const loadFeed = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    const req = projectId
      ? activityApi.listProject(workspaceId, projectId, queryParams)
      : activityApi.listWorkspace(workspaceId, queryParams);

    req
      .then(({ data }) => setActivities(data.activities ?? []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, queryParams]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const objectOptions = scope === 'workspace'
    ? OBJECT_OPTIONS.filter(o => !['KANBAN', 'SNIPPET', 'WIKI', 'WHITEBOARD'].includes(o.value) || o.value === '')
    : OBJECT_OPTIONS.filter(o => !['WORKSPACE'].includes(o.value) || o.value === '');

  const clearFilters = () => {
    setUserId('');
    setObjectType('');
    setTimeRange('');
    setTargetNameInput('');
    setTargetName('');
    setAffectedUserId('');
    setAiOnly(false);
  };

  const hasFilters = userId || objectType || timeRange || targetNameInput || affectedUserId || aiOnly;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{title}</h1>
          {subtitle && <span className={s.projectBadge}>{subtitle}</span>}
        </div>
      </div>

      <div className={s.filterBar}>
        <Select label="Member" value={userId} onChange={e => setUserId(e.target.value)}>
          <option value="">Anyone</option>
          {members.map(m => {
            const id = m.user?._id || m.user;
            return (
              <option key={id} value={id}>{m.user?.name || 'Member'}</option>
            );
          })}
        </Select>

        <Select label="Object" value={objectType} onChange={e => { setObjectType(e.target.value); setAiOnly(false); }}>
          {objectOptions.map(o => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </Select>

        <Select label="Time" value={timeRange} onChange={e => setTimeRange(e.target.value)}>
          {TIME_OPTIONS.map(o => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </Select>

        <label className={s.filterField}>
          <span className={s.filterLabel}>Object name</span>
          <input
            className={s.filterInput}
            type="text"
            placeholder="e.g. snippet or task name"
            value={targetNameInput}
            onChange={e => setTargetNameInput(e.target.value)}
          />
        </label>

        <Select label="Affected member" value={affectedUserId} onChange={e => setAffectedUserId(e.target.value)}>
          <option value="">Anyone</option>
          {members.map(m => {
            const id = m.user?._id || m.user;
            return (
              <option key={`aff-${id}`} value={id}>{m.user?.name || 'Member'}</option>
            );
          })}
        </Select>

        <button
          type="button"
          className={`${s.filter} ${aiOnly ? s.active : ''}`}
          onClick={() => { setAiOnly(v => !v); if (!aiOnly) setObjectType(''); }}
        >
          AI usage only
        </button>

        {hasFilters && (
          <button type="button" className={s.filter} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className={s.feed}>
        {loading && <p className={s.empty}>Loading activity…</p>}
        {!loading && activities.length === 0 && (
          <p className={s.empty}>No activity matches these filters.</p>
        )}
        {!loading && activities.map((item, i) => (
          <div key={item._id || i} className={s.item}>
            <div className={s.iconWrap}>
              <span className={s.icon}>{item.objectType === 'AI' ? '✦' : '◈'}</span>
            </div>
            <div className={s.content}>
              <p className={s.msg}>{formatActivity(item, scope)}</p>
              <span className={s.time}>{fmtRelative(item.createdAt)}</span>
            </div>
            <Avatar name={item.user?.name || '?'} size={28} />
          </div>
        ))}
      </div>
    </div>
  );
}
