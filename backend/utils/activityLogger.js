import ActivityLog from '../models/activityLog.js';
import { SCOPE } from './activityActions.js';

/**
 * Persist an activity entry. Failures are logged only — never throw to callers.
 */
export async function logActivity({
  workspace,
  project = null,
  scope,
  user,
  action,
  objectType = null,
  targetId = null,
  targetName = null,
  metadata = {},
}) {
  try {
    if (!workspace || !user || !action || !scope) return;

    await ActivityLog.create({
      workspace,
      project: project || undefined,
      scope,
      user,
      action,
      objectType: objectType || undefined,
      targetId: targetId || undefined,
      targetName: targetName || undefined,
      metadata: metadata && Object.keys(metadata).length ? metadata : undefined,
    });
  } catch (error) {
    console.error('[activity]', error.message);
  }
}

export function logWorkspaceActivity(payload) {
  return logActivity({ ...payload, scope: SCOPE.WORKSPACE });
}

export function logProjectActivity(payload) {
  return logActivity({ ...payload, scope: SCOPE.PROJECT });
}
