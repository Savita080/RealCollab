// pages/workspace/WorkspaceSettings.jsx — Owner/Admin only
import { useEffect, useState } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { workspaces as wsApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import s from '../../styles/modules/WorkspaceSettings.module.css';

export default function WorkspaceSettings() {
  const { workspaceId } = useParams();
  const ctx = useOutletContext();
  const { toast } = useUI();
  const navigate = useNavigate();
  const role = ctx?.role;

  const [wsName, setWsName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isOwner = role === 'OWNER';

  // Redirect non-admin/owner away
  useEffect(() => {
    if (role && role !== 'OWNER' && role !== 'ADMIN') {
      navigate(`/workspaces/${workspaceId}`, { replace: true });
    }
  }, [role]);

  // Load workspace name
  useEffect(() => {
    wsApi.get(workspaceId)
      .then(({ data }) => setWsName((data.workspace ?? data).name || ''))
      .catch(() => {});
  }, [workspaceId]);

  const handleRename = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setRenameLoading(true);
    try {
      await wsApi.update(workspaceId, { name: wsName.trim() });
      toast('Workspace renamed ✓', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to rename', 'error');
    } finally { setRenameLoading(false); }
  };

  const handleTransfer = async () => {
    if (!transferTarget) return;
    setTransferLoading(true);
    try {
      await wsApi.transferOwnership(workspaceId, { newOwnerId: transferTarget });
      toast('Ownership transferred ✓', 'success');
      // Reload page to reflect new role
      window.location.reload();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to transfer', 'error');
    } finally { setTransferLoading(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== wsName) {
      toast('Type the workspace name exactly to confirm', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      await wsApi.delete(workspaceId);
      toast('Workspace deleted', 'info');
      navigate('/workspaces');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to delete', 'error');
    } finally { setDeleteLoading(false); }
  };

  // Get non-owner members for transfer dropdown
  const otherMembers = (ctx?.members || []).filter(m => m.role !== 'OWNER');

  return (
    <div className={s.page}>
      <h1 className={s.heading}>Workspace Settings</h1>

      {/* Rename */}
      <div className={s.section}>
        <div className={s.sectionTitle}>Workspace Name</div>
        <form onSubmit={handleRename}>
          <div className={s.row}>
            <Input value={wsName} onChange={e => setWsName(e.target.value)} placeholder="Workspace name" />
            <Button type="submit" variant="primary" size="sm" disabled={renameLoading}>
              {renameLoading ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </div>

      {/* Transfer Ownership — OWNER only */}
      {isOwner && (
        <div className={s.section}>
          <div className={s.sectionTitle}>Transfer Ownership</div>
          <p className={s.dangerText}>Transfer ownership to another member. You will become an Admin.</p>
          <div className={s.row}>
            <Select value={transferTarget} onChange={e => setTransferTarget(e.target.value)}>
              <option value="">Select new owner…</option>
              {otherMembers.map(m => (
                <option key={m.user?._id || m.user} value={m.user?._id || m.user}>
                  {m.user?.name || 'Unknown'} ({m.role})
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={handleTransfer} disabled={!transferTarget || transferLoading}>
              {transferLoading ? 'Transferring…' : 'Transfer'}
            </Button>
          </div>
          <p className={s.warning}>⚠️ This action is irreversible.</p>
        </div>
      )}

      {/* Delete — OWNER only */}
      {isOwner && (
        <div className={`${s.section} ${s.dangerSection}`}>
          <div className={`${s.sectionTitle} ${s.dangerTitle}`}>Delete Workspace</div>
          <p className={s.dangerText}>
            Type <strong>"{wsName}"</strong> to confirm. This permanently deletes the workspace and all its data.
          </p>
          <div className={s.row}>
            <Input
              placeholder={`Type "${wsName}" to confirm`}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteLoading || deleteConfirm !== wsName}>
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
