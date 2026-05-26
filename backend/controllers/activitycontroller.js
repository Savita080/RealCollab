import ActivityLog from '../models/activityLog.js';
import { SCOPE, TIME_RANGES, KANBAN_ACTIONS, AI_ACTIONS } from '../utils/activityActions.js';

const POPULATE_FIELDS = [
  { path: 'user', select: 'name avatar email' },
  { path: 'project', select: 'name' },
];

function buildFilterQuery(baseQuery, queryParams) {
  const {
    userId,
    objectType,
    timeRange,
    targetName,
    targetId,
    affectedUserId,
    aiOnly,
    action,
  } = queryParams;

  const filter = { ...baseQuery };

  if (userId) filter.user = userId;
  if (targetId) filter.targetId = targetId;
  if (action) filter.action = action;

  if (timeRange && TIME_RANGES[timeRange]) {
    filter.createdAt = { $gte: new Date(Date.now() - TIME_RANGES[timeRange]) };
  }

  if (targetName && targetName.trim()) {
    filter.targetName = { $regex: targetName.trim(), $options: 'i' };
  }

  if (affectedUserId) {
    filter['metadata.affectedUserId'] = affectedUserId;
  }

  if (aiOnly === 'true' || aiOnly === true) {
    filter.objectType = 'AI';
  } else if (objectType) {
    const type = objectType.toUpperCase();
    if (type === 'KANBAN') {
      filter.action = { $in: [...KANBAN_ACTIONS] };
    } else {
      filter.objectType = type;
    }
  }

  return filter;
}

async function fetchActivities(filter, limit = 100) {
  return ActivityLog.find(filter)
    .populate(POPULATE_FIELDS)
    .sort('-createdAt')
    .limit(Math.min(Number(limit) || 100, 200))
    .lean();
}

export const getWorkspaceActivity = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const filter = buildFilterQuery(
      { workspace: workspaceId, scope: SCOPE.WORKSPACE },
      req.query,
    );

    const activities = await fetchActivities(filter, req.query.limit);
    res.status(200).json({ activities });
  } catch (error) {
    console.error('Error fetching workspace activity:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getProjectActivity = async (req, res) => {
  try {
    const { workspaceId, projectId } = req.params;
    const filter = buildFilterQuery(
      { workspace: workspaceId, project: projectId, scope: SCOPE.PROJECT },
      req.query,
    );

    const activities = await fetchActivities(filter, req.query.limit);
    res.status(200).json({ activities });
  } catch (error) {
    console.error('Error fetching project activity:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export { logActivity, logWorkspaceActivity, logProjectActivity } from '../utils/activityLogger.js';
