// lib/useWorkspaceRole.js — current user's role in the active workspace
import { useState, useEffect } from 'react';
import { workspaces as wsApi } from './api';
import { useAuth } from '../store/auth';

const ROLE_LEVELS = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export function useWorkspaceRole(workspaceId) {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !user) { setLoading(false); return; }
    setLoading(true);
    wsApi.members(workspaceId)
      .then(({ data }) => {
        const list = data.members ?? data;
        setMembers(list);
        const uid = user.id || user._id;
        const me = list.find(m => (m.user?._id || m.user) === uid);
        setRole(me?.role || null);
      })
      .catch(() => { setRole(null); setMembers([]); })
      .finally(() => setLoading(false));
  }, [workspaceId, user?.id, user?._id]);

  const roleLevel = ROLE_LEVELS[role] ?? -1;

  return {
    role,
    roleLevel,
    members,
    loading,
    isOwner:   role === 'OWNER',
    isAdmin:   role === 'ADMIN' || role === 'OWNER',
    isMember:  roleLevel >= 1,
    isViewer:  roleLevel >= 0,
    canManage: roleLevel >= 2,
    canCreate: roleLevel >= 1,
  };
}

export { ROLE_LEVELS };
