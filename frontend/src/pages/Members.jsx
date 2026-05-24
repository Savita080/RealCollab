// pages/Members.jsx
import { useEffect, useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { workspaces as wsApi } from '../lib/api';
import { Avatar } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import s from './Members.module.css';

const ROLES = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'];
const ROLE_COLORS = { OWNER: '#f59e0b', ADMIN: '#6366f1', MEMBER: '#10b981', VIEWER: '#6b7280' };

export default function Members() {
  const { current: ws } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useUI();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' });
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Determine current user's role in this workspace
  const myRole = members.find(m => m.user?._id === user?.id || m.user?._id === user?._id)?.role;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  useEffect(() => {
    if (!ws) return;
    setLoading(true);
    wsApi.members(ws._id)
      .then(({ data }) => setMembers(data.members ?? data))
      .catch(() => toast('Failed to load members', 'error'))
      .finally(() => setLoading(false));
  }, [ws?._id]);

  const handleRoleChange = async (userId, role) => {
    try {
      const { data } = await wsApi.updateRole(ws._id, userId, { role });
      setMembers(data.members ?? members.map(m => m.user?._id === userId ? { ...m, role } : m));
      toast('Role updated', 'success');
    } catch { toast('Failed to update role', 'error'); }
  };

  const handleRemove = async (userId, name) => {
    if (!confirm(`Remove ${name} from this workspace?`)) return;
    try {
      await wsApi.removeMember(ws._id, userId);
      setMembers(m => m.filter(mem => mem.user?._id !== userId));
      toast(`${name} removed`, 'info');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to remove member', 'error');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteLink('');
    try {
      const { data } = await wsApi.invite(ws._id, inviteForm);
      setInviteLink(data.inviteLink || '');
      toast('Invite generated!', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to generate invite', 'error');
    } finally { setInviteLoading(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast('Link copied!', 'success');
  };

  if (!ws) return <div className={s.empty}>Select a workspace to manage members.</div>;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Members</h1>
          <p className={s.wsName}>{ws.name}</p>
        </div>
        {canManage && (
          <Button variant="cyan" size="sm" onClick={() => { setInviteModal(true); setInviteLink(''); }}>
            + Invite Member
          </Button>
        )}
      </div>

      {/* Member list */}
      <div className={s.list}>
        {loading && [1,2,3].map(i => (
          <div key={i} className={s.skeleton} />
        ))}
        {members.map(m => {
          const uid = m.user?._id;
          const isMe = uid === user?.id || uid === user?._id;
          const isOwner = m.role === 'OWNER';
          return (
            <div key={uid} className={s.memberCard}>
              <Avatar name={m.user?.name || '?'} size={40} />
              <div className={s.memberInfo}>
                <div className={s.nameRow}>
                  <strong className={s.name}>{m.user?.name || 'Unknown'}</strong>
                  {isMe && <span className={s.youBadge}>You</span>}
                </div>
                <span className={s.email}>{m.user?.email || ''}</span>
              </div>
              <div className={s.roleSection}>
                {canManage && !isOwner && !isMe ? (
                  <select
                    className={s.roleSelect}
                    value={m.role}
                    onChange={e => handleRoleChange(uid, e.target.value)}
                    style={{ '--rc': ROLE_COLORS[m.role] || '#6b7280' }}
                  >
                    {ROLES.filter(r => r !== 'OWNER').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className={s.roleBadge} style={{ '--rc': ROLE_COLORS[m.role] || '#6b7280' }}>
                    {m.role}
                  </span>
                )}
              </div>
              {canManage && !isOwner && !isMe && (
                <button className={s.removeBtn} onClick={() => handleRemove(uid, m.user?.name)} title="Remove member">
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Member" size="sm">
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Email address" type="email" placeholder="teammate@company.com"
            value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required />
          <Select label="Role" value={inviteForm.role}
            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
            options={['VIEWER', 'MEMBER', 'ADMIN']} />
          <Button type="submit" variant="cyan" size="md" loading={inviteLoading}>
            Generate Invite Link
          </Button>
        </form>

        {inviteLink && (
          <div className={s.inviteLinkBox}>
            <p className={s.inviteLinkLabel}>Share this link (expires in 24h):</p>
            <div className={s.linkRow}>
              <code className={s.link}>{inviteLink}</code>
              <button className={s.copyBtn} onClick={copyLink}>Copy</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
