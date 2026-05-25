// lib/useProjectRole.js — project role with Super Admin Bypass
import { useState, useEffect } from 'react';
import { projects as projApi } from './api';
import { useAuth } from '../store/auth';

export function useProjectRole(workspaceId, projectId, workspaceRole) {
  const { user } = useAuth();
  const [projectRole, setProjectRole] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!workspaceId || !projectId || !user) { setLoading(false); return; }
    const wsLevel = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

    setLoading(true);
    projApi.members(workspaceId, projectId)
      .then(({ data }) => {
        const list = data.members ?? data;
        setProjectMembers(list);
        const uid = user.id || user._id;
        const me = list.find(m => (m.user?._id || m.user) === uid);
        const role = me?.role || null;
        setProjectRole(role);
        setHasAccess(!!(role || wsLevel));
      })
      .catch(() => {
        setProjectRole(null);
        setProjectMembers([]);
        setHasAccess(wsLevel);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, projectId, user?.id, user?._id, workspaceRole]);

  const isContributor   = projectRole === 'CONTRIBUTOR' || workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const isProjectViewer = projectRole === 'VIEWER' && workspaceRole !== 'OWNER' && workspaceRole !== 'ADMIN';

  return {
    projectRole,
    projectMembers,
    loading,
    hasAccess,
    isContributor,
    isProjectViewer,
    canEdit: isContributor,
  };
}
