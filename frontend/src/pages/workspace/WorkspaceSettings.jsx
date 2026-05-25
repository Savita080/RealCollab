// pages/workspace/WorkspaceSettings.jsx — workspace-level settings (rename + delete)
import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { workspaces as wsApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import s from '../../styles/modules/WorkspaceSettings.module.css';

export default function WorkspaceSettings() {
  const { workspaceId, workspace, role, isOwner } = useOutletContext();
  const { toast } = useUI();
  const { fetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setName(workspace?.name || '');
  }, [workspace?.name]);

  const isAdmin = role === 'OWNER' || role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className={s.page}>
        <div className={s.empty}>
          <AlertTriangle size={28} />
          <h3>Admins only</h3>
          <p>Only workspace OWNERs and ADMINs can manage settings.</p>
        </div>
      </div>
    );
  }

  const handleRename = async (e) => {
    e.preventDefault();
    if (!name.trim() || name === workspace?.name) return;
    setRenameLoading(true);
    try {
      await wsApi.update(workspaceId, { name: name.trim() });
      await fetchWorkspaces();
      toast('Workspace renamed', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    } finally { setRenameLoading(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== workspace?.name) {
      toast('Type the workspace name exactly to confirm.', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      await wsApi.delete(workspaceId);
      toast('Workspace deleted', 'info');
      await fetchWorkspaces();
      navigate('/workspaces', { replace: true });
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to delete', 'error');
      setDeleteLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Workspace Settings</h1>
        <p className={s.subtitle}>Configure {workspace?.name || 'this workspace'}</p>
      </div>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <Edit3 size={16} />
          <h3>Rename Workspace</h3>
        </div>
        <p className={s.desc}>Change the display name shown across the app.</p>
        <form onSubmit={handleRename} className={s.row}>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={workspace?.name}
            required
          />
          <Button type="submit" variant="primary" size="md" loading={renameLoading} disabled={!name.trim() || name === workspace?.name}>
            Save
          </Button>
        </form>
      </section>

      {isOwner && (
        <section className={`${s.section} ${s.danger}`}>
          <div className={s.sectionHead}>
            <Trash2 size={16} />
            <h3>Delete Workspace</h3>
          </div>
          <p className={s.desc}>
            This permanently deletes <strong>{workspace?.name}</strong> and all its projects, tasks, wiki pages, and snippets. This cannot be undone.
          </p>
          <div className={s.row}>
            <Input
              placeholder={`Type "${workspace?.name}" to confirm`}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <Button
              variant="danger"
              size="md"
              loading={deleteLoading}
              disabled={deleteConfirm !== workspace?.name}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
