// pages/workspace/project/ProjectMembers.jsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { projects as projApi, workspaces as wsApi } from '../../../lib/api';
import { useUI } from '../../../store/ui';
import { useAuth } from '../../../store/auth';
import { Avatar } from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Input';
import RoleGate from '../../../components/common/RoleGate';
import s from '../../../styles/modules/Members.module.css';

const ROLE_COLORS = { CONTRIBUTOR: 'var(--indigo)', VIEWER: 'var(--text-3)' };

export default function ProjectMembers() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, canEdit } = ctx;
  const { user } = useAuth();
  const { toast } = useUI();

  const [members, setMembers] = useState([]);
  const [wsMembers, setWsMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [addUser, setAddUser] = useState('');
  const [addRole, setAddRole] = useState('CONTRIBUTOR');

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setLoading(true);
    projApi.members(workspaceId, projectId)
      .then(({ data }) => setMembers(data.members ?? data))
      .catch(() => toast('Failed to load members', 'error'))
      .finally(() => setLoading(false));

    wsApi.members(workspaceId)
      .then(({ data }) => setWsMembers(data.members ?? []))
      .catch(() => {});
  }, [workspaceId, projectId]);

  const handleAdd = async () => {
    if (!addUser) return;
    try {
      const { data } = await projApi.addMember(workspaceId, projectId, { userId: addUser, role: addRole });
      setMembers(data.members ?? [...members, { user: wsMembers.find(m => (m.user?._id || m.user) === addUser)?.user, role: addRole }]);
      setAddModal(false); setAddUser('');
      toast('Member added!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    }
  };

  const handleRemove = async (userId, name) => {
    if (!confirm(`Remove ${name} from project?`)) return;
    try {
      await projApi.removeMember(workspaceId, projectId, userId);
      setMembers(prev => prev.filter(m => (m.user?._id || m.user) !== userId));
      toast('Member removed', 'info');
    } catch (err) { toast(err?.response?.data?.message || 'Failed', 'error'); }
  };

  // Filter workspace members who aren't already project members
  const projectMemberIds = new Set(members.map(m => m.user?._id || m.user));
  const availableMembers = wsMembers.filter(m => !projectMemberIds.has(m.user?._id || m.user));
  const uid = user?.id || user?._id;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.heading}>Project Members</h1>
        <RoleGate show={canEdit}>
          <Button variant="primary" size="sm" onClick={() => setAddModal(true)}>+ Add Member</Button>
        </RoleGate>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Loading members…</p>
      ) : (
        <div className={s.list}>
          {members.map(m => {
            const memberId = m.user?._id || m.user;
            const name = m.user?.name || 'Unknown';
            return (
              <div key={memberId} className={s.member}>
                <div className={s.memberInfo}>
                  <Avatar name={name} src={m.user?.avatar} size={36} />
                  <div>
                    <div className={s.memberName}>
                      {name} {memberId === uid && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>(you)</span>}
                    </div>
                    <div className={s.memberEmail}>{m.user?.email || ''}</div>
                  </div>
                </div>
                <div className={s.memberActions}>
                  <span className={s.roleBadge} style={{ background: ROLE_COLORS[m.role] || 'var(--text-3)' }}>
                    {m.role}
                  </span>
                  <RoleGate show={canEdit && memberId !== uid}>
                    <button className={s.removeBtn} onClick={() => handleRemove(memberId, name)} title="Remove">✕</button>
                  </RoleGate>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add member modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Project Member" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select label="Select workspace member" value={addUser} onChange={e => setAddUser(e.target.value)}>
            <option value="">Choose a member…</option>
            {availableMembers.map(m => (
              <option key={m.user?._id || m.user} value={m.user?._id || m.user}>
                {m.user?.name || 'Unknown'}
              </option>
            ))}
          </Select>
          <Select label="Role" value={addRole} onChange={e => setAddRole(e.target.value)}>
            <option value="CONTRIBUTOR">Contributor</option>
            <option value="VIEWER">Viewer</option>
          </Select>
          <Button variant="primary" size="md" onClick={handleAdd} disabled={!addUser}>Add Member</Button>
        </div>
      </Modal>
    </div>
  );
}
