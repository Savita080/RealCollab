// pages/workspace/WorkspaceMembers.jsx — Adapted from existing Members.jsx
import { useEffect, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useUI } from '../../store/ui';
import { workspaces as wsApi } from '../../lib/api';
import { Avatar } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import RoleGate from '../../components/common/RoleGate';
import s from '../../styles/modules/Members.module.css';

const ROLES = ['VIEWER', 'MEMBER', 'ADMIN'];
const ROLE_COLORS = { OWNER: '#f59e0b', ADMIN: '#6366f1', MEMBER: '#10b981', VIEWER: '#6b7280' };

export default function WorkspaceMembers() {
  const { workspaceId } = useParams();
  const ctx = useOutletContext();
  const { user } = useAuth();
  const { toast } = useUI();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' });
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const myRole = ctx?.role;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    wsApi.members(workspaceId)
      .then(({ data }) => setMembers(data.members ?? data))
      .catch(() => toast('Failed to load members', 'error'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;
    setInviteLoading(true);
    try {
      const { data } = await wsApi.invite(workspaceId, inviteForm);
      setInviteLink(data.inviteLink || '');
      toast('Invite sent!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to send invite', 'error');
    } finally { setInviteLoading(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { data } = await wsApi.updateRole(workspaceId, userId, { role: newRole });
      setMembers(data.members ?? members.map(m =>
        (m.user?._id || m.user) === userId ? { ...m, role: newRole } : m
      ));
      toast('Role updated ✓', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to update role', 'error');
    }
  };

  const handleRemove = async (userId, name) => {
    if (!confirm(`Remove ${name} from workspace?`)) return;
    try {
      await wsApi.removeMember(workspaceId, userId);
      setMembers(prev => prev.filter(m => (m.user?._id || m.user) !== userId));
      toast('Member removed', 'info');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to remove member', 'error');
    }
  };

  const uid = user?.id || user?._id;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.heading}>Members</h1>
        <RoleGate show={canManage}>
          <Button variant="primary" size="sm" onClick={() => { setInviteModal(true); setInviteLink(''); }}>
            + Invite Member
          </Button>
        </RoleGate>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Loading members…</p>
      ) : (
        <div className={s.list}>
          {members.map(m => {
            const memberId = m.user?._id || m.user;
            const name = m.user?.name || 'Unknown';
            const email = m.user?.email || '';
            const isMe = memberId === uid;
            const isOwner = m.role === 'OWNER';
            return (
              <div key={memberId} className={s.member}>
                <div className={s.memberInfo}>
                  <Avatar name={name} size={36} />
                  <div>
                    <div className={s.memberName}>
                      {name} {isMe && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>(you)</span>}
                    </div>
                    <div className={s.memberEmail}>{email}</div>
                  </div>
                </div>
                <div className={s.memberActions}>
                  <span className={s.roleBadge} style={{ background: ROLE_COLORS[m.role] }}>{m.role}</span>
                  <RoleGate show={canManage && !isMe && !isOwner}>
                    <Select
                      value={m.role}
                      onChange={e => handleRoleChange(memberId, e.target.value)}
                      style={{ width: 110, fontSize: 12 }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <button
                      className={s.removeBtn}
                      onClick={() => handleRemove(memberId, name)}
                      title="Remove member"
                    >✕</button>
                  </RoleGate>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Member" size="sm">
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Email address"
            type="email"
            placeholder="teammate@example.com"
            value={inviteForm.email}
            onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
            autoFocus
          />
          <Select
            label="Role"
            value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
            <option value="VIEWER">Viewer</option>
          </Select>
          <Button type="submit" variant="primary" size="md" disabled={inviteLoading}>
            {inviteLoading ? 'Sending…' : 'Send Invite'}
          </Button>
          {inviteLink && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', wordBreak: 'break-all', marginTop: 8 }}>
              <strong>Invite link (fallback):</strong><br/>{inviteLink}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
